// Onboarding identity adapter.
// Verified, explicit rejection, and timeout/unavailable are separate outcomes.
// Timeout/unavailable pauses the journey at step 4 and persists progress.
// Pending, paused, and rejected applications cannot activate or fund an account.

import { persistProgress } from './storage';
import {
  IDENTITY_JOURNEY_STEP,
  isApplicationId,
  isTimestamp,
  type ApplicationStatus,
  type IdentityDisposition,
  type IdentityInterruption,
  type IdentityOutcome,
  type IdentityCheckPort,
  type JourneyStep,
  type OnboardingProgress,
  type ProgressStore,
  MAX_FUNDING_MINOR,
} from './types';

export type DiagnosticEvent =
  | 'identity_checked'
  | 'progress_saved'
  | 'resumed'
  | 'activation_refused'
  | 'activation_completed'
  | 'funding_refused'
  | 'funding_completed';

export type DiagnosticReasonCode =
  | 'none'
  | 'pending'
  | 'paused'
  | 'rejected'
  | 'not_active'
  | 'invalid_amount'
  | 'already_funded'
  | 'already_active'
  | 'wrong_step'
  | 'not_saved';

export interface SafeDiagnostic {
  component: 'onboarding-identity-adapter';
  event: DiagnosticEvent;
  applicationId: string;
  outcome: IdentityOutcome | null;
  interruption: IdentityInterruption | null;
  step: number;
  status: ApplicationStatus;
  activated: boolean;
  fundedMinor: number;
  reasonCode: DiagnosticReasonCode;
}

export const DIAGNOSTIC_KEYS = [
  'component',
  'event',
  'applicationId',
  'outcome',
  'interruption',
  'step',
  'status',
  'activated',
  'fundedMinor',
  'reasonCode',
] as const;

const EVENTS = new Set<DiagnosticEvent>([
  'identity_checked',
  'progress_saved',
  'resumed',
  'activation_refused',
  'activation_completed',
  'funding_refused',
  'funding_completed',
]);

const REASON_CODES = new Set<DiagnosticReasonCode>([
  'none',
  'pending',
  'paused',
  'rejected',
  'not_active',
  'invalid_amount',
  'already_funded',
  'already_active',
  'wrong_step',
  'not_saved',
]);

const OUTCOMES = new Set<IdentityOutcome>([
  'verified',
  'explicit_rejection',
  'timeout_unavailable',
]);
const INTERRUPTIONS = new Set<IdentityInterruption>(['timeout', 'unavailable']);
const STATUSES = new Set<ApplicationStatus>([
  'in_progress',
  'paused_recoverable',
  'rejected',
  'verified_ready',
  'active',
]);

export interface AdapterResult {
  ok: boolean;
  error?: string;
  progress: OnboardingProgress;
  diagnostic: SafeDiagnostic;
  saved: boolean;
}

export interface GateDecision {
  allowed: boolean;
  reason: string;
  reasonCode: DiagnosticReasonCode;
}

function isEvent(value: unknown): value is DiagnosticEvent {
  return typeof value === 'string' && EVENTS.has(value as DiagnosticEvent);
}

function isReasonCode(value: unknown): value is DiagnosticReasonCode {
  return typeof value === 'string' && REASON_CODES.has(value as DiagnosticReasonCode);
}

function isOutcome(value: unknown): value is IdentityOutcome {
  return typeof value === 'string' && OUTCOMES.has(value as IdentityOutcome);
}

function isInterruption(value: unknown): value is IdentityInterruption {
  return typeof value === 'string' && INTERRUPTIONS.has(value as IdentityInterruption);
}

function isStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && STATUSES.has(value as ApplicationStatus);
}

function isStep(value: unknown): value is JourneyStep {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isFundedMinor(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_FUNDING_MINOR
  );
}

/**
 * Copies only the allowlisted diagnostic fields.
 * Identity attributes, provider payloads, personal and account data, tokens, and secrets are dropped.
 */
export function redactDiagnosticRecord(input: Record<string, unknown>): SafeDiagnostic {
  return {
    component: 'onboarding-identity-adapter',
    event: isEvent(input.event) ? input.event : 'identity_checked',
    applicationId:
      typeof input.applicationId === 'string' && isApplicationId(input.applicationId)
        ? input.applicationId
        : 'redacted',
    outcome: isOutcome(input.outcome) ? input.outcome : null,
    interruption: isInterruption(input.interruption) ? input.interruption : null,
    step: isStep(input.step) ? input.step : 0,
    status: isStatus(input.status) ? input.status : 'in_progress',
    activated: input.activated === true,
    fundedMinor: isFundedMinor(input.fundedMinor) ? input.fundedMinor : 0,
    reasonCode: isReasonCode(input.reasonCode) ? input.reasonCode : 'none',
  };
}

