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

export { IDENTITY_JOURNEY_STEP, JOURNEY } from './identity/types';
export type { IdentityDisposition, IdentityOutcome, OnboardingProgress } from './identity/types';
export {
  activateOnboardingAccount,
  activationDecision,
  completeJourneyStep,
  createOnboarding,
  fundOnboardingAccount,
  fundingDecision,
  redactDiagnosticRecord,
  resumePausedOnboarding,
  submitIdentityCheck,
} from './identity/adapter';
export {
  ONBOARDING_STORAGE_KEY,
  clearOnboarding,
  loadOnboarding,
  persistProgress,
} from './identity/storage';
export { createSimulatedIdentityPort } from './identity/simulation';
