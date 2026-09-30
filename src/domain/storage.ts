import { z } from 'zod';
import type { BankState } from './model';
import {
  createInitialState,
  eurCentsToGbpPence,
  getProvider,
  isCalendarDate,
  RECIPIENTS,
} from './model';
import { validateIban } from './iban';

export const STORAGE_KEY = 'meridian_bank_state';
const CategorySchema = z.enum(['Shopping', 'Food & drink', 'Transport', 'Bills', 'Lifestyle']);
const MinorUnits = z.number().int().safe().nonnegative();
const TransactionSchema = z
  .object({
    id: z.string().trim().min(1),
    reference: z.string().min(1),
    recipientId: z.string().min(1),
    name: z.string().min(1),
    category: CategorySchema,
    amount: MinorUnits.positive().max(1000000),
    date: z.string().refine(isCalendarDate, 'Invalid calendar date'),
    provider: z.enum(['adyen', 'worldpay']),
    method: z.enum(['card', 'bank']),
    status: z.enum(['completed', 'declined']),
    note: z.string().max(200),
    corridor: z.enum(['uk-faster-payments', 'us-domestic', 'eur-sepa']).optional(),
    iban: z.string().optional(),
    settlementAmount: z.number().int().safe().positive().max(1000000).optional(),
    settlementCurrency: z.literal('EUR').optional(),
  })
  .strict()
  .refine((transaction) => {
    if (getProvider(transaction.method).id !== transaction.provider) return false;
    if (transaction.corridor === 'eur-sepa') {
      const iban = transaction.iban ? validateIban(transaction.iban) : { status: 'empty' as const };
      return (
        transaction.method === 'bank' &&
        transaction.category === 'Bills' &&
        iban.status === 'valid' &&
        iban.iban === transaction.iban &&
        transaction.settlementCurrency === 'EUR' &&
        transaction.settlementAmount !== undefined &&
        transaction.amount === eurCentsToGbpPence(transaction.settlementAmount) &&
        transaction.recipientId === `eur-${transaction.iban}` &&
        transaction.name.trim().length >= 2
      );
    }
    if (transaction.iban || transaction.settlementAmount || transaction.settlementCurrency)
      return false;
    const recipient = RECIPIENTS.find((item) => item.id === transaction.recipientId);
    return recipient?.name === transaction.name && recipient.category === transaction.category;
  }, 'Inconsistent recipient or provider');
const BudgetSchema = z
  .object({ category: CategorySchema, limit: MinorUnits.positive().max(1000000) })
  .strict();
export const BankStateSchema = z
  .object({
    version: z.literal(1),
    balance: MinorUnits,
    transactions: z
      .array(TransactionSchema)
      .refine(
        (transactions) => new Set(transactions.map((item) => item.id)).size === transactions.length,
        'Duplicate transaction ID',
      ),
    budgets: z
      .array(BudgetSchema)
      .length(5)
      .refine(
        (budgets) => new Set(budgets.map((item) => item.category)).size === 5,
        'Each category must appear once',
      ),
  })
  .strict();

export interface LoadStateResult {
  state: BankState;
  warning: string | null;
}
export function loadState(): LoadStateResult {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { state: createInitialState(), warning: null };
    let data: unknown;
    try {
      data = JSON.parse(stored);
    } catch {
      return { state: createInitialState(), warning: 'Corrupted state JSON, loaded fresh data' };
    }
    const result = BankStateSchema.safeParse(data);
    if (!result.success)
      return { state: createInitialState(), warning: 'Invalid state schema, loaded fresh data' };
    return { state: result.data, warning: null };
  } catch {
    return { state: createInitialState(), warning: 'Failed to load state, loaded fresh data' };
  }
}

export function saveState(state: BankState): boolean {
  try {
    const result = BankStateSchema.safeParse(state);
    if (!result.success) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
    return true;
  } catch {
    return false;
  }
}