function diagnosticFor(
  progress: OnboardingProgress,
  event: DiagnosticEvent,
  reasonCode: DiagnosticReasonCode,
): SafeDiagnostic {
  return redactDiagnosticRecord({
    event,
    applicationId: progress.applicationId,
    outcome: progress.identityOutcome,
    interruption: progress.interruption,
    step: progress.step,
    status: progress.status,
    activated: progress.activated,
    fundedMinor: progress.fundedMinor,
    reasonCode,
  });
}

function clone(progress: OnboardingProgress): OnboardingProgress {
  return { ...progress, completedSteps: [...progress.completedSteps] };
}

function refuse(
  progress: OnboardingProgress,
  error: string,
  event: DiagnosticEvent,
  reasonCode: DiagnosticReasonCode,
): AdapterResult {
  return {
    ok: false,
    error,
    progress,
    diagnostic: diagnosticFor(progress, event, reasonCode),
    saved: false,
  };
}

function commit(
  progress: OnboardingProgress,
  store: ProgressStore,
  event: DiagnosticEvent,
  reasonCode: DiagnosticReasonCode = 'none',
): AdapterResult {
  const saved = persistProgress(store, progress);
  if (!saved) {
    return {
      ok: false,
      error: 'Progress could not be saved',
      progress,
      diagnostic: diagnosticFor(progress, event, 'not_saved'),
      saved: false,
    };
  }
  return {
    ok: true,
    progress,
    diagnostic: diagnosticFor(progress, event, reasonCode),
    saved: true,
  };
}

export function createOnboarding(applicationId: string, now: string): OnboardingProgress | null {
  if (!isApplicationId(applicationId) || !isTimestamp(now)) return null;
  return {
    version: 1,
    applicationId,
    status: 'in_progress',
    step: 1,
    completedSteps: [],
    identityOutcome: null,
    interruption: null,
    activated: false,
    fundedMinor: 0,
    updatedAt: now,
  };
}

export function completeJourneyStep(
  progress: OnboardingProgress,
  step: 1 | 2 | 3,
  now: string,
):
  | { ok: true; progress: OnboardingProgress }
  | { ok: false; error: string; progress: OnboardingProgress } {
  if (!isTimestamp(now)) return { ok: false, error: 'Invalid timestamp', progress };
  if (progress.status !== 'in_progress' || progress.step !== step) {
    return { ok: false, error: 'Complete the current step before continuing', progress };
  }
  const next = clone(progress);
  next.completedSteps = [...progress.completedSteps, step];
  next.step = (step + 1) as JourneyStep;
  next.updatedAt = now;
  return { ok: true, progress: next };
}

