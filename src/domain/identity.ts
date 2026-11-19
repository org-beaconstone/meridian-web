// Identity slice for a fictional savings-account application.
// Rehearsal outcomes are not a verification-service contract.
// Do not log capture fields, credentials, or tokens from this module.

import { DEMO_DATE, isCalendarDate } from './model';

export const IDENTITY_INTEGRATION = {
  planningAlias: 'W01',
  dependency: 'W02',
  status: 'blocked',
  forecastAcceptance: '2026-11-26',
} as const;

export type VerificationOutcome = 'verified' | 'rejected' | 'unavailable';

export interface IdentityCapture {
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  documentReference: string;
  consentAccepted: boolean;
}

export type IdentityCode =
  'IDENTITY_VERIFIED_REHEARSAL' | 'IDENTITY_REJECTED' | 'VERIFICATION_UNAVAILABLE';

export interface IdentityDecision {
  applicationId: string;
  outcome: VerificationOutcome;
  retryable: boolean;
  authoritative: false;
  acceptance: 'blocked';
  dependency: 'W02';
  code: IdentityCode;
  summary: string;
}

export interface IdentityLogRecord {
  event: 'identity.outcome';
  applicationId: string;
  outcome: VerificationOutcome;
  retryable: boolean;
  code: IdentityCode;
  acceptance: 'blocked';
  dependency: 'W02';
}

export type GateCode = IdentityCode | 'INTEGRATION_BLOCKED' | 'NOT_VERIFIED';

export interface GateRefusal {
  ok: false;
  accountActivated: false;
  funded: false;
  retryable: boolean;
  code: GateCode;
  summary: string;
}

const APPLICATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME = /^[\p{L}][\p{L} '.-]{0,39}$/u;

const OUTCOME_COPY: Record<
  VerificationOutcome,
  { retryable: boolean; code: IdentityCode; summary: string }
> = {
  verified: {
    retryable: false,
    code: 'IDENTITY_VERIFIED_REHEARSAL',
    summary:
      'Identity check rehearsed as verified. This is not an accepted verification from W02, so the account stays inactive.',
  },
  rejected: {
    retryable: false,
    code: 'IDENTITY_REJECTED',
    summary:
      'Identity check rejected this application. This is a final decision, not a temporary outage.',
  },
  unavailable: {
    retryable: true,
    code: 'VERIFICATION_UNAVAILABLE',
    summary:
      'Identity verification is temporarily unavailable. This is not a rejection, and the same application can be retried.',
  },
};

const LOG_CODES: ReadonlySet<IdentityCode> = new Set([
  'IDENTITY_VERIFIED_REHEARSAL',
  'IDENTITY_REJECTED',
  'VERIFICATION_UNAVAILABLE',
]);

export function consentError(accepted: boolean): string | null {
  return accepted ? null : 'Consent is required before identity details can be checked.';
}

function ageOnDemoDate(dateOfBirth: string): number | null {
  if (!isCalendarDate(dateOfBirth)) return null;
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = DEMO_DATE.split('-').map(Number);
  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  return age;
}

function referenceProblem(reference: string): string | null {
  if (!reference.trim()) return 'Fictional reference is required.';
  const compact = reference.trim().replace(/[\s-]/g, '');
  const digitsOnly = compact.replace(/\D/g, '');
  const looksLikeCard =
    digitsOnly.length >= 13 && digitsOnly.length <= 19 && digitsOnly === compact;
  const looksLikeCredential =
    compact.length > 12 ||
    /bearer|token|secret|password|sk_live|sk_test|eyJ/i.test(compact) ||
    compact.includes('.');
  if (!compact || looksLikeCard || looksLikeCredential || !/^[A-Za-z0-9]{6,12}$/.test(compact)) {
    return 'Enter a short fictional reference. Card numbers, credentials, and tokens are not accepted.';
  }
  return null;
}

/**
 * Validate a capture. Messages never repeat the submitted values.
 */
export function validateIdentityCapture(capture: IdentityCapture): string[] {
  const errors: string[] = [];
  const consent = consentError(capture.consentAccepted);
  if (consent) errors.push(consent);

  const givenName = capture.givenName.trim().replace(/\s+/g, ' ');
  const familyName = capture.familyName.trim().replace(/\s+/g, ' ');
  if (!givenName) errors.push('Given name is required.');
  else if (!NAME.test(givenName)) errors.push('Enter a given name using letters only.');
  if (!familyName) errors.push('Family name is required.');
  else if (!NAME.test(familyName)) errors.push('Enter a family name using letters only.');

  if (!capture.dateOfBirth.trim()) errors.push('Date of birth is required.');
  else if (!isCalendarDate(capture.dateOfBirth.trim())) {
    errors.push('Enter a real date of birth as YYYY-MM-DD.');
  } else {
    const age = ageOnDemoDate(capture.dateOfBirth.trim());
    if (age === null || age < 18 || age > 120) {
      errors.push('Enter a date of birth for someone aged 18 to 120 on 18 September 2026.');
    }
  }

  const referenceError = referenceProblem(capture.documentReference);
  if (referenceError) errors.push(referenceError);
  return errors;
}

export function submitIdentity(
  capture: IdentityCapture,
  rehearsalOutcome: VerificationOutcome,
  applicationId: string,
): { ok: true; decision: IdentityDecision } | { ok: false; errors: string[] } {
  if (!APPLICATION_ID.test(applicationId)) {
    return { ok: false, errors: ['Application reference is invalid.'] };
  }
  if (
    rehearsalOutcome !== 'verified' &&
    rehearsalOutcome !== 'rejected' &&
    rehearsalOutcome !== 'unavailable'
  ) {
    return { ok: false, errors: ['Choose a rehearsal outcome.'] };
  }
  const errors = validateIdentityCapture(capture);
  if (errors.length > 0) return { ok: false, errors };

  const copy = OUTCOME_COPY[rehearsalOutcome];
  return {
    ok: true,
    decision: {
      applicationId,
      outcome: rehearsalOutcome,
      retryable: copy.retryable,
      authoritative: false,
      acceptance: IDENTITY_INTEGRATION.status,
      dependency: IDENTITY_INTEGRATION.dependency,
      code: copy.code,
      summary: copy.summary,
    },
  };
}

function isOutcome(value: unknown): value is VerificationOutcome {
  return value === 'verified' || value === 'rejected' || value === 'unavailable';
}

/** Log line containing only the outcome. Capture fields are dropped. */
export function identityLogRecord(decision: IdentityDecision): IdentityLogRecord {
  if (!APPLICATION_ID.test(decision.applicationId)) {
    throw new Error('Identity log reference is invalid');
  }
  if (!isOutcome(decision.outcome) || !LOG_CODES.has(decision.code)) {
    throw new Error('Identity log outcome is invalid');
  }
  return {
    event: 'identity.outcome',
    applicationId: decision.applicationId,
    outcome: decision.outcome,
    retryable: OUTCOME_COPY[decision.outcome].retryable,
    code: OUTCOME_COPY[decision.outcome].code,
    acceptance: 'blocked',
    dependency: 'W02',
  };
}

export function writeIdentityLog(
  decision: IdentityDecision,
  writer: (line: string) => void = () => undefined,
): IdentityLogRecord {
  const record = identityLogRecord(decision);
  writer(JSON.stringify(record));
  return record;
}

/**
 * Ignore a contract-shaped payload while W02 is outstanding.
 * The returned decision stays non-authoritative and contains no payload fields.
 */
export function acknowledgeContract(
  decision: IdentityDecision,
  payload: unknown,
): IdentityDecision {
  void payload;
  const record = identityLogRecord(decision);
  return {
    applicationId: record.applicationId,
    outcome: record.outcome,
    retryable: record.retryable,
    authoritative: false,
    acceptance: 'blocked',
    dependency: 'W02',
    code: record.code,
    summary: OUTCOME_COPY[record.outcome].summary,
  };
}

export function activateSavingsAccount(decision: IdentityDecision | null): GateRefusal {
  if (!decision) {
    return {
      ok: false,
      accountActivated: false,
      funded: false,
      retryable: false,
      code: 'NOT_VERIFIED',
      summary:
        'No verification outcome is recorded. The savings account stays closed and funding is not accepted.',
    };
  }
  if (decision.outcome === 'rejected') {
    return {
      ok: false,
      accountActivated: false,
      funded: false,
      retryable: false,
      code: 'IDENTITY_REJECTED',
      summary:
        'This application was rejected. That is a final identity decision, not a temporary outage. The savings account stays closed and funding is not accepted.',
    };
  }
  if (decision.outcome === 'unavailable') {
    return {
      ok: false,
      accountActivated: false,
      funded: false,
      retryable: true,
      code: 'VERIFICATION_UNAVAILABLE',
      summary:
        'Verification is temporarily unavailable. This is not a rejection. Retry the same application when the check is back. The savings account stays closed and funding is not accepted.',
    };
  }
  return {
    ok: false,
    accountActivated: false,
    funded: false,
    retryable: false,
    code: 'INTEGRATION_BLOCKED',
    summary:
      'The rehearsal outcome is verified, but W02 has not delivered the verification API contract. A prototype outcome is not integration acceptance (forecast 26 November 2026). The savings account stays closed and funding is not accepted.',
  };
}

export function acceptInitialFunding(
  decision: IdentityDecision | null,
  amount: string,
): GateRefusal {
  // Amount is intentionally unused until an authoritative verification exists.
  // Parsing it here would risk copying a credential-like string into an error.
  void amount;
  return { ...activateSavingsAccount(decision), funded: false };
}
