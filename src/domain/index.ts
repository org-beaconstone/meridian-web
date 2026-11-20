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
  IDENTITY_SLICE,
  IDENTITY_SLICE_TEAM,
  IDENTITY_SLICE_WORK_ITEM,
  IDENTITY_WORKFLOW,
  LATER_THREADS,
  evaluateRelease,
  formatSliceDate,
  releaseHeadline,
  requestSavingsOpening,
  requestThread,
  traceSummary,
} from './identity-slice';
export type {
  IdentitySliceRecord,
  ReleaseAssessment,
  SliceCheck,
  SliceDecision,
  SliceObjective,
  SliceRisk,
} from './identity-slice';
