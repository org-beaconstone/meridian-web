import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, money, parseAmount, PROVIDERS } from './model';
import {
  addEuropeanPlan,
  EUROPEAN_METHODS,
  EUROPEAN_PLANS_KEY,
  loadEuropeanPlans,
  MAX_EUROPEAN_PLANS,
  saveEuropeanPlans,
  settleEuropeanPlan,
  validateEuropeanPlan,
  type EuropeanPaymentPlan,
} from './european-plans';

let mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    mockStorage = {};
  },
  get length() {
    return Object.keys(mockStorage).length;
  },
  key: (index: number) => Object.keys(mockStorage)[index] || null,
};

const draft = {
  methodId: 'sepa-instant',
  amount: '40.00',
  payee: 'Atelier Nord',
  note: 'Studio visit',
};

describe('european payment plans', () => {
  beforeEach(() => {
    mockStorage = {};
    global.localStorage = mockLocalStorage as Storage;
  });

  it('keeps the live provider registry at Adyen and Worldpay', () => {
    expect(PROVIDERS.map((provider) => provider.id)).toEqual(['adyen', 'worldpay']);
    expect(EUROPEAN_METHODS.some((method) => 'provider' in method)).toBe(false);
  });

  it('parses euro cents with the same integer rules as sterling', () => {
    expect(parseAmount('40.5', 'EUR')).toEqual([4050, null]);
    expect(parseAmount('10000.01', 'EUR')[1]).toContain('€10,000');
    expect(parseAmount('10000.01')[1]).toContain('£10,000');
    expect(money(4050, 'EUR')).toBe('€40.50');
  });

  it('rejects account numbers and unknown methods', () => {
    expect(validateEuropeanPlan({ ...draft, payee: '4111111111111111' })).toContain(
      'Enter a payee name, not a card or account number.',
    );
    expect(validateEuropeanPlan({ ...draft, payee: 'DE89 3704 0044 0532 0130 00' })).toContain(
      'Enter a payee name. Account numbers are not collected on a plan.',
    );
    expect(validateEuropeanPlan({ ...draft, methodId: 'checkout' })).toContain(
      'Choose a European payment method',
    );
  });

  it('saves a draft once and refuses a changed payload on the same id', () => {
    const created = addEuropeanPlan([], draft, 'plan-1');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.plan).toMatchObject({
      amountCents: 4000,
      status: 'draft',
      createdOn: '2026-09-18',
      methodId: 'sepa-instant',
    });
    const repeat = addEuropeanPlan(created.plans, draft, 'plan-1');
    expect(repeat.ok).toBe(true);
    if (repeat.ok) expect(repeat.plans).toHaveLength(1);

    const changed = addEuropeanPlan(created.plans, { ...draft, amount: '41.00' }, 'plan-1');
    expect(changed).toEqual({
      ok: false,
      error: 'Plan ID already used with different details',
    });
  });

  it('caps the number of stored drafts', () => {
    let plans: EuropeanPaymentPlan[] = [];
    for (let index = 0; index < MAX_EUROPEAN_PLANS; index += 1) {
      const result = addEuropeanPlan(plans, { ...draft, payee: `Payee ${index}` }, `plan-${index}`);
      expect(result.ok).toBe(true);
      if (result.ok) plans = result.plans;
    }
    const extra = addEuropeanPlan(plans, draft, 'plan-extra');
    expect(extra.ok).toBe(false);
  });

  it('never settles a draft or changes the ledger', () => {
    const state = createInitialState();
    const created = addEuropeanPlan([], draft, 'plan-1');
    if (!created.ok) throw new Error('expected draft');
    const settled = settleEuropeanPlan(state, created.plan);
    expect(settled.ok).toBe(false);
    expect(settled.state).toBe(state);
    expect(settled.state.balance).toBe(1248050);
    expect(settled.error).toContain('No provider is contracted');
  });

  it('persists valid drafts and recovers from corrupt storage', () => {
    const created = addEuropeanPlan([], draft, 'plan-1');
    if (!created.ok) throw new Error('expected draft');
    expect(saveEuropeanPlans(created.plans)).toBe(true);
    expect(loadEuropeanPlans().plans).toEqual(created.plans);

    localStorage.setItem(EUROPEAN_PLANS_KEY, '{bad');
    expect(loadEuropeanPlans().warning).toContain('could not be read');

    localStorage.setItem(
      EUROPEAN_PLANS_KEY,
      JSON.stringify({ version: 1, plans: [{ ...created.plan, provider: 'adyen' }] }),
    );
    expect(loadEuropeanPlans().plans).toEqual([]);
    expect(saveEuropeanPlans([{ ...created.plan, status: 'live' } as EuropeanPaymentPlan])).toBe(
      false,
    );
  });
});
