import { useEffect, useState, type FormEvent } from 'react';
import Button from '@atlaskit/button/new';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import {
  activateOnboardingAccount,
  activationDecision,
  completeJourneyStep,
  createOnboarding,
  fundOnboardingAccount,
  fundingDecision,
  resumePausedOnboarding,
  submitIdentityCheck,
} from '../domain/identity/adapter';
import { createSimulatedIdentityPort } from '../domain/identity/simulation';
import {
  browserProgressStore,
  clearOnboarding,
  loadOnboarding,
  persistProgress,
} from '../domain/identity/storage';
import {
  IDENTITY_JOURNEY_STEP,
  JOURNEY,
  type IdentityDisposition,
  type OnboardingProgress,
} from '../domain/identity/types';
import { DEMO_DATE, money, parseAmount } from '../domain/model';

const APPLICATION_ID = 'demo-onboarding';
const NOW = `${DEMO_DATE}T09:00:00Z`;

const CHOICES: { disposition: IdentityDisposition; title: string; detail: string }[] = [
  {
    disposition: 'verified',
    title: 'Verified',
    detail: 'The simulated check completes successfully.',
  },
  {
    disposition: 'explicit_rejection',
    title: 'Explicit rejection',
    detail: 'The check returns a rejection. This is final for this application.',
  },
  {
    disposition: 'timeout',
    title: 'Provider timeout',
    detail: 'The check does not finish. Progress is saved so you can resume.',
  },
  {
    disposition: 'unavailable',
    title: 'Provider unavailable',
    detail: 'The check cannot run. Progress is saved so you can resume.',
  },
];

const STATUS_LABEL: Record<OnboardingProgress['status'], string> = {
  in_progress: 'In progress',
  paused_recoverable: 'Paused, progress saved',
  rejected: 'Rejected',
  verified_ready: 'Verified, not yet activated',
  active: 'Active',
};

function stepLabel(step: OnboardingProgress['step'], progress: OnboardingProgress): string {
  if (progress.completedSteps.includes(step)) return 'Completed';
  if (progress.step === step && progress.status === 'paused_recoverable') return 'Paused';
  if (progress.step === step) return 'Current';
  return 'Not started';
}

