// Domain layer barrel exports
// Meridian banking demo - fictional data only

export type {
  BankState,
  Budget,
  Category,
  PaymentDraft,
  PaymentMethod,
  PaymentResult,
  ProviderId,
  Recipient,
  Scenario,
  Transaction,
  Provider,
} from './model';

export {
  DEMO_DATE,
  RECIPIENTS,
  PROVIDERS,
  createInitialState,
  executePayment,
  getProvider,
  money,
  monthlySpent,
  parseAmount,
  updateBudget,
  validatePayment,
} from './model';

export { STORAGE_KEY, loadState, saveState } from './storage';
export type { LoadStateResult } from './storage';

export type {
  ActivationResult,
  DiagnosticOutcome,
  DiagnosticReason,
  DiagnosticSink,
  IdentityCheckResult,
  IdentityDiagnostic,
  IdentityOutcome,
  IdentityProvider,
  IdentityProviderResult,
  IdentityScenario,
  IdentityStatus,
  OnboardingProgress,
  OnboardingScope,
  OnboardingStore,
  PauseReason,
  ResumePath,
  ResumeResult,
} from './identity-adapter';

export {
  IDENTITY_DIAGNOSTIC_FIELDS,
  IDENTITY_JOURNEY_STEP,
  ONBOARDING_STORAGE_KEY,
  PERSONAL_CURRENT_ACCOUNT,
  accountMayBeFunded,
  activateAndFund,
  applyIdentityResult,
  browserOnboardingStore,
  createIdentityCheckpoint,
  createMemoryOnboardingStore,
  createSimulatedIdentityProvider,
  redactDiagnostic,
  resumeOnboarding,
  runIdentityCheck,
} from './identity-adapter';
