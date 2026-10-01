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
  CaseStudy,
  CaseStudyMotion,
  CompetitorDefault,
  CompetitorId,
  DisplacementFields,
  DisplacementInput,
  DisplacementResult,
  ParsedDisplacement,
} from './roi';
export {
  BATTLE_CARD_CITATION,
  CASE_STUDIES,
  COMPETITOR_DEFAULTS,
  IMPORT_COST_PER_BOARD_CENTS,
  PUBLISHED_LIST_PRICES,
  SALES_PLAYBOOK_RULE,
  SALESFORCE_OUT_OF_SCOPE,
  calculateDisplacement,
  formatUsd,
  isCompetitorId,
  parseDisplacement,
  usdInputFromCents,
  whiteboardDisplacementStudy,
} from './roi';