function readDisposition(port: IdentityCheckPort, applicationId: string): IdentityDisposition {
  try {
    const result = port.verify({ applicationId });
    const disposition =
      result && typeof result === 'object'
        ? (result as { disposition?: unknown }).disposition
        : undefined;
    if (
      disposition === 'verified' ||
      disposition === 'explicit_rejection' ||
      disposition === 'timeout' ||
      disposition === 'unavailable'
    ) {
      return disposition;
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export function submitIdentityCheck(
  progress: OnboardingProgress,
  port: IdentityCheckPort,
  store: ProgressStore,
  now: string,
): AdapterResult {
  if (!isTimestamp(now))
    return refuse(progress, 'Invalid timestamp', 'identity_checked', 'wrong_step');
  if (progress.status !== 'in_progress' || progress.step !== IDENTITY_JOURNEY_STEP) {
    return refuse(
      progress,
      'Identity verification is only available at step 4',
      'identity_checked',
      'wrong_step',
    );
  }

  const disposition = readDisposition(port, progress.applicationId);
  const next = clone(progress);
  next.updatedAt = now;
  next.activated = false;
  next.fundedMinor = 0;

  if (disposition === 'verified') {
    next.status = 'verified_ready';
    next.step = 5;
    next.completedSteps = [1, 2, 3, 4];
    next.identityOutcome = 'verified';
    next.interruption = null;
    return commit(next, store, 'identity_checked');
  }

  if (disposition === 'explicit_rejection') {
    next.status = 'rejected';
    next.step = IDENTITY_JOURNEY_STEP;
    next.completedSteps = [1, 2, 3];
    next.identityOutcome = 'explicit_rejection';
    next.interruption = null;
    return commit(next, store, 'identity_checked');
  }

  next.status = 'paused_recoverable';
  next.step = IDENTITY_JOURNEY_STEP;
  next.completedSteps = [1, 2, 3];
  next.identityOutcome = 'timeout_unavailable';
  next.interruption = disposition;
  return commit(next, store, 'progress_saved');
}

export function resumePausedOnboarding(
  progress: OnboardingProgress,
  store: ProgressStore,
  now: string,
): AdapterResult {
  if (!isTimestamp(now)) return refuse(progress, 'Invalid timestamp', 'resumed', 'wrong_step');
  if (progress.status !== 'paused_recoverable' || progress.step !== IDENTITY_JOURNEY_STEP) {
    return refuse(progress, 'Only a paused identity check can be resumed', 'resumed', 'wrong_step');
  }
  const next = clone(progress);
  next.status = 'in_progress';
  next.updatedAt = now;
  return commit(next, store, 'resumed');
}

export function activationDecision(progress: OnboardingProgress): GateDecision {
  if (progress.status === 'active' && progress.activated) {
    return { allowed: false, reason: 'Account is already activated', reasonCode: 'already_active' };
  }
  if (progress.identityOutcome === 'explicit_rejection' || progress.status === 'rejected') {
    return {
      allowed: false,
      reason: 'A rejected identity check cannot activate the account',
      reasonCode: 'rejected',
    };
  }
  if (
    progress.identityOutcome === 'timeout_unavailable' ||
    progress.status === 'paused_recoverable'
  ) {
    return {
      allowed: false,
      reason: 'Identity verification is paused, so the account cannot be activated',
      reasonCode: 'paused',
    };
  }
  if (progress.identityOutcome !== 'verified' || progress.status !== 'verified_ready') {
    return {
      allowed: false,
      reason: 'Identity verification is still pending, so the account cannot be activated',
      reasonCode: 'pending',
    };
  }
  return { allowed: true, reason: 'Identity is verified', reasonCode: 'none' };
}

export function fundingDecision(progress: OnboardingProgress): GateDecision {
  if (progress.identityOutcome === 'explicit_rejection' || progress.status === 'rejected') {
    return {
      allowed: false,
      reason: 'A rejected identity check cannot fund the account',
      reasonCode: 'rejected',
    };
  }
  if (
    progress.identityOutcome === 'timeout_unavailable' ||
    progress.status === 'paused_recoverable'
  ) {
    return {
      allowed: false,
      reason: 'Identity verification is paused, so the account cannot be funded',
      reasonCode: 'paused',
    };
  }
  if (progress.identityOutcome !== 'verified') {
    return {
      allowed: false,
      reason: 'Identity verification is still pending, so the account cannot be funded',
      reasonCode: 'pending',
    };
  }
  if (!progress.activated || progress.status !== 'active') {
    return {
      allowed: false,
      reason: 'Activate the account before funding',
      reasonCode: 'not_active',
    };
  }
  if (progress.fundedMinor !== 0) {
    return { allowed: false, reason: 'Account is already funded', reasonCode: 'already_funded' };
  }
  return {
    allowed: true,
    reason: 'Identity is verified and the account is active',
    reasonCode: 'none',
  };
}

export function activateOnboardingAccount(
  progress: OnboardingProgress,
  store: ProgressStore,
  now: string,
): AdapterResult {
  if (!isTimestamp(now))
    return refuse(progress, 'Invalid timestamp', 'activation_refused', 'wrong_step');
  const decision = activationDecision(progress);
  if (!decision.allowed) {
    return refuse(progress, decision.reason, 'activation_refused', decision.reasonCode);
  }
  const next = clone(progress);
  next.status = 'active';
  next.activated = true;
  next.fundedMinor = 0;
  next.updatedAt = now;
  return commit(next, store, 'activation_completed');
}

export function fundOnboardingAccount(
  progress: OnboardingProgress,
  amountMinor: number,
  store: ProgressStore,
  now: string,
): AdapterResult {
  if (!isTimestamp(now))
    return refuse(progress, 'Invalid timestamp', 'funding_refused', 'invalid_amount');
  const decision = fundingDecision(progress);
  if (!decision.allowed)
    return refuse(progress, decision.reason, 'funding_refused', decision.reasonCode);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > MAX_FUNDING_MINOR) {
    return refuse(
      progress,
      'Enter a funding amount in minor units greater than zero',
      'funding_refused',
      'invalid_amount',
    );
  }
  const next = clone(progress);
  next.fundedMinor = amountMinor;
  next.updatedAt = now;
  return commit(next, store, 'funding_completed');
}
