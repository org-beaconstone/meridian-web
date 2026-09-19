import type { BankState, Category, Scenario, Transaction } from './model';
import { BankStateSchema } from './storage';
export class ApiFailure extends Error {
  constructor(
    message: string,
    public code = 'NETWORK_ERROR',
    public status = 0,
  ) {
    super(message);
  }
}
export type PaymentReply =
  | { ok: true; state: BankState; transaction: Transaction }
  | { ok: false; error: string; code: string; paymentId?: string };
export class ApiClient {
  constructor(
    private baseUrl: string,
    private sessionId: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }
  private async request(
    method: string,
    path: string,
    body?: unknown,
    extra?: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Rehearsal-Session': this.sessionId,
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ApiFailure(
        'API connection lost. The payment outcome may be unknown. Retry the same payment, not a new one.',
      );
    }
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new ApiFailure(
        'Invalid API response. Check connectivity before retrying.',
        'INVALID_RESPONSE',
        response.status,
      );
    }
    if (!value || typeof value !== 'object')
      throw new ApiFailure('Invalid API response', 'INVALID_RESPONSE');
    const result = value as Record<string, unknown>;
    if (!response.ok)
      throw new ApiFailure(
        typeof result.error === 'string' ? result.error : `API returned ${response.status}`,
        typeof result.code === 'string' ? result.code : 'HTTP_ERROR',
        response.status,
      );
    return result;
  }
  async getState(): Promise<BankState> {
    const result = BankStateSchema.safeParse(await this.request('GET', '/state'));
    if (!result.success)
      throw new ApiFailure('API returned invalid bank state', 'INVALID_RESPONSE');
    return result.data;
  }
  async submitPayment(
    recipientId: string,
    amountMinor: number,
    method: 'card' | 'bank',
    note: string,
    scenario: Scenario,
    key: string,
  ): Promise<PaymentReply> {
    const result = await this.request(
      'POST',
      '/payments',
      { recipientId, amountMinor, method, note, scenario },
      { 'Idempotency-Key': key },
    );
    if (result.ok !== true)
      return {
        ok: false,
        error: String(result.error || 'Payment awaiting confirmation'),
        code: String(result.code || 'PAYMENT_PENDING'),
        paymentId: typeof result.paymentId === 'string' ? result.paymentId : undefined,
      };
    const state = BankStateSchema.parse(result.state);
    const candidate = result.transaction as Partial<Transaction> | undefined;
    const transaction = state.transactions.find((item) => item.id === candidate?.id);
    if (!transaction || transaction.status !== 'completed')
      throw new ApiFailure('Payment receipt missing from ledger', 'INVALID_RESPONSE');
    return { ok: true, state, transaction };
  }
  async updateBudget(category: Category, limitMinor: number) {
    return this.mutate('PATCH', '/budgets', { category, limitMinor });
  }
  async reset() {
    return this.mutate('POST', '/reset');
  }
  private async mutate(method: string, path: string, body?: unknown) {
    const value = await this.request(method, path, body);
    if (value.ok !== true) throw new ApiFailure('API mutation failed');
    return { ok: true as const, state: BankStateSchema.parse(value.state) };
  }
}
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || '';
}
export function isConnectedMode(): boolean {
  return Boolean(getApiBaseUrl());
}
