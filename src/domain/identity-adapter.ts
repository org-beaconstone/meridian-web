// Onboarding identity adapter
// Fictional simulation only. This is not a payment provider and it does not collect real identity documents.

import { z } from 'zod';
import { isCalendarDate } from './model';

export const IDENTITY_JOURNEY_STEP = 4 as const;
export const ONBOARDING_STORAGE_KEY = 'meridian_onboarding_progress';
export const PERSONAL_CURRENT_ACCOUNT = 'personal-current-account' as const;

export type OnboardingScope = typeof PERSONAL_CURRENT_ACCOUNT;
export type IdentityStatus = 'pending' | 'verified' | 'rejected' | 'unavailable';
export type IdentityOutcome = 'verified' | 'rejected' | 'timeout_unavailable';
export type PauseReason = 'timeout' | 'unavailable';
export type IdentityScenario = 'verified' | 'rejected' | 'timeout' | 'unavailable';

export interface OnboardingProgress {
  version: 1;
  applicationRef: string;
  scope: OnboardingScope;
  journeyStep: number;
  completedSteps: [1, 2, 3];
  identityStatus: IdentityStatus;
  pause: null | {
    recoverable: true;
    reason: PauseReason;
    savedAt: string;
  };
  account: {
    phase: 'inactive' | 'active';
    fundedMinorUnits: number;
  };
}

export interface ResumePath {
  scope: OnboardingScope;
  journeyStep: typeof IDENTITY_JOURNEY_STEP;
  applicationRef: string;
}

/** Provider port. The adapter never stores or records `providerPayload`. */
export interface IdentityProviderResult {
  status: 'verified' | 'rejected' | 'timeout' | 'unavailable';
  providerPayload?: unknown;
}

export interface IdentityProvider {
  verify(request: { applicationRef: string }): IdentityProviderResult;
}

export interface OnboardingStore {
  save(progress: OnboardingProgress): boolean;
  load(applicationRef: string): OnboardingProgress | null;
}

export const IDENTITY_DIAGNOSTIC_FIELDS = [
  'component',
  'applicationRef',
  'scope',
  'journeyStep',
  'outcome',
  'reasonCode',
] as const;

const DIAGNOSTIC_OUTCOMES = [
  'verified',
  'rejected',
  'timeout_unavailable',
  'resumed',
  'activation_refused',
  'activated',
] as const;
const REASON_CODES = [
  'verified',
  'explicit_rejection',
  'timeout',
  'unavailable',
  'pending',
  'not_verified',
  'resumed',
] as const;

export type DiagnosticOutcome = (typeof DIAGNOSTIC_OUTCOMES)[number];
export type DiagnosticReason = (typeof REASON_CODES)[number];

export interface IdentityDiagnostic {
  component: 'identity-adapter';
  applicationRef: string;
  scope: OnboardingScope;
  journeyStep: number;
  outcome: DiagnosticOutcome;
  reasonCode: DiagnosticReason;
}

export type DiagnosticSink = (diagnostic: IdentityDiagnostic) => void;

export type IdentityCheckResult =
  | {
      ok: true;
      outcome: 'verified' | 'rejected';
      progress: OnboardingProgress;
      persisted: true;
      diagnostic: IdentityDiagnostic;
    }
  | {
      ok: true;
      outcome: 'timeout_unavailable';
      progress: OnboardingProgress;
      persisted: true;
      resume: ResumePath;
      diagnostic: IdentityDiagnostic;
    }
  | {
      ok: false;
      error: string;
      persisted: false;
      progress: OnboardingProgress | null;
    };

export type ResumeResult =
  | {
      ok: true;
      progress: OnboardingProgress;
      resume: ResumePath;
      diagnostic: IdentityDiagnostic;
    }
  | { ok: false; error: string; progress: OnboardingProgress | null };

export type ActivationResult =
  | { ok: true; progress: OnboardingProgress; diagnostic: IdentityDiagnostic }
  | { ok: false; error: string; progress: OnboardingProgress | null };

const APPLICATION_REF = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
const MAX_OPENING_FUNDS = 1_000_000;

export function isApplicationRef(value: string): boolean {
  return APPLICATION_REF.test(value);
}

