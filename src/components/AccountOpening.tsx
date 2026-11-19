import { useRef, useState } from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import { ShieldCheck } from 'lucide-react';
import {
  acceptInitialFunding,
  activateSavingsAccount,
  consentError,
  IDENTITY_INTEGRATION,
  submitIdentity,
  writeIdentityLog,
  type IdentityDecision,
  type VerificationOutcome,
} from '../domain/identity';
import { money } from '../domain/model';

const steps = ['Welcome', 'Consent', 'Identity', 'Outcome'] as const;

export default function AccountOpening({
  balance,
  onLeave,
}: {
  balance: number;
  onLeave: () => void;
}) {
  const applicationId = useRef(crypto.randomUUID());
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [documentReference, setDocumentReference] = useState('');
  const [rehearsal, setRehearsal] = useState<VerificationOutcome>('verified');
  const [errors, setErrors] = useState<string[]>([]);
  const [decision, setDecision] = useState<IdentityDecision | null>(null);
  const [gateMessage, setGateMessage] = useState('');

  function restart() {
    applicationId.current = crypto.randomUUID();
    setConsent(false);
    setGivenName('');
    setFamilyName('');
    setDateOfBirth('');
    setDocumentReference('');
    setRehearsal('verified');
    setErrors([]);
    setDecision(null);
    setGateMessage('');
    setStep(0);
  }

  function recordOutcome(nextRehearsal: VerificationOutcome) {
    const result = submitIdentity(
      {
        givenName,
        familyName,
        dateOfBirth,
        documentReference,
        consentAccepted: consent,
      },
      nextRehearsal,
      applicationId.current,
    );
    if (!result.ok) {
      setErrors(result.errors);
      setDecision(null);
      setStep(2);
      return;
    }
    writeIdentityLog(result.decision);
    setErrors([]);
    setDecision(result.decision);
    setGateMessage('');
    setStep(3);
  }

  function attempt(action: 'account' | 'funding') {
    if (!decision) return;
    const gate =
      action === 'account'
        ? activateSavingsAccount(decision)
        : acceptInitialFunding(decision, '20.00');
    setGateMessage(gate.summary);
  }

  const outcomeAppearance =
    decision?.outcome === 'rejected'
      ? 'error'
      : decision?.outcome === 'unavailable'
        ? 'warning'
        : 'success';
  const outcomeTitle =
    decision?.outcome === 'rejected'
      ? 'Rejected'
      : decision?.outcome === 'unavailable'
        ? 'Temporarily unavailable'
        : 'Verified';

  return (
    <div className="journey-layout">
      <section className="panel payment-panel" aria-labelledby="opening-steps">
        <h2 id="opening-steps" className="sr-only">
          Identity check
        </h2>
        <ol className="stepper" aria-label="Account opening progress">
          {steps.map((label, index) => (
            <li
              key={label}
              className={index <= step ? 'reached' : ''}
              aria-current={index === step ? 'step' : undefined}
            >
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="form-intro">
            <h2>Welcome</h2>
            <p>
              Check identity before a savings account can be considered. This demo stores nothing.
            </p>
            <div className="journey-note">
              <SectionMessage appearance="warning" title="Identity acceptance is blocked">
                <p>
                  Full acceptance depends on {IDENTITY_INTEGRATION.dependency} delivering the
                  verification API contract. A rehearsal outcome does not open an account or accept
                  funding. Forecast acceptance is 26 November 2026.
                </p>
              </SectionMessage>
            </div>
            <div className="journey-actions">
              <Button appearance="primary" onClick={() => setStep(1)}>
                Continue
              </Button>
              <Button onClick={onLeave}>Back to overview</Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const message = consentError(consent);
              if (message) {
                setErrors([message]);
                return;
              }
              setErrors([]);
              setStep(2);
            }}
          >
            <div className="form-intro">
              <h2>Consent</h2>
              <p>Identity details stay in this check only. They are not saved or sent anywhere.</p>
            </div>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.currentTarget.checked)}
              />
              <span>
                I understand this is a fictional demo. I will not enter a real name, date of birth,
                document number, card number, or credential.
              </span>
            </label>
            {errors.length > 0 && (
              <div role="alert">
                {errors.map((error) => (
                  <p key={error} className="danger-text">
                    {error}
                  </p>
                ))}
              </div>
            )}
            <div className="journey-actions">
              <Button type="button" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="submit" appearance="primary">
                Continue
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form
            autoComplete="off"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              recordOutcome(rehearsal);
            }}
          >
            <div className="form-intro">
              <h2>Identity</h2>
              <p>
                Use fictional details. The reference is a short demo code, not a document number.
              </p>
            </div>
            <div className="field-row">
              <div>
                <label className="field-label" htmlFor="given-name">
                  Given name
                </label>
                <Textfield
                  id="given-name"
                  value={givenName}
                  autoComplete="off"
                  onChange={(event) => setGivenName(event.currentTarget.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="family-name">
                  Family name
                </label>
                <Textfield
                  id="family-name"
                  value={familyName}
                  autoComplete="off"
                  onChange={(event) => setFamilyName(event.currentTarget.value)}
                />
              </div>
            </div>
            <div className="field-row">
              <div>
                <label className="field-label" htmlFor="date-of-birth">
                  Date of birth
                </label>
                <Textfield
                  id="date-of-birth"
                  value={dateOfBirth}
                  autoComplete="off"
                  placeholder="YYYY-MM-DD"
                  onChange={(event) => setDateOfBirth(event.currentTarget.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="document-reference">
                  Fictional reference
                </label>
                <Textfield
                  id="document-reference"
                  value={documentReference}
                  autoComplete="off"
                  onChange={(event) => setDocumentReference(event.currentTarget.value)}
                />
              </div>
            </div>
            <label className="field-label" htmlFor="rehearsal-outcome">
              Rehearsal verification outcome
            </label>
            <select
              id="rehearsal-outcome"
              value={rehearsal}
              onChange={(event) => setRehearsal(event.currentTarget.value as VerificationOutcome)}
            >
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="unavailable">Temporarily unavailable</option>
            </select>
            <p className="muted">
              This chooses the rehearsal screen only. It does not call a verification service.
            </p>
            {errors.length > 0 && (
              <div role="alert" className="message">
                <SectionMessage appearance="error" title="Check the identity details">
                  {errors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </SectionMessage>
              </div>
            )}
            <div className="journey-actions">
              <Button type="button" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" appearance="primary">
                Check identity
              </Button>
            </div>
          </form>
        )}

        {step === 3 && decision && (
          <div>
            <div className="form-intro">
              <h2>Verification outcome</h2>
              <p>Application {decision.applicationId}</p>
            </div>
            <Lozenge
              appearance={
                decision.outcome === 'rejected'
                  ? 'removed'
                  : decision.outcome === 'unavailable'
                    ? 'inprogress'
                    : 'success'
              }
            >
              {outcomeTitle}
            </Lozenge>
            <div className="journey-note" data-testid="identity-outcome">
              <SectionMessage appearance={outcomeAppearance} title={outcomeTitle}>
                <p>{decision.summary}</p>
              </SectionMessage>
            </div>
            <dl className="gate-list">
              <div>
                <dt>Savings account</dt>
                <dd>Not opened</dd>
              </div>
              <div>
                <dt>Initial funding</dt>
                <dd>Not accepted</dd>
              </div>
            </dl>
            {decision.outcome === 'unavailable' && (
              <>
                <label className="field-label" htmlFor="retry-outcome">
                  Rehearsal verification outcome
                </label>
                <select
                  id="retry-outcome"
                  value={rehearsal}
                  onChange={(event) =>
                    setRehearsal(event.currentTarget.value as VerificationOutcome)
                  }
                >
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="unavailable">Temporarily unavailable</option>
                </select>
              </>
            )}
            {gateMessage && (
              <div role="alert" className="message">
                <SectionMessage appearance="warning" title="Account remains closed">
                  <p>{gateMessage}</p>
                </SectionMessage>
              </div>
            )}
            <div className="journey-actions">
              {decision.retryable && (
                <Button appearance="primary" onClick={() => recordOutcome(rehearsal)}>
                  Retry verification
                </Button>
              )}
              {decision.outcome === 'verified' && (
                <>
                  <Button onClick={() => attempt('account')}>Set up savings account</Button>
                  <Button onClick={() => attempt('funding')}>Add initial funding</Button>
                </>
              )}
              {decision.outcome === 'rejected' && (
                <Button appearance="primary" onClick={restart}>
                  Start a new application
                </Button>
              )}
              <Button onClick={onLeave}>Back to overview</Button>
            </div>
          </div>
        )}
      </section>
      <aside className="panel journey-aside">
        <span className="icon-tile">
          <ShieldCheck size={18} aria-hidden="true" />
        </span>
        <h2>Closed until verification is accepted</h2>
        <p>
          Planning item {IDENTITY_INTEGRATION.planningAlias} cannot accept identity integration
          while {IDENTITY_INTEGRATION.dependency} is outstanding.
        </p>
        <p>Everyday balance {money(balance)}. This check does not move money.</p>
      </aside>
    </div>
  );
}
