// Domain layer barrel exports
// Meridian banking demo - fictional data only

export type {
  BankState,
  Budget,
  Category,
  CurrencyCode,
  PaymentDraft,
  PaymentMethod,
  PaymentResult,
  ProviderId,
  Recipient,
  Scenario,
  Transaction,
  Provider,
} from './model';

export type {
  EuropeanMethodId,
  EuropeanPaymentPlan,
  EuropeanPlanDraft,
  EuropeanPlanStore,
} from './european-plans';

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

export {
  EUROPEAN_METHODS,
  EUROPEAN_PLANS_KEY,
  addEuropeanPlan,
  europeanMethod,
  loadEuropeanPlans,
  payeeError,
  saveEuropeanPlans,
  settleEuropeanPlan,
  validateEuropeanPlan,
} from './european-plans';

export { STORAGE_KEY, loadState, saveState } from './storage';
export type { LoadStateResult } from './storage';
