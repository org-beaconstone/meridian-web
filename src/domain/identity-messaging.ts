// Applicant-facing copy for a fictional identity check.
// Timeout and unavailable pause the application. They are not a decline.
// The next step tells the applicant to come back. It does not describe an
// automatic retry, because that policy is not decided.

export const IDENTITY_VERIFICATION_RESULTS = [
  'verified',
  'explicit_rejection',
  'timeout',
  'unavailable',
] as const;

export type IdentityVerificationResult = (typeof IDENTITY_VERIFICATION_RESULTS)[number];

export type ApplicantIdentityOutcome = 'verified' | 'explicit_rejection' | 'paused';

export interface ApplicantIdentityMessage {
  outcome: ApplicantIdentityOutcome;
  title: string;
  body: string;
  nextStep: string | null;
}

/** Existing verified outcome. Keep this copy stable. */
export const VERIFIED_APPLICANT_MESSAGE: ApplicantIdentityMessage = {
  outcome: 'verified',
  title: 'Identity verified',
  body: 'Your identity check is complete. You can continue this application.',
  nextStep: null,
};

/** Existing explicit decline. Keep this copy stable. */
export const EXPLICIT_REJECTION_APPLICANT_MESSAGE: ApplicantIdentityMessage = {
  outcome: 'explicit_rejection',
  title: 'Application declined',
  body: 'This application was declined after the identity check. That decision is final for this application.',
  nextStep: null,
};

/** Shared paused outcome for timeout and unavailable. */
export const PAUSED_APPLICANT_MESSAGE: ApplicantIdentityMessage = {
  outcome: 'paused',
  title: 'Application paused, not declined',
  body: 'Your application is paused and still open. The identity check could not be completed, so no decision has been made.',
  nextStep: 'Return to continue, or try again later.',
};

const BY_RESULT: Record<IdentityVerificationResult, ApplicantIdentityMessage> = {
  verified: VERIFIED_APPLICANT_MESSAGE,
  explicit_rejection: EXPLICIT_REJECTION_APPLICANT_MESSAGE,
  timeout: PAUSED_APPLICANT_MESSAGE,
  unavailable: PAUSED_APPLICANT_MESSAGE,
};

export function isIdentityVerificationResult(value: string): value is IdentityVerificationResult {
  return (IDENTITY_VERIFICATION_RESULTS as readonly string[]).includes(value);
}

/**
 * Select applicant copy from an identity-check result.
 * Verified and explicit rejection keep their own messages.
 * Timeout and unavailable both select the paused message.
 */
export function selectApplicantIdentityMessage(
  result: IdentityVerificationResult,
): ApplicantIdentityMessage {
  return BY_RESULT[result];
}