/** Accept a calendar date or an ISO timestamp with an explicit timezone. */
export function isRecordedInstant(value: string): boolean {
  const datePart = value.split('T')[0];
  const timestampValid =
    value === datePart ||
    (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      Number.isFinite(Date.parse(value)));
  return isCalendarDate(datePart) && timestampValid;
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

const PauseSchema = z
  .object({
    recoverable: z.literal(true),
    reason: z.enum(['timeout', 'unavailable']),
    savedAt: z.string().refine(isRecordedInstant, 'Invalid timestamp'),
  })
  .strict();

const AccountSchema = z
  .object({
    phase: z.enum(['inactive', 'active']),
    fundedMinorUnits: z.number().int().safe().nonnegative().max(MAX_OPENING_FUNDS),
  })
  .strict();

export const OnboardingProgressSchema = z
  .object({
    version: z.literal(1),
    applicationRef: z.string().regex(APPLICATION_REF),
    scope: z.literal(PERSONAL_CURRENT_ACCOUNT),
    journeyStep: z.number().int(),
    completedSteps: z.tuple([z.literal(1), z.literal(2), z.literal(3)]),
    identityStatus: z.enum(['pending', 'verified', 'rejected', 'unavailable']),
    pause: PauseSchema.nullable(),
    account: AccountSchema,
  })
  .strict()
  .superRefine((progress, ctx) => {
    const inactive = progress.account.phase === 'inactive';
    if (inactive && progress.account.fundedMinorUnits !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Inactive accounts cannot hold funds',
        path: ['account', 'fundedMinorUnits'],
      });
    }
    if (progress.account.phase === 'active') {
      if (
        progress.identityStatus !== 'verified' ||
        progress.pause !== null ||
        progress.journeyStep !== 5
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Only a verified identity can be active',
          path: ['account', 'phase'],
        });
      }
      return;
    }
    if (progress.journeyStep !== IDENTITY_JOURNEY_STEP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Identity progress stays on journey step 4 until activation',
        path: ['journeyStep'],
      });
    }
    if (progress.identityStatus === 'unavailable') {
      if (!progress.pause) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unavailable identity requires a recoverable pause',
          path: ['pause'],
        });
      }
      return;
    }
    if (progress.pause) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only unavailable identity can be paused',
        path: ['pause'],
      });
    }
  });

function parseProgress(progress: unknown): OnboardingProgress | null {
  const parsed = OnboardingProgressSchema.safeParse(progress);
  return parsed.success ? parsed.data : null;
}

export function createIdentityCheckpoint(
  applicationRef: string,
  scope: string,
): { ok: true; progress: OnboardingProgress } | { ok: false; error: string } {
  if (!isApplicationRef(applicationRef)) {
    return { ok: false, error: 'Application reference must be an opaque id' };
  }
  if (scope !== PERSONAL_CURRENT_ACCOUNT) {
    return { ok: false, error: 'Unknown onboarding scope' };
  }
  return {
    ok: true,
    progress: {
      version: 1,
      applicationRef,
      scope,
      journeyStep: IDENTITY_JOURNEY_STEP,
      completedSteps: [1, 2, 3],
      identityStatus: 'pending',
      pause: null,
      account: { phase: 'inactive', fundedMinorUnits: 0 },
    },
  };
}

/**
 * Copy only the allowlisted diagnostic fields.
 * Identity attributes, provider payloads, personal and account data, tokens and secrets are dropped.
 * Invalid allowlisted values fail closed and return null instead of echoing the input.
 */
export function redactDiagnostic(input: unknown): IdentityDiagnostic | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  if (source.component !== 'identity-adapter') return null;
  if (typeof source.applicationRef !== 'string' || !isApplicationRef(source.applicationRef)) {
    return null;
  }
  if (source.scope !== PERSONAL_CURRENT_ACCOUNT) return null;
  if (
    typeof source.journeyStep !== 'number' ||
    !Number.isSafeInteger(source.journeyStep) ||
    source.journeyStep < 1 ||
    source.journeyStep > 5
  ) {
    return null;
  }
  if (!isOneOf(DIAGNOSTIC_OUTCOMES, source.outcome)) return null;
  if (!isOneOf(REASON_CODES, source.reasonCode)) return null;
  return {
    component: 'identity-adapter',
    applicationRef: source.applicationRef,
    scope: source.scope,
    journeyStep: source.journeyStep,
    outcome: source.outcome,
    reasonCode: source.reasonCode,
  };
}

function diagnosticFor(
  progress: OnboardingProgress,
  outcome: DiagnosticOutcome,
  reasonCode: DiagnosticReason,
): IdentityDiagnostic | null {
  return redactDiagnostic({
    component: 'identity-adapter',
    applicationRef: progress.applicationRef,
    scope: progress.scope,
    journeyStep: progress.journeyStep,
    outcome,
    reasonCode,
  });
}

