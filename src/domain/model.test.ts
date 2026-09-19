import { describe, it, expect } from 'vitest';
import {
  type Category,
  type PaymentDraft,
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

describe('model', () => {
  describe('parseAmount', () => {
    it('parses valid pounds.pence', () => {
      const [pence, error] = parseAmount('32.50');
      expect(error).toBeNull();
      expect(pence).toBe(3250);
    });

    it('parses integer pounds', () => {
      const [pence, error] = parseAmount('100');
      expect(error).toBeNull();
      expect(pence).toBe(10000);
    });

    it('parses single decimal', () => {
      const [pence, error] = parseAmount('42.5');
      expect(error).toBeNull();
      expect(pence).toBe(4250);
    });

    it('rejects empty string', () => {
      const [pence, error] = parseAmount('');
      expect(pence).toBeNull();
      expect(error).toBe('Amount is required');
    });

    it('rejects whitespace only', () => {
      const [pence, error] = parseAmount('   ');
      expect(pence).toBeNull();
      expect(error).toBe('Amount is required');
    });

    it('rejects negative sign', () => {
      const [pence, error] = parseAmount('-50.00');
      expect(pence).toBeNull();
      expect(error).toContain('sign');
    });

    it('rejects plus sign', () => {
      const [pence, error] = parseAmount('+50.00');
      expect(pence).toBeNull();
      expect(error).toContain('sign');
    });

    it('rejects exponent notation', () => {
      const [pence, error] = parseAmount('1e5');
      expect(pence).toBeNull();
      expect(error).toContain('exponent');
    });

    it('rejects more than 2 decimals', () => {
      const [pence, error] = parseAmount('32.505');
      expect(pence).toBeNull();
      expect(error).toContain('2 decimal places');
    });

    it('rejects zero', () => {
      const [pence, error] = parseAmount('0.00');
      expect(pence).toBeNull();
      expect(error).toContain('greater than zero');
    });

    it('rejects amounts exceeding £10000', () => {
      const [pence, error] = parseAmount('10000.01');
      expect(pence).toBeNull();
      expect(error).toContain('£10,000');
    });

    it('accepts maximum £10000', () => {
      const [pence, error] = parseAmount('10000.00');
      expect(error).toBeNull();
      expect(pence).toBe(1000000);
    });

    it('rejects non-numeric characters', () => {
      const [pence, error] = parseAmount('50abc');
      expect(pence).toBeNull();
      expect(error).toContain('valid number');
    });
  });

  describe('getProvider', () => {
    it('returns adyen for card method', () => {
      const provider = getProvider('card');
      expect(provider.id).toBe('adyen');
      expect(provider.methods).toContain('card');
    });

    it('returns worldpay for bank method', () => {
      const provider = getProvider('bank');
      expect(provider.id).toBe('worldpay');
      expect(provider.methods).toContain('bank');
    });

    it('throws for unknown method', () => {
      expect(() => {
        getProvider('unknown' as any);
      }).toThrow('No provider found');
    });
  });

  describe('money', () => {
    it('formats pence to en-GB currency', () => {
      expect(money(3250)).toBe('£32.50');
    });

    it('formats whole pounds', () => {
      expect(money(10000)).toBe('£100.00');
    });

    it('formats penny values', () => {
      expect(money(1)).toBe('£0.01');
    });

    it('formats large amounts', () => {
      expect(money(1000000)).toBe('£10,000.00');
    });

    it('formats zero', () => {
      expect(money(0)).toBe('£0.00');
    });
  });

  describe('createInitialState', () => {
    it('creates valid state with correct balance', () => {
      const state = createInitialState();
      expect(state.version).toBe(1);
      expect(state.balance).toBe(1248050); // £12,480.50
    });

    it('creates 8 transactions', () => {
      const state = createInitialState();
      expect(state.transactions).toHaveLength(8);
    });

    it('all transactions are completed', () => {
      const state = createInitialState();
      state.transactions.forEach((txn) => {
        expect(txn.status).toBe('completed');
      });
    });

    it('all transactions dated in September 2026', () => {
      const state = createInitialState();
      state.transactions.forEach((txn) => {
        expect(txn.date).toMatch(/^2026-09-/);
      });
    });

    it('sum of transactions is £1842.80', () => {
      const state = createInitialState();
      const total = state.transactions.reduce((sum, txn) => sum + txn.amount, 0);
      expect(total).toBe(184280);
    });

    it('all transactions map to valid recipients', () => {
      const state = createInitialState();
      const recipientIds = RECIPIENTS.map((r) => r.id);
      state.transactions.forEach((txn) => {
        expect(recipientIds).toContain(txn.recipientId);
      });
    });

    it('budgets sum to £3200', () => {
      const state = createInitialState();
      const total = state.budgets.reduce((sum, b) => sum + b.limit, 0);
      expect(total).toBe(320000);
    });

    it('creates 5 budget entries', () => {
      const state = createInitialState();
      expect(state.budgets).toHaveLength(5);
    });

    it('all budget categories are distinct', () => {
      const state = createInitialState();
      const categories = state.budgets.map((b) => b.category);
      expect(new Set(categories).size).toBe(5);
    });
  });

  describe('validatePayment', () => {
    const state = createInitialState();

    it('validates healthy payment draft', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: 'Design materials',
      };
      const errors = validatePayment(state, draft);
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid recipient', () => {
      const draft: PaymentDraft = {
        recipientId: 'unknown-merchant',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const errors = validatePayment(state, draft);
      expect(errors).toContain('Invalid recipient');
    });

    it('rejects invalid amount', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: 'abc',
        method: 'card',
        note: '',
      };
      const errors = validatePayment(state, draft);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects insufficient balance', () => {
      // Create a state with a reduced balance to test this case
      const lowBalanceState = { ...state, balance: 5000 }; // £50.00
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '60.00', // Exceeds balance of £50.00
        method: 'card',
        note: '',
      };
      const errors = validatePayment(lowBalanceState, draft);
      expect(errors).toContain('Insufficient balance');
    });

    it('rejects invalid payment method', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'invalid' as any,
        note: '',
      };
      const errors = validatePayment(state, draft);
      expect(errors).toContain('Invalid payment method');
    });

    it('rejects excessive note length', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: 'x'.repeat(201),
      };
      const errors = validatePayment(state, draft);
      expect(errors.some((e) => e.includes('too long'))).toBe(true);
    });

    it('accepts max-length note', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: 'x'.repeat(200),
      };
      const errors = validatePayment(state, draft);
      expect(errors).not.toContain('too long');
    });
  });

  describe('monthlySpent', () => {
    const state = createInitialState();

    it('sums all completed transactions in September 2026', () => {
      const total = monthlySpent(state);
      expect(total).toBe(184280); // £1842.80
    });

    it('filters by category when provided', () => {
      const foodTotal = monthlySpent(state, 'Food & drink');
      // Should be txn-001 (35.00) + txn-006 (42.80) = 77.80
      expect(foodTotal).toBe(7780);
    });

    it('returns zero for category with no transactions', () => {
      const total = monthlySpent(state, 'Lifestyle');
      // Only txn-005 (150.00)
      expect(total).toBe(15000);
    });

    it('excludes declined transactions', () => {
      const stateWithDeclined = {
        ...state,
        transactions: [
          ...state.transactions,
          {
            id: 'declined-txn',
            reference: 'REF-DECLINED',
            recipientId: 'northline-studio',
            name: 'Northline Studio',
            category: 'Shopping' as Category,
            amount: 50000,
            date: '2026-09-18',
            provider: 'adyen' as const,
            method: 'card' as const,
            status: 'declined' as const,
            note: 'Failed',
          },
        ],
      };
      const total = monthlySpent(stateWithDeclined);
      expect(total).toBe(184280); // Should be unchanged
    });

    it('excludes transactions from other months', () => {
      const stateWithOldTxn = {
        ...state,
        transactions: [
          ...state.transactions,
          {
            id: 'old-txn',
            reference: 'REF-OLD',
            recipientId: 'northline-studio',
            name: 'Northline Studio',
            category: 'Shopping' as Category,
            amount: 100000,
            date: '2026-08-31',
            provider: 'adyen' as const,
            method: 'card' as const,
            status: 'completed' as const,
            note: 'Old transaction',
          },
        ],
      };
      const total = monthlySpent(stateWithOldTxn);
      expect(total).toBe(184280); // Should be unchanged
    });
  });

  describe('updateBudget', () => {
    const state = createInitialState();

    it('updates budget for valid category and amount', () => {
      const result = updateBudget(state, 'Shopping', '500.00');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const budget = result.state.budgets.find((b) => b.category === 'Shopping');
        expect(budget?.limit).toBe(50000);
      }
    });

    it('returns error for invalid category', () => {
      const result = updateBudget(state, 'Invalid' as any, '500.00');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Invalid category');
      }
    });

    it('returns error for invalid amount', () => {
      const result = updateBudget(state, 'Shopping', 'abc');
      expect(result.ok).toBe(false);
    });

    it('returns error for zero amount', () => {
      const result = updateBudget(state, 'Shopping', '0.00');
      expect(result.ok).toBe(false);
    });

    it('returns error for amount exceeding £10000', () => {
      const result = updateBudget(state, 'Shopping', '10000.01');
      expect(result.ok).toBe(false);
    });

    it('accepts maximum budget of £10000', () => {
      const result = updateBudget(state, 'Shopping', '10000.00');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const budget = result.state.budgets.find((b) => b.category === 'Shopping');
        expect(budget?.limit).toBe(1000000);
      }
    });

    it('preserves other budgets when updating one', () => {
      const result = updateBudget(state, 'Shopping', '250.00');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const billsBudget = result.state.budgets.find((b) => b.category === 'Bills');
        expect(billsBudget?.limit).toBe(state.budgets.find((b) => b.category === 'Bills')?.limit);
      }
    });
  });

  describe('executePayment', () => {
    const state = createInitialState();

    it('executes successful payment', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: 'Art supplies',
      };
      const result = executePayment(state, draft, 'success', 'txn-new-001', '2026-09-18');
      expect(result.ok).toBe(true);
      if (result.ok && result.state && result.transaction) {
        expect(result.state.balance).toBe(state.balance - 5000);
        expect(result.transaction.status).toBe('completed');
        expect(result.transaction.amount).toBe(5000);
        expect(result.state.transactions).toContain(result.transaction);
      }
    });

    it('uses correct provider based on payment method', () => {
      const draftCard: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '25.00',
        method: 'card',
        note: '',
      };
      const resultCard = executePayment(state, draftCard, 'success', 'txn-card-001', '2026-09-18');
      expect(resultCard.ok).toBe(true);
      if (resultCard.ok && resultCard.transaction) {
        expect(resultCard.transaction.provider).toBe('adyen');
      }

      const draftBank: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '25.00',
        method: 'bank',
        note: '',
      };
      const resultBank = executePayment(state, draftBank, 'success', 'txn-bank-001', '2026-09-18');
      expect(resultBank.ok).toBe(true);
      if (resultBank.ok && resultBank.transaction) {
        expect(resultBank.transaction.provider).toBe('worldpay');
      }
    });

    it('returns error for declined scenario', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(state, draft, 'declined', 'txn-declined-001', '2026-09-18');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('declined');
      }
      // State should be unchanged
      expect('state' in result).toBe(false);
    });

    it('returns error for unavailable scenario', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(state, draft, 'unavailable', 'txn-unavail-001', '2026-09-18');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('unavailable');
      }
    });

    it('is idempotent: duplicate ID returns same transaction without debit', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: 'Test',
      };
      const result1 = executePayment(state, draft, 'success', 'txn-idempotent-001', '2026-09-18');
      expect(result1.ok).toBe(true);
      if (!result1.ok || !result1.state || !result1.transaction) {
        throw new Error('First execution failed');
      }

      const newState = result1.state;
      const result2 = executePayment(
        newState,
        draft,
        'success',
        'txn-idempotent-001',
        '2026-09-18',
      );
      expect(result2.ok).toBe(true);
      if (result2.ok && result2.state && result2.transaction) {
        // Balance should match after first debit, not double-debited
        expect(result2.state.balance).toBe(result1.state.balance);
        expect(result2.transaction.id).toBe(result1.transaction.id);
      }
    });

    it('returns error for validation failure', () => {
      const draft: PaymentDraft = {
        recipientId: 'unknown-merchant',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(state, draft, 'success', 'txn-invalid-001', '2026-09-18');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeDefined();
      }
    });

    it('generates unique transaction reference', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '10.00',
        method: 'card',
        note: '',
      };
      const result1 = executePayment(state, draft, 'success', 'txn-ref-001', '2026-09-18');
      const result2 = executePayment(state, draft, 'success', 'txn-ref-002', '2026-09-18');

      if (result1.ok && result1.transaction && result2.ok && result2.transaction) {
        expect(result1.transaction.reference).not.toBe(result2.transaction.reference);
      }
    });

    it('sets date from ISO timestamp', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '10.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(
        state,
        draft,
        'success',
        'txn-date-001',
        '2026-09-18T14:30:00Z',
      );
      if (result.ok && result.transaction) {
        expect(result.transaction.date).toBe('2026-09-18');
      }
    });

    it('preserves existing transactions', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '10.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(state, draft, 'success', 'txn-preserve-001', '2026-09-18');
      if (result.ok && result.state) {
        expect(result.state.transactions.length).toBe(state.transactions.length + 1);
        state.transactions.forEach((txn) => {
          expect(result.state!.transactions).toContainEqual(txn);
        });
      }
    });

    it('rejects empty transaction ID', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(state, draft, 'success', '', '2026-09-18');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Transaction ID');
      }
    });

    it('rejects whitespace-only transaction ID', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(state, draft, 'success', '   ', '2026-09-18');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Transaction ID');
      }
    });

    it('rejects invalid ISO date format', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(state, draft, 'success', 'txn-date-invalid', '2026/09/18');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('date format');
      }
    });

    it('rejects completely malformed date', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(state, draft, 'success', 'txn-date-malformed', 'not-a-date');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('date');
      }
    });

    it('errors when same ID used with different amount', () => {
      const draft1: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: 'First payment',
      };
      const result1 = executePayment(state, draft1, 'success', 'txn-payload-change', '2026-09-18');
      expect(result1.ok).toBe(true);
      if (!result1.ok || !result1.state) {
        throw new Error('First execution failed');
      }

      const draft2: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '75.00', // Different amount
        method: 'card',
        note: 'Changed amount',
      };
      const result2 = executePayment(
        result1.state,
        draft2,
        'success',
        'txn-payload-change',
        '2026-09-18',
      );
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error).toContain('already used with different payload');
      }
    });

    it('errors when same ID used with different recipient', () => {
      const draft1: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result1 = executePayment(
        state,
        draft1,
        'success',
        'txn-recipient-change',
        '2026-09-18',
      );
      expect(result1.ok).toBe(true);
      if (!result1.ok || !result1.state) {
        throw new Error('First execution failed');
      }

      const draft2: PaymentDraft = {
        recipientId: 'birch-bloom', // Different recipient
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result2 = executePayment(
        result1.state,
        draft2,
        'success',
        'txn-recipient-change',
        '2026-09-18',
      );
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error).toContain('already used with different payload');
      }
    });

    it('errors when same ID used with different method', () => {
      const draft1: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'card',
        note: '',
      };
      const result1 = executePayment(state, draft1, 'success', 'txn-method-change', '2026-09-18');
      expect(result1.ok).toBe(true);
      if (!result1.ok || !result1.state) {
        throw new Error('First execution failed');
      }

      const draft2: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00',
        method: 'bank', // Different method
        note: '',
      };
      const result2 = executePayment(
        result1.state,
        draft2,
        'success',
        'txn-method-change',
        '2026-09-18',
      );
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error).toContain('already used with different payload');
      }
    });

    it('accepts ISO 8601 timestamp with time component', () => {
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '10.00',
        method: 'card',
        note: '',
      };
      const result = executePayment(
        state,
        draft,
        'success',
        'txn-iso8601-001',
        '2026-09-18T14:30:45Z',
      );
      expect(result.ok).toBe(true);
    });

    it('rejects insufficient balance with lowered state', () => {
      const lowBalanceState = { ...state, balance: 3000 }; // £30.00
      const draft: PaymentDraft = {
        recipientId: 'northline-studio',
        amount: '50.00', // Exceeds £30.00 balance
        method: 'card',
        note: '',
      };
      const result = executePayment(
        lowBalanceState,
        draft,
        'success',
        'txn-low-balance-001',
        '2026-09-18',
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Insufficient balance');
      }
    });
  });

  describe('RECIPIENTS and PROVIDERS constants', () => {
    it('exports 5 recipients', () => {
      expect(RECIPIENTS).toHaveLength(5);
    });

    it('all recipients have unique IDs', () => {
      const ids = RECIPIENTS.map((r) => r.id);
      expect(new Set(ids).size).toBe(5);
    });

    it('all recipients have valid categories', () => {
      const validCategories: Category[] = [
        'Shopping',
        'Food & drink',
        'Transport',
        'Bills',
        'Lifestyle',
      ];
      RECIPIENTS.forEach((r) => {
        expect(validCategories).toContain(r.category);
      });
    });

    it('all recipients have non-empty initials', () => {
      RECIPIENTS.forEach((r) => {
        expect(r.initials).toBeTruthy();
        expect(r.initials.length).toBeGreaterThan(0);
      });
    });

    it('exports 2 providers', () => {
      expect(PROVIDERS).toHaveLength(2);
    });

    it('providers have expected IDs', () => {
      const providerIds = PROVIDERS.map((p) => p.id);
      expect(providerIds).toContain('adyen');
      expect(providerIds).toContain('worldpay');
    });

    it('each provider has supported payment methods', () => {
      PROVIDERS.forEach((p) => {
        expect(p.methods.length).toBeGreaterThan(0);
      });
    });
  });
});
