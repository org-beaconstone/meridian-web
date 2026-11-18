import { useState } from 'react';
import Button from '@atlaskit/button/new';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import {
  blankRegistrationDraft,
  prepareRegistration,
  type Registration,
  type RegistrationDraft,
  type RegistrationField,
  type RegistrationFieldError,
} from '../domain/registration';
import Dialog from './Dialog';

const fields: {
  field: Exclude<RegistrationField, 'acceptedTerms'>;
  label: string;
  type?: string;
  maxLength: number;
  hint?: string;
  span?: boolean;
}[] = [
  { field: 'givenName', label: 'Given name', maxLength: 50 },
  { field: 'familyName', label: 'Family name', maxLength: 50 },
  {
    field: 'email',
    label: 'Email',
    type: 'email',
    maxLength: 254,
    hint: 'Use a fictional address. It is not stored.',
    span: true,
  },
  {
    field: 'mobile',
    label: 'Mobile number',
    type: 'tel',
    maxLength: 20,
    hint: 'UK mobile, for example 07700 900123.',
  },
  {
    field: 'dateOfBirth',
    label: 'Date of birth',
    type: 'date',
    maxLength: 10,
    hint: 'Age is checked against 18 September 2026.',
  },
  { field: 'addressLine', label: 'Address', maxLength: 100, span: true },
  { field: 'city', label: 'City', maxLength: 50 },
  { field: 'postcode', label: 'Postcode', maxLength: 12 },
];

export default function RegistrationDialog({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<RegistrationDraft>(blankRegistrationDraft);
  const [errors, setErrors] = useState<RegistrationFieldError[]>([]);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const errorFor = (field: RegistrationField) =>
    errors.find((error) => error.field === field)?.message;

  return (
    <Dialog title="Registration details" onClose={onClose} className="dialog-wide">
      {registration ? (
        <RegistrationSummary registration={registration} onClose={onClose} />
      ) : (
        <form
          autoComplete="off"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const result = prepareRegistration(draft);
            if (!result.ok) {
              setErrors(result.errors);
              return;
            }
            setErrors([]);
            setRegistration(result.registration);
          }}
        >
          <p>
            Check the details for a new personal account. This demo only validates them. Nothing is
            saved, and no login or account is created. Do not enter real personal or financial
            details.
          </p>
          {errors.length > 0 && (
            <div role="alert" className="message">
              <SectionMessage appearance="error" title="Check these details">
                <p>{errors.map((error) => error.message).join('. ')}</p>
              </SectionMessage>
            </div>
          )}
          <div className="registration-grid">
            {fields.map((item) => {
              const error = errorFor(item.field);
              const errorId = `${item.field}-error`;
              const hintId = `${item.field}-hint`;
              const describedBy = [item.hint ? hintId : undefined, error ? errorId : undefined]
                .filter(Boolean)
                .join(' ');
              return (
                <div key={item.field} className={item.span ? 'registration-span' : undefined}>
                  <label className="field-label" htmlFor={item.field}>
                    {item.label}
                  </label>
                  <Textfield
                    id={item.field}
                    value={draft[item.field]}
                    type={item.type}
                    maxLength={item.maxLength}
                    autoComplete="off"
                    isInvalid={Boolean(error)}
                    aria-describedby={describedBy || undefined}
                    onChange={(event) =>
                      setDraft({ ...draft, [item.field]: event.currentTarget.value })
                    }
                  />
                  {item.hint && (
                    <small id={hintId} className="muted">
                      {item.hint}
                    </small>
                  )}
                  {error && (
                    <p id={errorId} className="field-error danger-text">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <label className="terms-check" htmlFor="acceptedTerms">
            <input
              id="acceptedTerms"
              type="checkbox"
              checked={draft.acceptedTerms}
              aria-invalid={Boolean(errorFor('acceptedTerms'))}
              aria-describedby={errorFor('acceptedTerms') ? 'acceptedTerms-error' : undefined}
              onChange={(event) =>
                setDraft({ ...draft, acceptedTerms: event.currentTarget.checked })
              }
            />
            <span>I understand this is a fictional demo and these details will not be stored.</span>
          </label>
          {errorFor('acceptedTerms') && (
            <p id="acceptedTerms-error" className="field-error danger-text">
              {errorFor('acceptedTerms')}
            </p>
          )}
          <div className="dialog-actions">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" appearance="primary">
              Check details
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function RegistrationSummary({
  registration,
  onClose,
}: {
  registration: Registration;
  onClose: () => void;
}) {
  const born = new Date(`${registration.dateOfBirth}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const mobile = registration.mobile.replace(/^(\+44)(\d{4})(\d{6})$/, '$1 $2 $3');
  return (
    <>
      <div role="status" className="message">
        <SectionMessage appearance="success" title="Details accepted">
          <p>
            These details pass the registration checks. Nothing was saved and no account was opened.
          </p>
        </SectionMessage>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Name</dt>
          <dd>
            {registration.givenName} {registration.familyName}
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{registration.email}</dd>
        </div>
        <div>
          <dt>Mobile</dt>
          <dd>{mobile}</dd>
        </div>
        <div>
          <dt>Date of birth</dt>
          <dd>{born}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>
            {registration.addressLine}, {registration.city} {registration.postcode}
          </dd>
        </div>
      </dl>
      <div className="dialog-actions">
        <Button appearance="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </>
  );
}