export function createMemoryOnboardingStore(): OnboardingStore {
  const records = new Map<string, OnboardingProgress>();
  return {
    save(progress) {
      const parsed = parseProgress(progress);
      if (!parsed) return false;
      records.set(parsed.applicationRef, structuredClone(parsed));
      return true;
    },
    load(applicationRef) {
      const found = records.get(applicationRef);
      return found ? structuredClone(found) : null;
    },
  };
}

function readStoredApplications(): Map<string, OnboardingProgress> {
  const records = new Map<string, OnboardingProgress>();
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return records;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return records;
    for (const [key, value] of Object.entries(data)) {
      const parsed = parseProgress(value);
      if (parsed?.applicationRef === key) records.set(key, parsed);
    }
    return records;
  } catch {
    return records;
  }
}

function writeStoredApplications(records: Map<string, OnboardingProgress>): boolean {
  try {
    const body: Record<string, OnboardingProgress> = {};
    for (const [key, value] of records) body[key] = value;
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(body));
    return true;
  } catch {
    return false;
  }
}

export function browserOnboardingStore(): OnboardingStore {
  return {
    save(progress) {
      const parsed = parseProgress(progress);
      if (!parsed) return false;
      const records = readStoredApplications();
      records.set(parsed.applicationRef, parsed);
      return writeStoredApplications(records);
    },
    load(applicationRef) {
      if (!isApplicationRef(applicationRef)) return null;
      return readStoredApplications().get(applicationRef) ?? null;
    },
  };
}

type ProviderStatus = IdentityProviderResult['status'];

function readProviderStatus(result: unknown): ProviderStatus {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return 'unavailable';
  const status = (result as { status?: unknown }).status;
  if (
    status === 'verified' ||
    status === 'rejected' ||
    status === 'timeout' ||
    status === 'unavailable'
  ) {
    return status;
  }
  // A malformed body is not an explicit rejection and it is not a verification.
  return 'unavailable';
}

function reasonFor(status: ProviderStatus): DiagnosticReason {
  if (status === 'verified') return 'verified';
  if (status === 'rejected') return 'explicit_rejection';
  if (status === 'timeout') return 'timeout';
  return 'unavailable';
}

function outcomeFor(status: ProviderStatus): IdentityOutcome {
  if (status === 'verified') return 'verified';
  if (status === 'rejected') return 'rejected';
  return 'timeout_unavailable';
}

function resumePath(progress: OnboardingProgress): ResumePath {
  return {
    scope: progress.scope,
    journeyStep: IDENTITY_JOURNEY_STEP,
    applicationRef: progress.applicationRef,
  };
}

function unchangedAccount(): OnboardingProgress['account'] {
  return { phase: 'inactive', fundedMinorUnits: 0 };
}

interface Decision {
  progress: OnboardingProgress;
  outcome: IdentityOutcome;
  reasonCode: DiagnosticReason;
  resume?: ResumePath;
}

function decide(
  progress: OnboardingProgress,
  status: ProviderStatus,
  now: string,
): Decision | string {
  if (!isRecordedInstant(now)) return 'Invalid timestamp';
  const outcome = outcomeFor(status);
  const reasonCode = reasonFor(status);
  if (progress.identityStatus === 'verified' || progress.identityStatus === 'rejected') {
    const same =
      (progress.identityStatus === 'verified' && outcome === 'verified') ||
      (progress.identityStatus === 'rejected' && outcome === 'rejected');
    if (!same) return 'Identity outcome is already final';
    return { progress, outcome, reasonCode };
  }

  if (outcome === 'verified' || outcome === 'rejected') {
    const next: OnboardingProgress = {
      ...progress,
      identityStatus: outcome === 'verified' ? 'verified' : 'rejected',
      pause: null,
      journeyStep: IDENTITY_JOURNEY_STEP,
      account: unchangedAccount(),
    };
    return { progress: next, outcome, reasonCode };
  }

  const next: OnboardingProgress = {
    ...progress,
    identityStatus: 'unavailable',
    journeyStep: IDENTITY_JOURNEY_STEP,
    pause: {
      recoverable: true,
      reason: status === 'timeout' ? 'timeout' : 'unavailable',
      savedAt: now,
    },
    account: unchangedAccount(),
  };
  return { progress: next, outcome, reasonCode, resume: resumePath(next) };
}

function savedOrError(
  decision: Decision,
  diagnostic: IdentityDiagnostic,
  store: OnboardingStore,
  sink?: DiagnosticSink,
): string | null {
  if (!store.save(decision.progress)) return 'Onboarding progress could not be saved';
  sink?.(diagnostic);
  return null;
}

