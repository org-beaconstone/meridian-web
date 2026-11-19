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
  GateRefusal,
  IdentityCapture,
  IdentityCode,
  IdentityDecision,
  IdentityLogRecord,
  VerificationOutcome,
} from './identity';
export {
  IDENTITY_INTEGRATION,
  acceptInitialFunding,
  acknowledgeContract,
  activateSavingsAccount,
  consentError,
  identityLogRecord,
  submitIdentity,
  validateIdentityCapture,
  writeIdentityLog,
} from './identity';
