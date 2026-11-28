import { useState, type FormEvent } from 'react';
import Button from '@atlaskit/button/new';
import SectionMessage from '@atlaskit/section-message';
import {
  isIdentityVerificationResult,
  selectApplicantIdentityMessage,
  type ApplicantIdentityMessage,
  type IdentityVerificationResult,
} from '../domain/identity-messaging';

const CHOICES: { value: IdentityVerificationResult; title: string; detail: string }[] = [
  {
    value: 'verified',
    title: 'Verified',
    detail: 'The check completes.',
  },
  {
    value: 'explicit_rejection',
    title: 'Explicit decline',
    detail: 'The check declines this application.',
  },
  {
    value: 'timeout',
    title: 'Identity check timed out',
    detail: 'The check does not finish in time.',
  },
  {
    value: 'unavailable',
    title: 'Identity check unavailable',
    detail: 'The check cannot be reached.',
  },
];

const APPEARANCE = {
  verified: 'success',
  explicit_rejection: 'error',
  paused: 'warning',
} as const;

export default function IdentityOutcome() {
  const [choice, setChoice] = useState<IdentityVerificationResult | ''>('');
  const [message, setMessage] = useState<ApplicantIdentityMessage | null>(null);
  const [error, setError] = useState('');
  const [returned, setReturned] = useState(false);

  function showOutcome(event: FormEvent) {
    event.preventDefault();
    if (!isIdentityVerificationResult(choice)) {
      setError('Choose an identity check result.');
      setMessage(null);
      return;
    }
    setError('');
    setReturned(false);
    setMessage(selectApplicantIdentityMessage(choice));
  }

  function returnToContinue() {
    setMessage(null);
    setError('');
    setReturned(true);
  }

  function showAnother() {
    setMessage(null);
    setError('');
    setReturned(false);
  }

  return (
    <section className="panel identity-outcome" aria-labelledby="identity-outcome-heading">
      <div className="section-heading">
        <div>
          <h2 id="identity-outcome-heading">Identity check</h2>
          <p>Fictional result only. No document, name, or account number is collected.</p>
        </div>
      </div>

      {returned && !message && (
        <div role="status" className="message">
          <SectionMessage appearance="information" title="You can continue when you are ready">
            <p>Try again later. This identity check has not been run again.</p>
          </SectionMessage>
        </div>
      )}

      {message ? (
        <div data-testid="applicant-identity-message" data-outcome={message.outcome}>
          <SectionMessage appearance={APPEARANCE[message.outcome]} title={message.title}>
            <p>{message.body}</p>
            {message.nextStep ? <p>{message.nextStep}</p> : null}
          </SectionMessage>
          <div className="identity-actions">
            {message.outcome === 'paused' ? (
              <Button appearance="primary" onClick={returnToContinue}>
                Return to continue
              </Button>
            ) : (
              <Button onClick={showAnother}>Show another result</Button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={showOutcome} noValidate>
          <fieldset className="method-fieldset">
            <legend>What did the identity check return?</legend>
            <p>This rehearsal stays on your screen. It does not call a verification service.</p>
            {CHOICES.map((item) => (
              <label
                key={item.value}
                className={`method-card ${choice === item.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="identity-result"
                  value={item.value}
                  checked={choice === item.value}
                  onChange={() => {
                    setChoice(item.value);
                    setError('');
                  }}
                />
                <span className="method-copy">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="danger-text">
              {error}
            </p>
          )}
          <div className="form-footer">
            <span>Demo only. No account is opened.</span>
            <Button type="submit" appearance="primary">
              Check identity
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