function finishCheck(
  decision: Decision,
  store: OnboardingStore,
  sink?: DiagnosticSink,
): IdentityCheckResult {
  const diagnostic = diagnosticFor(decision.progress, decision.outcome, decision.reasonCode);
  if (!diagnostic) {
    return {
      ok: false,
      error: 'Diagnostic could not be recorded safely',
      persisted: false,
      progress: decision.progress,
    };
  }
  if (decision.outcome === 'timeout_unavailable') {
    if (!decision.resume) {
      return {
        ok: false,
        error: 'Recoverable pause is missing a resume path',
        persisted: false,
        progress: decision.progress,
      };
    }
    const saveError = savedOrError(decision, diagnostic, store, sink);
    if (saveError) {
      return { ok: false, error: saveError, persisted: false, progress: decision.progress };
    }
    return {
      ok: true,
      outcome: 'timeout_unavailable',
      progress: decision.progress,
      persisted: true,
      resume: decision.resume,
      diagnostic,
    };
  }
  const saveError = savedOrError(decision, diagnostic, store, sink);
  if (saveError) {
    return { ok: false, error: saveError, persisted: false, progress: decision.progress };
  }
  return {
    ok: true,
    outcome: decision.outcome,
    progress: decision.progress,
    persisted: true,
    diagnostic,
  };
}

/**
 * Apply one identity result.
 * Verified, explicit rejection, and timeout/unavailable stay distinct.
 * Timeout and unavailability pause on journey step 4 and persist that progress.
 */
export function applyIdentityResult(
  progress: OnboardingProgress,
  result: IdentityProviderResult,
  store: OnboardingStore,
  now: string,
  sink?: DiagnosticSink,
): IdentityCheckResult {
  const parsed = parseProgress(progress);
  if (!parsed) {
    return {
      ok: false,
      error: 'Invalid onboarding progress',
      persisted: false,
      progress: null,
    };
  }
  const decision = decide(parsed, readProviderStatus(result), now);
  if (typeof decision === 'string') {
    return { ok: false, error: decision, persisted: false, progress: parsed };
  }
  return finishCheck(decision, store, sink);
}

/**
 * Call the provider port, then apply its result.
 * Thrown provider errors are treated as unavailable, and the error text is discarded.
 */
export function runIdentityCheck(
  progress: OnboardingProgress,
  provider: IdentityProvider,
  store: OnboardingStore,
  now: string,
  sink?: DiagnosticSink,
): IdentityCheckResult {
  const parsed = parseProgress(progress);
  if (!parsed) {
    return {
      ok: false,
      error: 'Invalid onboarding progress',
      persisted: false,
      progress: null,
    };
  }
  let result: IdentityProviderResult;
  try {
    result = provider.verify({ applicationRef: parsed.applicationRef });
  } catch {
    result = { status: 'unavailable' };
  }
  return applyIdentityResult(parsed, result, store, now, sink);
}

/** Resume a saved timeout/unavailable pause at the same scope and journey step 4. */
export function resumeOnboarding(
  store: OnboardingStore,
  applicationRef: string,
  sink?: DiagnosticSink,
): ResumeResult {
  if (!isApplicationRef(applicationRef)) {
    return { ok: false, error: 'Application reference must be an opaque id', progress: null };
  }
  const loaded = store.load(applicationRef);
  const parsed = loaded ? parseProgress(loaded) : null;
  if (!parsed) {
    return { ok: false, error: 'No recoverable onboarding pause exists', progress: null };
  }
  if (parsed.identityStatus === 'rejected') {
    return { ok: false, error: 'Rejected identity cannot be resumed', progress: parsed };
  }
  if (
    parsed.identityStatus === 'pending' &&
    parsed.journeyStep === IDENTITY_JOURNEY_STEP &&
    !parsed.pause
  ) {
    const diagnostic = diagnosticFor(parsed, 'resumed', 'resumed');
    if (!diagnostic) {
      return { ok: false, error: 'Diagnostic could not be recorded safely', progress: parsed };
    }
    sink?.(diagnostic);
    return { ok: true, progress: parsed, resume: resumePath(parsed), diagnostic };
  }
  if (!parsed.pause || parsed.identityStatus !== 'unavailable') {
    return { ok: false, error: 'No recoverable onboarding pause exists', progress: parsed };
  }
  const resumed: OnboardingProgress = {
    ...parsed,
    identityStatus: 'pending',
    pause: null,
    journeyStep: IDENTITY_JOURNEY_STEP,
    account: unchangedAccount(),
  };
  const diagnostic = diagnosticFor(resumed, 'resumed', 'resumed');
  if (!diagnostic) {
    return { ok: false, error: 'Diagnostic could not be recorded safely', progress: parsed };
  }
  if (!store.save(resumed)) {
    return { ok: false, error: 'Onboarding progress could not be saved', progress: parsed };
  }
  sink?.(diagnostic);
  return { ok: true, progress: resumed, resume: resumePath(resumed), diagnostic };
}

