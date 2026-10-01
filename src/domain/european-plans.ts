// Draft European payment plans for the Meridian rehearsal.
// Schemes are named. No provider is selected, and drafts never move money.

import { z } from 'zod';
import { DEMO_DATE, parseAmount, type BankState, type CurrencyCode } from './model';

export const EUROPEAN_PLANS_KEY = 'meridian_european_plans';
export const MAX_EUROPEAN_PLANS = 20;

export const EUROPEAN_METHODS = [
  {
    id: 'sepa-credit',
    name: 'SEPA Credit Transfer',
    market: 'Euro area',
    timing: 'Next business day',
  },
  {
    id: 'sepa-instant',
    name: 'SEPA Instant',
    market: 'Euro area',
    timing: 'Within seconds when both banks are reachable',
  },
  {
    id: 'ideal',
    name: 'iDEAL',
    market: 'Netherlands',
    timing: 'Immediate bank confirmation',
  },
  {
    id: 'bancontact',
    name: 'Bancontact',
    market: 'Belgium',
    timing: 'Immediate card or bank confirmation',
  },
  {
    id: 'cartes-bancaires',
    name: 'Cartes Bancaires',
    market: 'France',
    timing: 'Card authorisation',
  },
] as const;

export type EuropeanMethodId = (typeof EUROPEAN_METHODS)[number]['id'];

export interface EuropeanPlanDraft {
  methodId: string;
  amount: string;
  payee: string;
  note: string;
}

export interface EuropeanPaymentPlan {
  id: string;
  methodId: EuropeanMethodId;
  amountCents: number;
  payee: string;
  note: string;
  createdOn: typeof DEMO_DATE;
  status: 'draft';
}

export interface EuropeanPlanStore {
  plans: EuropeanPaymentPlan[];
  warning: string | null;
}

const currency: CurrencyCode = 'EUR';

export function europeanMethod(id: EuropeanMethodId) {
  const method = EUROPEAN_METHODS.find((item) => item.id === id);
  if (!method) throw new Error(`Unknown European method: ${id}`);
  return method;
}

export function payeeError(payee: string): string | null {
  const trimmed = payee.trim();
  if (!trimmed) return 'Payee name is required';
  if (trimmed.length > 80) return 'Payee name is too long (max 80 characters)';
  const compact = trimmed.replace(/\s+/g, '');
  if (/^[A-Za-z]{2}\d{2}[A-Za-z0-9]{10,}$/.test(compact)) {
    return 'Enter a payee name. Account numbers are not collected on a plan.';
  }
  if (/\d{12,}/.test(compact)) {
    return 'Enter a payee name, not a card or account number.';
  }
  return null;
}

export function validateEuropeanPlan(draft: EuropeanPlanDraft): string[] {
  const errors: string[] = [];
  const payee = payeeError(draft.payee);
  if (payee) errors.push(payee);

  const [, amountError] = parseAmount(draft.amount, currency);
  if (amountError) errors.push(amountError);

  if (!EUROPEAN_METHODS.some((method) => method.id === draft.methodId)) {
    errors.push('Choose a European payment method');
  }

  if (draft.note.trim().length > 200) {
    errors.push('Note is too long (max 200 characters)');
  }

  return errors;
}

function samePayload(plan: EuropeanPaymentPlan, draft: EuropeanPlanDraft, amountCents: number) {
  return (
    plan.methodId === draft.methodId &&
    plan.amountCents === amountCents &&
    plan.payee === draft.payee.trim() &&
    plan.note === draft.note.trim()
  );
}

/**
 * Record a draft plan. Same id and payload is idempotent. Nothing is debited.
 */
export function addEuropeanPlan(
  plans: EuropeanPaymentPlan[],
  draft: EuropeanPlanDraft,
  id: string,
):
  | { ok: true; plans: EuropeanPaymentPlan[]; plan: EuropeanPaymentPlan }
  | { ok: false; error: string } {
  if (!id.trim()) return { ok: false, error: 'Plan ID is required' };

  const errors = validateEuropeanPlan(draft);
  if (errors.length > 0) return { ok: false, error: errors[0] };

  const [amountCents] = parseAmount(draft.amount, currency);
  if (amountCents === null) return { ok: false, error: 'Invalid amount' };

  const existing = plans.find((plan) => plan.id === id);
  if (existing) {
    if (!samePayload(existing, draft, amountCents)) {
      return { ok: false, error: 'Plan ID already used with different details' };
    }
    return { ok: true, plans, plan: existing };
  }

  if (plans.length >= MAX_EUROPEAN_PLANS) {
    return { ok: false, error: 'You can keep up to 20 draft plans in this browser' };
  }

  const plan: EuropeanPaymentPlan = {
    id,
    methodId: draft.methodId as EuropeanMethodId,
    amountCents,
    payee: draft.payee.trim(),
    note: draft.note.trim(),
    createdOn: DEMO_DATE,
    status: 'draft',
  };
  return { ok: true, plans: [...plans, plan], plan };
}

/**
 * European corridors are not live. Settlement always fails and returns the same ledger.
 */
export function settleEuropeanPlan(
  state: BankState,
  _plan: EuropeanPaymentPlan,
): { ok: false; error: string; state: BankState } {
  return {
    ok: false,
    error:
      'European payment plans are drafts. No provider is contracted for these corridors, so no money moves.',
    state,
  };
}

const PlanSchema = z
  .object({
    id: z.string().trim().min(1),
    methodId: z.enum(['sepa-credit', 'sepa-instant', 'ideal', 'bancontact', 'cartes-bancaires']),
    amountCents: z.number().int().safe().positive().max(1000000),
    payee: z.string().trim().min(1).max(80),
    note: z.string().max(200),
    createdOn: z.literal(DEMO_DATE),
    status: z.literal('draft'),
  })
  .strict()
  .refine((plan) => payeeError(plan.payee) === null, 'Payee must be a name');

const StoreSchema = z
  .object({
    version: z.literal(1),
    plans: z
      .array(PlanSchema)
      .max(MAX_EUROPEAN_PLANS)
      .refine((plans) => new Set(plans.map((plan) => plan.id)).size === plans.length, {
        message: 'Duplicate plan ID',
      }),
  })
  .strict();

export function loadEuropeanPlans(): EuropeanPlanStore {
  try {
    const stored = localStorage.getItem(EUROPEAN_PLANS_KEY);
    if (!stored) return { plans: [], warning: null };
    let data: unknown;
    try {
      data = JSON.parse(stored);
    } catch {
      return { plans: [], warning: 'European plans could not be read and were cleared.' };
    }
    const result = StoreSchema.safeParse(data);
    if (!result.success) {
      return { plans: [], warning: 'Saved European plans were invalid and were cleared.' };
    }
    return { plans: result.data.plans, warning: null };
  } catch {
    return {
      plans: [],
      warning: 'European plans could not be loaded. Browser storage is unavailable.',
    };
  }
}

export function saveEuropeanPlans(plans: EuropeanPaymentPlan[]): boolean {
  try {
    const result = StoreSchema.safeParse({ version: 1, plans });
    if (!result.success) return false;
    localStorage.setItem(EUROPEAN_PLANS_KEY, JSON.stringify(result.data));
    return true;
  } catch {
    return false;
  }
}
