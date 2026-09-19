// Domain model for Meridian banking demo
// Fictional data only - no real payments or credentials

export type Category = 'Shopping' | 'Food & drink' | 'Transport' | 'Bills' | 'Lifestyle';
export type PaymentMethod = 'card' | 'bank';
export type ProviderId = 'adyen' | 'worldpay';
export type Scenario = 'success' | 'declined' | 'unavailable';

export interface Recipient {
  id: string;
  name: string;
  initials: string;
  detail: string;
  category: Category;
  color: string;
}

export interface Transaction {
  id: string;
  reference: string;
  recipientId: string;
  name: string;
  category: Category;
  amount: number; // integer GBP pence, positive (outgoing)
  date: string; // ISO 8601
  provider: ProviderId;
  method: PaymentMethod;
  status: 'completed' | 'declined';
  note: string;
}

export interface Budget {
  category: Category;
  limit: number; // integer GBP pence
}

export interface BankState {
  version: 1;
  balance: number; // integer GBP pence
  transactions: Transaction[];
  budgets: Budget[];
}

export interface PaymentDraft {
  recipientId: string;
  amount: string; // user input, to be parsed
  method: PaymentMethod;
  note: string;
}

export type PaymentResult =
  { ok: true; state: BankState; transaction: Transaction } | { ok: false; error: string };

// Demo constants
export const DEMO_DATE = '2026-09-18';

/** Accept real calendar dates, not normalized dates such as 31 February. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Fictional merchants - 5 recipients across categories
export const RECIPIENTS: Recipient[] = [
  {
    id: 'northline-studio',
    name: 'Northline Studio',
    initials: 'NS',
    detail: 'Design tools & materials',
    category: 'Shopping',
    color: '#FF6B6B',
  },
  {
    id: 'octavia-energy',
    name: 'Octavia Energy',
    initials: 'OE',
    detail: 'Electricity & gas supplier',
    category: 'Bills',
    color: '#4ECDC4',
  },
  {
    id: 'maya-chen',
    name: 'Maya Chen',
    initials: 'MC',
    detail: 'Yoga & wellness classes',
    category: 'Lifestyle',
    color: '#95E1D3',
  },
  {
    id: 'birch-bloom',
    name: 'Birch & Bloom',
    initials: 'BB',
    detail: 'Organic café & bistro',
    category: 'Food & drink',
    color: '#FFD93D',
  },
  {
    id: 'london-transit',
    name: 'London Transit',
    initials: 'LT',
    detail: 'Public transport & taxis',
    category: 'Transport',
    color: '#6BCB77',
  },
];

// Provider registry for payment routing
export interface Provider {
  id: ProviderId;
  name: string;
  description: string;
  methods: PaymentMethod[];
}

export const PROVIDERS: Provider[] = [
  {
    id: 'adyen',
    name: 'Adyen',
    description: 'Card payment processor',
    methods: ['card'],
  },
  {
    id: 'worldpay',
    name: 'Worldpay',
    description: 'Bank transfer processor',
    methods: ['bank'],
  },
];

/**
 * Get provider for a given payment method
 * Routing: card → adyen, bank → worldpay
 */
export function getProvider(method: PaymentMethod): Provider {
  const provider = PROVIDERS.find((p) => p.methods.includes(method));
  if (!provider) {
    throw new Error(`No provider found for method: ${method}`);
  }
  return provider;
}

/**
 * Parse amount string to integer pence
 * Safe, strict validation using integer string parsing:
 * - two decimal places maximum
 * - rejects sign, exponent notation
 * - rejects >2 decimals
 * - rejects amounts >£10000 or zero
 * Returns [pence, error] tuple
 */
export function parseAmount(input: string): [number | null, string | null] {
  const trimmed = input.trim();

  // Empty or whitespace only
  if (!trimmed) {
    return [null, 'Amount is required'];
  }

  // Check for sign, exponent, or invalid characters
  if (
    trimmed.includes('-') ||
    trimmed.includes('+') ||
    trimmed.includes('e') ||
    trimmed.includes('E')
  ) {
    return [null, 'Amount cannot contain sign or exponent notation'];
  }

  // Must be numeric with optional decimal point
  if (!/^\d+(\.\d*)?$/.test(trimmed)) {
    return [null, 'Amount must be a valid number'];
  }

  // Check decimal places and parse using integer string arithmetic
  const parts = trimmed.split('.');
  if (parts.length === 2 && parts[1].length > 2) {
    return [null, 'Amount must have at most 2 decimal places'];
  }

  // Convert to pence using integer string parsing
  const pounds = parts[0];
  const penceStr = parts[1] ? parts[1].padEnd(2, '0') : '00';

  // Safe integer check before converting
  const poundsNum = Number.parseInt(pounds, 10);
  const penceNum = Number.parseInt(penceStr, 10);

  if (!Number.isSafeInteger(poundsNum) || !Number.isSafeInteger(penceNum)) {
    return [null, 'Amount is too large'];
  }

  const pence = poundsNum * 100 + penceNum;

  // Validate range
  if (pence <= 0) {
    return [null, 'Amount must be greater than zero'];
  }

  if (pence > 1000000) {
    // 10000 pounds
    return [null, 'Amount cannot exceed £10,000'];
  }

  return [pence, null];
}

