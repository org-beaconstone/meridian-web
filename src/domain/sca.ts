// Synthetic PSD2 SCA rehearsal for PAY-152.
// This is not production authentication, device binding, or a regulatory attestation.

export const PASSCODE_LENGTH = 6;
export const MAX_PASSCODE_ATTEMPTS = 5;

/** Fictional code shown in the rehearsal UI. Not a customer secret. */
export const DEMO_REHEARSAL_PASSCODE = '482913';

export const PERMITTED_FACTORS = ['device_biometric', 'in_app_passcode'] as const;
export type ScaFactor = (typeof PERMITTED_FACTORS)[number];

/** Channels a SIM swap can steal. They are never accepted factors. */
export const REJECTED_FACTORS = ['sms_otp', 'voice_otp', 'email_otp', 'sim_swap_otp'] as const;

export const REQUIRED_STAKEHOLDERS = [
  'Trust & Safety',
  'Payments Platform engineering',
  'Payments Platform legal',
] as const;

export const BIOMETRIC_PROMPT_TEMPLATE =
  'Approve {amount} to {payee} on this device. Meridian will not send a text message or use your phone number for this check.';

export const FALLBACK_COPY =
  'If this device cannot use biometrics, enter the 6-digit passcode saved in the Meridian app. A code sent by text, email or phone call cannot approve the payment. Controlling a SIM does not provide this factor.';

export const PASSCODE_FIELD_LABEL = '6-digit app passcode';

export interface DynamicLink {
  paymentId: string;
  recipientId: string;
  amountPence: number;
}

export type AuditOutcome = 'accepted' | 'rejected' | 'locked';

export interface ScaAuditEvent {
  event: 'sca.authentication';
  registerId: 'PAY-152';
  paymentId: string;
  recipientId: string;
  amountPence: number;
  dynamicLink: string;
  factor: ScaFactor;
  outcome: AuditOutcome;
  attempt: number;
}

export interface ScaSignOff {
  registerId: 'PAY-152';
  parentReference: 'PAY-1204';
  architecture: 'in-app-passcode-fallback';
  smsOtpPermitted: boolean;
  permittedFactors: readonly ScaFactor[];
  auditPayloadApproved: boolean;
  biometricCopyApproved: boolean;
  fallbackFlowApproved: boolean;
  stakeholders: readonly string[];
  /** Written architecture sign-off is logged. Live traffic is a separate authorization. */
  writtenSignOff: 'logged';
  liveCanaryAuthorized: boolean;
}

/**
 * Architecture sign-off recorded for the fictional rehearsal.
 * Live canary traffic stays unauthorized.
 */
export const SCA_SIGNOFF: ScaSignOff = {
  registerId: 'PAY-152',
  parentReference: 'PAY-1204',
  architecture: 'in-app-passcode-fallback',
  smsOtpPermitted: false,
  permittedFactors: PERMITTED_FACTORS,
  auditPayloadApproved: true,
  biometricCopyApproved: true,
  fallbackFlowApproved: true,
  stakeholders: REQUIRED_STAKEHOLDERS,
  writtenSignOff: 'logged',
  liveCanaryAuthorized: false,
};

const FORBIDDEN_AUDIT_KEYS = [
  'passcode',
  'pin',
  'otp',
  'smscode',
  'biometrictemplate',
  'pan',
  'cvv',
  'password',
];

export function biometricPromptCopy(payee: string, amountLabel: string): string {
  const payeeName = payee.trim();
  const amount = amountLabel.trim();
  if (!payeeName || !amount) {
    throw new Error('Dynamic linking requires the payee and amount in the prompt');
  }
  return BIOMETRIC_PROMPT_TEMPLATE.replace('{amount}', amount).replace('{payee}', payeeName);
}

export function assertDynamicLink(link: DynamicLink): void {
  if (!link.paymentId.trim() || !link.recipientId.trim()) {
    throw new Error('Dynamic linking requires a payment and recipient');
  }
  if (!Number.isSafeInteger(link.amountPence) || link.amountPence <= 0) {
    throw new Error('Dynamic linking requires a positive integer amount in minor units');
  }
}

export function dynamicLinkToken(link: DynamicLink): string {
  assertDynamicLink(link);
  return `dl_${link.paymentId}_${link.recipientId}_${link.amountPence}`;
}

export function assertFactorPermitted(factor: string): asserts factor is ScaFactor {
  if (!(PERMITTED_FACTORS as readonly string[]).includes(factor)) {
    throw new Error('Factor is not permitted for PSD2 SCA rehearsal');
  }
  if ((REJECTED_FACTORS as readonly string[]).includes(factor)) {
    throw new Error('Factor is not permitted for PSD2 SCA rehearsal');
  }
}