export function OnboardingPanel() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [choice, setChoice] = useState<IdentityDisposition | ''>('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const loaded = loadOnboarding();
    setProgress(loaded.progress);
    setWarning(loaded.warning);
  }, []);

  function remember(next: OnboardingProgress, message: string) {
    if (!persistProgress(browserProgressStore(), next)) {
      setError('Progress could not be saved in this browser.');
      return;
    }
    setProgress(next);
    setError('');
    setNotice(message);
  }

  function start() {
    const created = createOnboarding(APPLICATION_ID, NOW);
    if (!created) {
      setError('The demo application could not be started.');
      return;
    }
    remember(created, 'Application started. Your progress is saved on this browser.');
  }

  function discard() {
    clearOnboarding();
    setProgress(null);
    setChoice('');
    setAmount('');
    setError('');
    setNotice('Saved onboarding progress was discarded.');
  }

  function continueStep() {
    if (!progress || (progress.step !== 1 && progress.step !== 2 && progress.step !== 3)) return;
    const result = completeJourneyStep(progress, progress.step, NOW);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const titles = ['eligibility', 'the profile fixture', 'your contact preference'];
    remember(result.progress, `Saved ${titles[progress.step - 1]}.`);
  }

  function submitIdentity() {
    if (!progress) return;
    if (!choice) {
      setError('Choose a simulated identity result.');
      return;
    }
    const result = submitIdentityCheck(
      progress,
      createSimulatedIdentityPort(choice),
      browserProgressStore(),
      NOW,
    );
    setProgress(result.progress);
    setChoice('');
    if (!result.ok) {
      setNotice('');
      setError(result.error ?? 'Identity check could not be saved.');
      return;
    }
    setError('');
    if (result.progress.status === 'paused_recoverable') {
      setNotice('Identity check paused. Progress saved. Resume at step 4 when you are ready.');
    } else if (result.progress.status === 'rejected') {
      setNotice('Identity check rejected. This account was not activated or funded.');
    } else {
      setNotice('Identity verified. The account stays inactive until you activate it.');
    }
  }

  function resume() {
    if (!progress) return;
    const result = resumePausedOnboarding(progress, browserProgressStore(), NOW);
    setProgress(result.progress);
    if (!result.ok) {
      setError(result.error ?? 'This application cannot be resumed.');
      return;
    }
    setError('');
    setNotice('Resumed at identity verification. Earlier steps are still complete.');
  }

  function activate() {
    if (!progress) return;
    const result = activateOnboardingAccount(progress, browserProgressStore(), NOW);
    setProgress(result.progress);
    if (!result.ok) {
      setError(result.error ?? 'This account cannot be activated.');
      return;
    }
    setError('');
    setNotice('Account activated. It is not funded until you add an opening amount.');
  }

  function fund(event: FormEvent) {
    event.preventDefault();
    if (!progress) return;
    const [pence, parseError] = parseAmount(amount);
    if (parseError || pence === null) {
      setError(parseError ?? 'Amount is required');
      return;
    }
    const result = fundOnboardingAccount(progress, pence, browserProgressStore(), NOW);
    setProgress(result.progress);
    if (!result.ok) {
      setError(result.error ?? 'This account cannot be funded.');
      return;
    }
    setAmount('');
    setError('');
    setNotice(`Application funded with ${money(pence)}. Your everyday balance was not changed.`);
  }

  if (!progress) {
    return (
      <section className="panel onboarding-panel">
        {warning && (
          <div className="message">
            <SectionMessage appearance="warning" title="Saved progress could not be restored">
              <p>{warning}</p>
            </SectionMessage>
          </div>
        )}
        <div role="status" className={notice ? 'notice' : 'sr-only'}>
          {notice}
        </div>
        <h2>Open an everyday account</h2>
        <p className="onboarding-lead">
          This rehearsal uses a synthetic application. It does not collect a name, identity
          document, or account number, and it does not call a live identity provider.
        </p>
        <div className="onboarding-actions">
          <Button appearance="primary" onClick={start}>
            Start application
          </Button>
        </div>
      </section>
    );
  }

  const activation = activationDecision(progress);
  const funding = fundingDecision(progress);
  const atIdentity = progress.step === IDENTITY_JOURNEY_STEP && progress.status === 'in_progress';
  const showFundingControls = progress.step >= IDENTITY_JOURNEY_STEP;

  return (
    <section className="panel onboarding-panel">
      <div role="status" className={notice ? 'notice' : 'sr-only'}>
        {notice}
      </div>
      {error && (
        <div role="alert" className="message">
          <SectionMessage appearance="error" title="Onboarding needs attention">
            <p>{error}</p>
          </SectionMessage>
        </div>
      )}
      {progress.status === 'paused_recoverable' && (
        <div className="message">
          <SectionMessage appearance="warning" title="Your progress is saved">
            <p>
              Identity verification did not finish ({progress.interruption}). Steps 1 to 3 are kept.
              Resume at step 4. This account has not been activated or funded.
            </p>
          </SectionMessage>
        </div>
      )}
      {progress.status === 'rejected' && (
        <div className="message">
          <SectionMessage appearance="error" title="Identity check was rejected">
            <p>
              An explicit rejection is not a pause, so this application cannot be resumed,
              activated, or funded.
            </p>
          </SectionMessage>
        </div>
      )}
      {progress.status === 'verified_ready' && (
        <div className="message">
          <SectionMessage appearance="success" title="Identity verified">
            <p>You can activate the account. Activation does not move money.</p>
          </SectionMessage>
        </div>
      )}

      <div className="section-heading">
        <div>
          <h2>Application progress</h2>
          <p>Synthetic application {APPLICATION_ID}. Saved in this browser only.</p>
        </div>
      </div>
      <p data-testid="onboarding-status" data-status={progress.status}>
        {STATUS_LABEL[progress.status]}
      </p>
      <p>
        Current step <span data-testid="onboarding-step">{progress.step}</span> of {JOURNEY.length}
        {progress.interruption ? (
          <>
            . Technical reason:{' '}
            <span data-testid="onboarding-interruption">{progress.interruption}</span>
          </>
        ) : null}
      </p>
      <ol className="journey" aria-label="Onboarding progress">
        {JOURNEY.map((item) => (
          <li
            key={item.id}
            className={progress.step === item.step ? 'current' : undefined}
            aria-current={progress.step === item.step ? 'step' : undefined}
          >
            <span>
              <strong>
                {item.step}. {item.title}
              </strong>
              {progress.step === item.step && <small>{item.detail}</small>}
            </span>
            <span className="journey-state">{stepLabel(item.step, progress)}</span>
          </li>
        ))}
      </ol>

      {progress.status === 'in_progress' && progress.step < IDENTITY_JOURNEY_STEP && (
        <div className="onboarding-actions">
          <Button appearance="primary" onClick={continueStep}>
            {progress.step === 1
              ? 'Complete eligibility'
              : progress.step === 2
                ? 'Confirm profile fixture'
                : 'Save contact preference'}
          </Button>
        </div>
      )}

      {atIdentity && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitIdentity();
          }}
        >
          <fieldset className="method-fieldset">
            <legend>Simulated identity result</legend>
            <p>The adapter treats these as different outcomes. Nothing is sent to a provider.</p>
            {CHOICES.map((item) => (
              <label
                key={item.disposition}
                className={`method-card ${choice === item.disposition ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="identity-disposition"
                  value={item.disposition}
                  checked={choice === item.disposition}
                  onChange={() => setChoice(item.disposition)}
                />
                <span className="method-copy">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="onboarding-actions">
            <Button type="submit" appearance="primary">
              Submit identity check
            </Button>
          </div>
        </form>
      )}

      {progress.status === 'paused_recoverable' && (
        <div className="onboarding-actions">
          <Button appearance="primary" onClick={resume}>
            Resume identity verification
          </Button>
        </div>
      )}

      <p data-testid="onboarding-gate">
        {progress.activated ? 'Account activated.' : 'Account not activated.'}{' '}
        {progress.fundedMinor > 0 ? `Funded ${money(progress.fundedMinor)}.` : 'Not funded.'}
      </p>

      {showFundingControls && (
        <div className="onboarding-funding">
          <h2>Activation and funding</h2>
          <p className="muted">
            Pending, paused, and rejected identity results cannot activate or fund this account.
            Funding the application does not change your everyday balance.
          </p>
          <div className="onboarding-actions">
            <Button appearance="primary" isDisabled={!activation.allowed} onClick={activate}>
              Activate account
            </Button>
          </div>
          <form onSubmit={fund}>
            <label className="field-label" htmlFor="opening-amount">
              Opening amount (GBP)
            </label>
            <Textfield
              id="opening-amount"
              value={amount}
              isDisabled={!funding.allowed}
              onChange={(event) => setAmount(event.currentTarget.value)}
            />
            <div className="onboarding-actions">
              <Button type="submit" appearance="primary" isDisabled={!funding.allowed}>
                Fund account
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="onboarding-actions">
        <Button appearance="subtle" onClick={discard}>
          {progress.status === 'rejected' ? 'Start another application' : 'Discard saved progress'}
        </Button>
      </div>
    </section>
  );
}