/**
 * Validate a payment draft against current state
 * Returns array of validation errors (empty = valid)
 */
export function validatePayment(state: BankState, draft: PaymentDraft): string[] {
  const errors: string[] = [];

  // Validate recipient exists
  if (!RECIPIENTS.find((r) => r.id === draft.recipientId)) {
    errors.push('Invalid recipient');
  }

  // Validate amount
  const [pence, parseError] = parseAmount(draft.amount);
  if (parseError) {
    errors.push(parseError);
  }

  // Check balance if amount parsed successfully
  if (pence !== null && pence > state.balance) {
    errors.push('Insufficient balance');
  }

  // Validate payment method
  if (!['card', 'bank'].includes(draft.method)) {
    errors.push('Invalid payment method');
  }

  // Validate note (optional but if provided, reasonable length)
  if (draft.note && draft.note.length > 200) {
    errors.push('Note is too long (max 200 characters)');
  }

  return errors;
}

/**
 * Create initial state with demo data
 * Balance: £12,480.50
 * ~8 transactions for September 2026
 * Total month spent: £1,842.80
 * Budgets sum: £3,200.00
 */
export function createInitialState(): BankState {
  return {
    version: 1,
    balance: 1248050, // £12,480.50
    transactions: [
      {
        id: 'txn-001',
        reference: 'REF-20260905-001',
        recipientId: 'birch-bloom',
        name: 'Birch & Bloom',
        category: 'Food & drink',
        amount: 3500, // £35.00
        date: '2026-09-05',
        provider: 'worldpay',
        method: 'bank',
        status: 'completed',
        note: 'Breakfast',
      },
      {
        id: 'txn-002',
        reference: 'REF-20260907-002',
        recipientId: 'london-transit',
        name: 'London Transit',
        category: 'Transport',
        amount: 15000, // £150.00
        date: '2026-09-07',
        provider: 'adyen',
        method: 'card',
        status: 'completed',
        note: 'Monthly pass',
      },
      {
        id: 'txn-003',
        reference: 'REF-20260908-003',
        recipientId: 'octavia-energy',
        name: 'Octavia Energy',
        category: 'Bills',
        amount: 80000, // £800.00
        date: '2026-09-08',
        provider: 'adyen',
        method: 'card',
        status: 'completed',
        note: 'Utilities',
      },
      {
        id: 'txn-004',
        reference: 'REF-20260910-004',
        recipientId: 'northline-studio',
        name: 'Northline Studio',
        category: 'Shopping',
        amount: 35000, // £350.00
        date: '2026-09-10',
        provider: 'adyen',
        method: 'card',
        status: 'completed',
        note: 'Design software subscription',
      },
      {
        id: 'txn-005',
        reference: 'REF-20260912-005',
        recipientId: 'maya-chen',
        name: 'Maya Chen',
        category: 'Lifestyle',
        amount: 15000, // £150.00
        date: '2026-09-12',
        provider: 'worldpay',
        method: 'bank',
        status: 'completed',
        note: 'Weekly classes',
      },
      {
        id: 'txn-006',
        reference: 'REF-20260914-006',
        recipientId: 'birch-bloom',
        name: 'Birch & Bloom',
        category: 'Food & drink',
        amount: 4280, // £42.80
        date: '2026-09-14',
        provider: 'adyen',
        method: 'card',
        status: 'completed',
        note: 'Lunch',
      },
      {
        id: 'txn-007',
        reference: 'REF-20260916-007',
        recipientId: 'northline-studio',
        name: 'Northline Studio',
        category: 'Shopping',
        amount: 25500, // £255.00
        date: '2026-09-16',
        provider: 'adyen',
        method: 'card',
        status: 'completed',
        note: 'Art supplies',
      },
      {
        id: 'txn-008',
        reference: 'REF-20260918-008',
        recipientId: 'london-transit',
        name: 'London Transit',
        category: 'Transport',
        amount: 6000, // £60.00
        date: '2026-09-18',
        provider: 'adyen',
        method: 'card',
        status: 'completed',
        note: 'Taxi fare',
      },
    ],
    budgets: [
      { category: 'Shopping', limit: 100000 }, // £1000
      { category: 'Food & drink', limit: 50000 }, // £500
      { category: 'Transport', limit: 50000 }, // £500
      { category: 'Bills', limit: 90000 }, // £900
      { category: 'Lifestyle', limit: 30000 }, // £300
    ],
  };
}