export function accountMayBeFunded(progress: OnboardingProgress): boolean {
  const parsed = parseProgress(progress);
  if (!parsed) return false;
  return parsed.identityStatus === 'verified' && parsed.pause === null;
}

function activationRefusal(
  progress: OnboardingProgress,
): { error: string; reasonCode: DiagnosticReason } | null {
  if (progress.identityStatus === 'pending') {
    return { error: 'Pending identity cannot activate or fund the account', reasonCode: 'pending' };
  }
  if (progress.identityStatus === 'unavailable' || progress.pause) {
    return {
      error: 'Unavailable identity cannot activate or fund the account',
      reasonCode: 'unavailable',
    };
  }
  if (progress.identityStatus === 'rejected') {
    return {
      error: 'Rejected identity cannot activate or fund the account',
      reasonCode: 'explicit_rejection',
    };
  }
  return null;
}

function openingFundsError(amount: number): string | null {
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0) {
    return 'Opening funding must be a whole number of minor units';
  }
  if (amount > MAX_OPENING_FUNDS) return 'Opening funding cannot exceed £10,000';
  return null;
}

/**
 * Activate and optionally fund only after a verified identity.
 * Pending, unavailable and rejected identities keep the account inactive and unfunded.
 */
export function activateAndFund(
  progress: OnboardingProgress,
  openingFundingMinor: number,
  store: OnboardingStore,
  sink?: DiagnosticSink,
): ActivationResult {
  const parsed = parseProgress(progress);
  if (!parsed) {
    return { ok: false, error: 'Invalid onboarding progress', progress: null };
  }
  const refusal = activationRefusal(parsed);
  if (refusal) {
    const diagnostic = diagnosticFor(parsed, 'activation_refused', refusal.reasonCode);
    if (diagnostic) sink?.(diagnostic);
    return { ok: false, error: refusal.error, progress: parsed };
  }
  const amountError = openingFundsError(openingFundingMinor);
  if (amountError) return { ok: false, error: amountError, progress: parsed };
  if (parsed.account.phase === 'active') {
    if (parsed.account.fundedMinorUnits !== openingFundingMinor) {
      return {
        ok: false,
        error: 'Account is already active with a different amount',
        progress: parsed,
      };
    }
    const diagnostic = diagnosticFor(parsed, 'activated', 'verified');
    if (!diagnostic) {
      return { ok: false, error: 'Diagnostic could not be recorded safely', progress: parsed };
    }
    sink?.(diagnostic);
    return { ok: true, progress: parsed, diagnostic };
  }
  const activated: OnboardingProgress = {
    ...parsed,
    journeyStep: 5,
    pause: null,
    identityStatus: 'verified',
    account: { phase: 'active', fundedMinorUnits: openingFundingMinor },
  };
  const diagnostic = diagnosticFor(activated, 'activated', 'verified');
  if (!diagnostic) {
    return { ok: false, error: 'Diagnostic could not be recorded safely', progress: parsed };
  }
  if (!store.save(activated)) {
    return { ok: false, error: 'Onboarding progress could not be saved', progress: parsed };
  }
  sink?.(diagnostic);
  return { ok: true, progress: activated, diagnostic };
}

const SIMULATED_PROVIDER_BODY = {
  documentNumber: 'DOC-554433',
  givenName: 'Avery Quinn',
  dateOfBirth: '1991-07-14',
  email: 'avery.quinn@example.com',
  address: '1 Harbour Lane',
  accountNumber: 'acct-10293847',
  sortCode: 'sort-11-22-33',
  accessToken: 'tok_live_identity',
  clientSecret: 'super-secret-value',
  providerPayload: 'provider-payload-marker',
};

/** Local identity simulation. The payload is intentionally hostile and must not leave the provider result. */
export function createSimulatedIdentityProvider(scenario: IdentityScenario): IdentityProvider {
  const known: readonly IdentityScenario[] = ['verified', 'rejected', 'timeout', 'unavailable'];
  const status: ProviderStatus = known.includes(scenario) ? scenario : 'unavailable';
  return {
    verify(request) {
      if (!isApplicationRef(request.applicationRef)) {
        return { status: 'unavailable', providerPayload: SIMULATED_PROVIDER_BODY };
      }
      return { status, providerPayload: SIMULATED_PROVIDER_BODY };
    },
  };
}