export function auditPayloadIsSafe(payload: object): boolean {
  return Object.keys(payload).every((key) => !FORBIDDEN_AUDIT_KEYS.includes(key.toLowerCase()));
}

function buildAudit(
  link: DynamicLink,
  factor: ScaFactor,
  outcome: AuditOutcome,
  attempt: number,
): ScaAuditEvent {
  const event: ScaAuditEvent = {
    event: 'sca.authentication',
    registerId: 'PAY-152',
    paymentId: link.paymentId,
    recipientId: link.recipientId,
    amountPence: link.amountPence,
    dynamicLink: dynamicLinkToken(link),
    factor,
    outcome,
    attempt,
  };
  if (!auditPayloadIsSafe(event) || JSON.stringify(event).includes(DEMO_REHEARSAL_PASSCODE)) {
    throw new Error('Audit payload failed the secret check');
  }
  return event;
}

export function acceptDeviceBiometric(link: DynamicLink, locked: boolean): ScaAuditEvent {
  assertFactorPermitted('device_biometric');
  if (locked) {
    return buildAudit(link, 'device_biometric', 'locked', MAX_PASSCODE_ATTEMPTS);
  }
  return buildAudit(link, 'device_biometric', 'accepted', 1);
}

export interface PasscodeAttempt {
  ok: boolean;
  locked: boolean;
  attemptsUsed: number;
  error: string | null;
  audit: ScaAuditEvent;
}

export function attemptPasscode(input: {
  link: DynamicLink;
  passcode: string;
  attemptsUsed: number;
}): PasscodeAttempt {
  assertFactorPermitted('in_app_passcode');
  assertDynamicLink(input.link);
  if (input.attemptsUsed >= MAX_PASSCODE_ATTEMPTS) {
    return {
      ok: false,
      locked: true,
      attemptsUsed: input.attemptsUsed,
      error: 'This payment is locked. Start a new payment to try again.',
      audit: buildAudit(input.link, 'in_app_passcode', 'locked', input.attemptsUsed),
    };
  }

  const normalized = input.passcode.trim();
  const matches = /^\d{6}$/.test(normalized) && normalized === DEMO_REHEARSAL_PASSCODE;
  const attemptsUsed = input.attemptsUsed + 1;
  if (!matches) {
    const locked = attemptsUsed >= MAX_PASSCODE_ATTEMPTS;
    return {
      ok: false,
      locked,
      attemptsUsed,
      error: locked
        ? 'Too many attempts. This payment is locked. Start a new payment to try again.'
        : 'That passcode was not recognised. Text messages are not accepted.',
      audit: buildAudit(
        input.link,
        'in_app_passcode',
        locked ? 'locked' : 'rejected',
        attemptsUsed,
      ),
    };
  }

  return {
    ok: true,
    locked: false,
    attemptsUsed,
    error: null,
    audit: buildAudit(input.link, 'in_app_passcode', 'accepted', attemptsUsed),
  };
}

export function isSignOffLogged(record: ScaSignOff | null): boolean {
  if (!record) return false;
  if (record.registerId !== 'PAY-152' || record.writtenSignOff !== 'logged') return false;
  if (record.parentReference !== 'PAY-1204') return false;
  if (record.architecture !== 'in-app-passcode-fallback') return false;
  if (record.smsOtpPermitted !== false) return false;
  if (
    !record.auditPayloadApproved ||
    !record.biometricCopyApproved ||
    !record.fallbackFlowApproved
  ) {
    return false;
  }
  const factors = [...record.permittedFactors].sort();
  const expected = [...PERMITTED_FACTORS].sort();
  if (
    factors.length !== expected.length ||
    factors.some((factor, index) => factor !== expected[index])
  ) {
    return false;
  }
  if (
    record.permittedFactors.some((factor) =>
      (REJECTED_FACTORS as readonly string[]).includes(factor),
    )
  ) {
    return false;
  }
  return REQUIRED_STAKEHOLDERS.every((stakeholder) => record.stakeholders.includes(stakeholder));
}

export interface CanaryDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Production canary stays closed unless the written sign-off is logged
 * and a separate live-traffic authorization is present. The shipped record
 * logs the sign-off and withholds that authorization.
 */
export function evaluateCanaryGate(
  record: ScaSignOff | null,
  request: { liveTraffic: boolean },
): CanaryDecision {
  if (!request.liveTraffic) {
    return { allowed: false, reason: 'Live canary traffic is not requested.' };
  }
  if (!isSignOffLogged(record)) {
    return {
      allowed: false,
      reason: 'PSD2 SCA sign-off is not logged. Canary traffic stays closed.',
    };
  }
  if (!record?.liveCanaryAuthorized) {
    return {
      allowed: false,
      reason:
        'PAY-152 sign-off is logged as a mandatory gate. Live canary authorization remains closed.',
    };
  }
  return { allowed: true, reason: 'Canary gate open.' };
}
