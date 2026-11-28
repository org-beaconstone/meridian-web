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

export {
  EXPLICIT_REJECTION_APPLICANT_MESSAGE,
  IDENTITY_VERIFICATION_RESULTS,
  PAUSED_APPLICANT_MESSAGE,
  VERIFIED_APPLICANT_MESSAGE,
  isIdentityVerificationResult,
  selectApplicantIdentityMessage,
} from './identity-messaging';
export type {
  ApplicantIdentityMessage,
  ApplicantIdentityOutcome,
  IdentityVerificationResult,
} from './identity-messaging';
