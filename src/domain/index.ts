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
  FallbackRecord,
  HandoffNotification,
  HandoffOptions,
  HandoffResult,
  ImplementationContact,
  ImplementationSchedule,
  NoticeAudience,
  NoticeDelivery,
  OnboardingCase,
  OnboardingStage,
  SecurityApproval,
  SecurityChecklistId,
  SecurityChecklistItem,
  SecuritySignOff,
} from './onboarding';
export {
  FALLBACK_POLICY,
  ONBOARDING_PLAN_REF,
  ONBOARDING_PLAN_VERSION,
  PRODUCT_OPERATIONS_CHANNEL,
  PRODUCT_OPERATIONS_LABEL,
  REHEARSAL_SIGNOFF_AT,
  SECURITY_APPROVER_ROLE,
  SECURITY_CHECKLIST,
  addBusinessDays,
  addBusinessHours,
  approveSecurityChecklist,
  createSeedCase,
  formatPlanDate,
  formatPlanInstant,
} from './onboarding';
