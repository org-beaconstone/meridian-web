// Domain layer barrel exports
// Meridian banking demo - fictional data only

export type {
  BankState,
  Budget,
  Category,
  IbanValidation,
  PaymentDraft,
  PaymentMethod,
  PaymentRequestPayload,
  PaymentResult,
  ProviderId,
  Recipient,
  Scenario,
  Transaction,
  TransferCorridor,
  Provider,
} from './model';

export {
  DEMO_DATE,
  DEMO_EUR_GBP_RATE,
  EUR_TRANSFER_FEE_CENTS,
  RECIPIENTS,
  PROVIDERS,
  clearingEstimate,
  corridorOf,
  createInitialState,
  createPaymentPayload,
  eurCentsToGbpPence,
  eurTransferQuote,
  executePayment,
  formatIban,
  getProvider,
  isUuidV4,
  money,
  monthlySpent,
  parseAmount,
  updateBudget,
  validateIban,
  validatePayment,
} from './model';

export { STORAGE_KEY, loadState, saveState } from './storage';
export type { LoadStateResult } from './storage';
