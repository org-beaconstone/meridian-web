import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadState, saveState, STORAGE_KEY } from './storage';
import { createInitialState } from './model';

// Mock localStorage for tests
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

describe('storage', () => {
  beforeEach(() => {
    // Reset mock storage before each test
    mockStorage = {};
    // Mock global localStorage
    global.localStorage = mockLocalStorage as any;
  });

  afterEach(() => {
    mockStorage = {};
  });

  describe('loadState', () => {
    it('returns fresh state when localStorage is empty', () => {
      const result = loadState();
      expect(result.warning).toBeNull();
      expect(result.state.version).toBe(1);
      expect(result.state.balance).toBe(1248050);
      expect(result.state.transactions).toHaveLength(8);
    });

    it('loads valid state from localStorage', () => {
      const initialState = createInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));

      const result = loadState();
      expect(result.warning).toBeNull();
      expect(result.state).toEqual(initialState);
    });

    it('recovers with warning when JSON is corrupted', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json {{{');

      const result = loadState();
      expect(result.warning).toContain('Corrupted state JSON');
      expect(result.state.version).toBe(1);
      expect(result.state.balance).toBe(1248050);
    });

    it('recovers with warning when schema is invalid', () => {
      const invalidData = { version: 1, balance: 'not a number' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidData));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
      expect(result.state.version).toBe(1);
    });

    it('recovers with warning when balance is negative', () => {
      const negativeState = createInitialState();
      negativeState.balance = -1000;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(negativeState));

      const result = loadState();
      // Zod catches it as schema validation, which is fine - either message is acceptable
      expect(result.warning).toBeTruthy();
      expect(result.state.balance).toBeGreaterThanOrEqual(0);
    });

    it('recovers when transaction amount is negative', () => {
      const badState = createInitialState();
      badState.transactions[0].amount = -5000; // Invalid negative amount
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
      expect(result.state.transactions).toHaveLength(8); // Fresh state, not corrupted
    });

    it('recovers when transaction status is invalid', () => {
      const badState = createInitialState();
      (badState.transactions[0] as any).status = 'pending'; // Invalid status
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
    });

    it('recovers when transaction category is invalid', () => {
      const badState = createInitialState();
      (badState.transactions[0] as any).category = 'Groceries'; // Invalid category
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
    });

    it('recovers when transaction provider is invalid', () => {
      const badState = createInitialState();
      (badState.transactions[0] as any).provider = 'unknown-provider'; // Invalid provider
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
    });

    it('recovers when transaction method is invalid', () => {
      const badState = createInitialState();
      (badState.transactions[0] as any).method = 'cash'; // Invalid method
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
    });

    it('recovers when budget category is invalid', () => {
      const badState = createInitialState();
      (badState.budgets[0] as any).category = 'Utilities'; // Invalid category
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
    });

    it('recovers when budget limit is negative', () => {
      const badState = createInitialState();
      badState.budgets[0].limit = -5000;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
    });

    it('recovers when version is wrong', () => {
      const badState = createInitialState();
      (badState as any).version = 2;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
    });

    it('recovers when unknown fields are present', () => {
      const badState = createInitialState();
      (badState as any).unknownField = 'should be ignored or rejected by schema';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      // Zod should reject the object if it has extra fields (strict mode)
      // This may or may not warn depending on Zod config
      expect(result.state.version).toBe(1);
    });

    it('recovers when transactions array is missing', () => {
      const badState = { version: 1, balance: 1000 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
      expect(result.state.transactions).toHaveLength(8);
    });

    it('recovers when budgets array is missing', () => {
      const badState = { version: 1, balance: 1000, transactions: [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(badState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
      expect(result.state.budgets).toHaveLength(5);
    });

    it('handles gracefully when localStorage access is denied', () => {
      // Simulate denied access by making getItem throw
      global.localStorage = {
        getItem: () => {
          throw new Error('Access denied');
        },
      } as any;

      const result = loadState();
      expect(result.warning).toContain('Failed to load state');
      expect(result.state.version).toBe(1);

      // Restore mock
      global.localStorage = mockLocalStorage as any;
    });
  });

  describe('saveState', () => {
    it('saves valid state to localStorage', () => {
      const state = createInitialState();
      const success = saveState(state);

      expect(success).toBe(true);
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const loaded = JSON.parse(stored!);
      expect(loaded).toEqual(state);
    });

    it('returns false for invalid state (negative balance)', () => {
      const state = createInitialState();
      state.balance = -1000;

      const success = saveState(state);
      expect(success).toBe(false);
    });

    it('returns false for invalid state (negative transaction amount)', () => {
      const state = createInitialState();
      state.transactions[0].amount = -5000;

      const success = saveState(state);
      expect(success).toBe(false);
    });

    it('returns false for invalid state (negative budget limit)', () => {
      const state = createInitialState();
      state.budgets[0].limit = -1000;

      const success = saveState(state);
      expect(success).toBe(false);
    });

    it('returns false for invalid state (invalid category)', () => {
      const state = createInitialState();
      (state.transactions[0] as any).category = 'InvalidCategory';

      const success = saveState(state);
      expect(success).toBe(false);
    });

    it('returns false for invalid state (invalid status)', () => {
      const state = createInitialState();
      (state.transactions[0] as any).status = 'pending';

      const success = saveState(state);
      expect(success).toBe(false);
    });

    it('returns false for invalid state (invalid provider)', () => {
      const state = createInitialState();
      (state.transactions[0] as any).provider = 'unknown-provider';

      const success = saveState(state);
      expect(success).toBe(false);
    });

    it('returns false for invalid state (invalid method)', () => {
      const state = createInitialState();
      (state.transactions[0] as any).method = 'wallet';

      const success = saveState(state);
      expect(success).toBe(false);
    });

    it('returns false for invalid state (missing required field)', () => {
      const state = createInitialState();
      delete (state.transactions[0] as any).id;

      const success = saveState(state);
      expect(success).toBe(false);
    });

    it('handles gracefully when localStorage quota is exceeded', () => {
      // Simulate quota exceeded by making setItem throw
      global.localStorage = {
        getItem: mockLocalStorage.getItem,
        setItem: () => {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        },
        removeItem: mockLocalStorage.removeItem,
        clear: mockLocalStorage.clear,
        get length() {
          return 0;
        },
        key: mockLocalStorage.key,
      } as any;

      const state = createInitialState();
      const success = saveState(state);

      expect(success).toBe(false);

      // Restore mock
      global.localStorage = mockLocalStorage as any;
    });

    it('handles gracefully when localStorage access is denied', () => {
      global.localStorage = {
        getItem: mockLocalStorage.getItem,
        setItem: () => {
          throw new Error('Access denied');
        },
        removeItem: mockLocalStorage.removeItem,
        clear: mockLocalStorage.clear,
        get length() {
          return 0;
        },
        key: mockLocalStorage.key,
      } as any;

      const state = createInitialState();
      const success = saveState(state);

      expect(success).toBe(false);

      // Restore mock
      global.localStorage = mockLocalStorage as any;
    });

    it('persists state across multiple saves', () => {
      const state1 = createInitialState();
      saveState(state1);

      const state2 = createInitialState();
      state2.balance = 999999;
      saveState(state2);

      const stored = localStorage.getItem(STORAGE_KEY);
      const loaded = JSON.parse(stored!);
      expect(loaded.balance).toBe(999999);
    });
  });

  describe('roundtrip: save and load', () => {
    it('state survives save and load cycle', () => {
      const original = createInitialState();
      const saveSuccess = saveState(original);
      expect(saveSuccess).toBe(true);

      const { state: loaded, warning } = loadState();
      expect(warning).toBeNull();
      expect(loaded).toEqual(original);
    });

    it('modified state is persisted correctly', () => {
      const state = createInitialState();
      state.balance = 500000;
      state.transactions = state.transactions.slice(0, 3);

      const saveSuccess = saveState(state);
      expect(saveSuccess).toBe(true);

      const { state: loaded } = loadState();
      expect(loaded.balance).toBe(500000);
      expect(loaded.transactions).toHaveLength(3);
    });
  });

  describe('recovery from corrupted budget shapes', () => {
    it('recovers from wrong number of budget entries', () => {
      const corruptedState = createInitialState();
      corruptedState.budgets = corruptedState.budgets.slice(0, 3);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedState));

      const result = loadState();
      expect(result.warning).toBeTruthy();
      expect(result.state.budgets).toHaveLength(5);
    });

    it('recovers from duplicate budget categories', () => {
      const corruptedState = createInitialState();
      corruptedState.budgets[1] = { category: 'Shopping', limit: 50000 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedState));

      const result = loadState();
      expect(result.warning).toBeTruthy();
      expect(result.state.budgets).toHaveLength(5);
      const categories = new Set(result.state.budgets.map((b) => b.category));
      expect(categories.size).toBe(5);
    });

    it('recovers from budget limit exceeding max', () => {
      const corruptedState = createInitialState();
      corruptedState.budgets[0].limit = 2000000;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedState));

      const result = loadState();
      expect(result.warning).toBeTruthy();
    });

    it('recovers from negative budget limit', () => {
      const corruptedState = createInitialState();
      corruptedState.budgets[0].limit = -5000;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedState));

      const result = loadState();
      expect(result.warning).toBeTruthy();
      expect(result.state.budgets[0].limit).toBeGreaterThanOrEqual(0);
    });

    it('recovers from malformed transaction dates', () => {
      const corruptedState = createInitialState();
      corruptedState.transactions[0].date = '2026/09/05';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedState));

      const result = loadState();
      expect(result.warning).toBeTruthy();
    });

    it('recovers from inconsistent provider/method mapping', () => {
      const corruptedState = createInitialState();
      // Adyen should only have card, but we store bank with adyen
      corruptedState.transactions[0].provider = 'adyen';
      corruptedState.transactions[0].method = 'bank';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedState));

      const result = loadState();
      expect(result.warning).toContain('Invalid state schema');
      expect(result.state).toEqual(createInitialState());
    });
  });

  describe('STORAGE_KEY constant', () => {
    it('is defined and non-empty', () => {
      expect(STORAGE_KEY).toBeTruthy();
      expect(typeof STORAGE_KEY).toBe('string');
    });

    it('uses consistent key across calls', () => {
      const state = createInitialState();
      saveState(state);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
    });
  });
});
