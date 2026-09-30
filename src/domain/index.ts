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

export {
  BATTLE_CARD_CITATION,
  CASE_STUDIES,
  COMPETITOR_DEFAULTS,
  IMPORT_COST_PER_BOARD_CENTS,
  calculateDisplacement,
  formatUsd,
  parseDisplacement,
} from './roi';
export type { CaseStudy, CompetitorId, DisplacementInput, DisplacementResult } from './roi';

export { STORAGE_KEY, loadState, saveState } from './storage';
export type { LoadStateResult } from './storage';
