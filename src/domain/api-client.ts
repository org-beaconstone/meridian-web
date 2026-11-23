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

const REQUEST_TIMEOUT_MS = 15000;

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error && typeof error.name === 'string' ? error.name : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return name === 'TimeoutError' || /timeout/i.test(message);
}

function isPaymentPath(path: string): boolean {
  return path === '/payments';
}

function timeoutMessage(path: string): string {
  return isPaymentPath(path)
    ? 'The payment request timed out. The outcome may be unknown. Retry the same payment, not a new one.'
    : 'The request timed out before a response arrived. Try again.';
}

function connectionMessage(path: string): string {
  return isPaymentPath(path)
    ? 'API connection lost. The payment outcome may be unknown. Retry the same payment, not a new one.'
    : 'API connection lost. Check connectivity and try again.';
}

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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (isTimeoutError(error)) throw new ApiFailure(timeoutMessage(path), 'TIMEOUT', 408);
      throw new ApiFailure(connectionMessage(path), 'NETWORK_ERROR', 0);
    }
    const timedOut = response.status === 408 || response.status === 504;
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      if (timedOut) throw new ApiFailure(timeoutMessage(path), 'TIMEOUT', response.status);
      throw new ApiFailure(
        'Invalid API response. Check connectivity before retrying.',
        'INVALID_RESPONSE',
        response.status,
      );
    }
    if (!value || typeof value !== 'object')
      throw new ApiFailure('Invalid API response', 'INVALID_RESPONSE');
    const result = value as Record<string, unknown>;
    if (!response.ok) {
      const serverError = typeof result.error === 'string' ? result.error : '';
      const serverCode = typeof result.code === 'string' ? result.code : '';
      throw new ApiFailure(
        serverError || (timedOut ? timeoutMessage(path) : `API returned ${response.status}`),
        serverCode || (timedOut ? 'TIMEOUT' : 'HTTP_ERROR'),
        response.status,
      );
    }
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
