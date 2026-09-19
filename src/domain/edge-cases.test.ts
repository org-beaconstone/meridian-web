import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createInitialState,
  executePayment,
  isCalendarDate,
  type PaymentDraft,
  type Scenario,
} from './model';
import { loadState, saveState, STORAGE_KEY } from './storage';
const draft: PaymentDraft = {
  recipientId: 'northline-studio',
  amount: '25.99',
  method: 'card',
  note: 'Friday essentials',
};

describe('boundary and invariant regressions', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '2026-09-31', '2026-9-18', 'no date'])(
    'rejects impossible calendar date %s',
    (date) => {
      expect(isCalendarDate(date)).toBe(false);
      expect(executePayment(createInitialState(), draft, 'success', 'new-id', date).ok).toBe(false);
    },
  );
  it('accepts leap day only on leap years', () => {
    expect(isCalendarDate('2024-02-29')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
  });
  it('rejects unrecognized simulation outcome', () => {
    expect(
      executePayment(createInitialState(), draft, 'other' as Scenario, 'new-id', '2026-09-18'),
    ).toEqual({ ok: false, error: 'Invalid simulation scenario' });
  });
  it('prevents altered notes on a reused id and leaves original state untouched', () => {
    const state = createInitialState();
    const paid = executePayment(state, draft, 'success', 'same-id', '2026-09-18');
    expect(state.balance).toBe(1248050);
    if (!paid.ok) throw new Error(paid.error);
    const repeated = executePayment(paid.state, draft, 'success', 'same-id', '2026-09-18');
    expect(repeated.ok && repeated.state.balance).toBe(1245451);
    const changed = executePayment(
      paid.state,
      { ...draft, note: 'different' },
      'success',
      'same-id',
      '2026-09-18',
    );
    expect(changed.ok).toBe(false);
  });
  it.each([
    'zero budget',
    'duplicate id',
    'unsafe integer',
    'recipient mismatch',
    'date mismatch',
    'unknown field',
  ])('recovers persisted %s', (corruption) => {
    const state = createInitialState();
    if (corruption === 'zero budget') state.budgets[0].limit = 0;
    if (corruption === 'duplicate id') state.transactions.push({ ...state.transactions[0] });
    if (corruption === 'unsafe integer') state.transactions[0].amount = Number.MAX_SAFE_INTEGER + 1;
    if (corruption === 'recipient mismatch') state.transactions[0].name = 'Another person';
    if (corruption === 'date mismatch') state.transactions[0].date = '2026-02-31';
    if (corruption === 'unknown field') Object.assign(state, { unexpected: true });
    const storage = new Map([[STORAGE_KEY, JSON.stringify(state)]]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    expect(saveState(state)).toBe(false);
    expect(loadState().warning).toBeTruthy();
    expect(loadState().state).toEqual(createInitialState());
  });
});