/**
 * Calculate total spent in a category for September 2026
 * If category omitted, sum all completed transactions in the month
 */
export function monthlySpent(state: BankState, category?: Category): number {
  return state.transactions
    .filter((txn) => {
      // Only completed transactions
      if (txn.status !== 'completed') return false;
      // Only September 2026
      if (!txn.date.startsWith('2026-09')) return false;
      // Filter by category if provided
      if (category && txn.category !== category) return false;
      return true;
    })
    .reduce((sum, txn) => sum + txn.amount, 0);
}

/**
 * Update budget for a category
 * Parses amount string, validates, returns updated state or error
 */
export function updateBudget(
  state: BankState,
  category: Category,
  amount: string,
): { ok: true; state: BankState } | { ok: false; error: string } {
  // Validate category exists
  if (!['Shopping', 'Food & drink', 'Transport', 'Bills', 'Lifestyle'].includes(category)) {
    return { ok: false, error: 'Invalid category' };
  }

  // Parse amount
  const [pence, parseError] = parseAmount(amount);
  if (parseError) {
    return { ok: false, error: parseError };
  }

  if (pence === null) {
    return { ok: false, error: 'Invalid amount' };
  }

  // Update state
  const newState: BankState = {
    ...state,
    budgets: state.budgets.map((b) => (b.category === category ? { ...b, limit: pence } : b)),
  };

  return { ok: true, state: newState };
}

/**
 * Format pence to en-GB currency string
 * E.g. 3250 → "£32.50"
 */
export function money(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pounds);
}

/**
 * Execute a payment transaction
 * Validates domain, checks idempotency (same id must have same payload), applies scenario
 * Returns PaymentResult: {ok: true, state, transaction} or {ok: false, error}
 *
 * @param state Current bank state
 * @param draft Payment draft
 * @param scenario Simulation scenario: 'success' | 'declined' | 'unavailable'
 * @param id Unique idempotency key (transaction ID)
 * @param now ISO timestamp for transaction date
 */
export function executePayment(
  state: BankState,
  draft: PaymentDraft,
  scenario: Scenario,
  id: string,
  now: string,
): PaymentResult {
  // Validate idempotency key: must be non-empty
  if (!id || id.trim() === '') {
    return {
      ok: false,
      error: 'Transaction ID is required',
    };
  }

  if (!['success', 'declined', 'unavailable'].includes(scenario)) {
    return { ok: false, error: 'Invalid simulation scenario' };
  }

  // Accept a date or an ISO timestamp with an explicit timezone.
  const datePart = now.split('T')[0];
  const timestampValid =
    now === datePart ||
    (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(now) &&
      Number.isFinite(Date.parse(now)));
  if (!isCalendarDate(datePart) || !timestampValid) {
    return {
      ok: false,
      error: 'Invalid date format',
    };
  }

  // Check idempotency: if ID already exists, verify same payload
  const existing = state.transactions.find((txn) => txn.id === id);
  if (existing) {
    // Verify the payload matches the stored transaction
    const [existingAmount] = parseAmount(draft.amount);
    if (
      existingAmount !== existing.amount ||
      draft.recipientId !== existing.recipientId ||
      draft.method !== existing.method ||
      draft.note !== existing.note ||
      existing.status !== 'completed'
    ) {
      return {
        ok: false,
        error: 'Transaction ID already used with different payload',
      };
    }
    // Same id, same payload - return existing transaction
    return {
      ok: true,
      state,
      transaction: existing,
    };
  }

  // Validate payment
  const validationErrors = validatePayment(state, draft);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      error: validationErrors[0],
    };
  }

  // Parse amount (already validated)
  const [pence] = parseAmount(draft.amount);
  if (pence === null) {
    return {
      ok: false,
      error: 'Invalid amount',
    };
  }

  // Get recipient
  const recipient = RECIPIENTS.find((r) => r.id === draft.recipientId);
  if (!recipient) {
    return {
      ok: false,
      error: 'Recipient not found',
    };
  }

  // Apply scenario
  if (scenario === 'declined') {
    return {
      ok: false,
      error: 'Payment declined by provider',
    };
  }

  if (scenario === 'unavailable') {
    return {
      ok: false,
      error: 'Payment service temporarily unavailable',
    };
  }

  // Success path
  const provider = getProvider(draft.method);
  const transaction: Transaction = {
    id,
    reference: `REF-${now.split('T')[0].replace(/-/g, '')}-${id.slice(-3)}`,
    recipientId: draft.recipientId,
    name: recipient.name,
    category: recipient.category,
    amount: pence,
    date: now.split('T')[0], // Extract date part
    provider: provider.id,
    method: draft.method,
    status: 'completed',
    note: draft.note,
  };

  // Update state
  const newState: BankState = {
    ...state,
    balance: state.balance - pence,
    transactions: [...state.transactions, transaction],
  };

  return {
    ok: true,
    state: newState,
    transaction,
  };
}
