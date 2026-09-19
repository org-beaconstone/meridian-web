import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiFailure } from './api-client';
import { createInitialState } from './model';
afterEach(() => vi.unstubAllGlobals());
describe('connected API contract', () => {
  it('sends room and preserved idempotency key and validates receipt', async () => {
    const state = createInitialState(),
      transaction = state.transactions[0];
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, state, transaction }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetcher);
    const result = await new ApiClient('/api/v1', 'room-a').submitPayment(
      'birch-bloom',
      3500,
      'card',
      '',
      'success',
      'same-key',
    );
    expect(result.ok).toBe(true);
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({
      'X-Rehearsal-Session': 'room-a',
      'Idempotency-Key': 'same-key',
    });
  });
  it('preserves pending outcome instead of fabricating receipt', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: false,
              code: 'PAYMENT_PENDING',
              error: 'Pending',
              paymentId: 'intent-1',
            }),
            { status: 202 },
          ),
        ),
    );
    expect(
      await new ApiClient('/api/v1', 'room-a').submitPayment(
        'birch-bloom',
        3500,
        'card',
        '',
        'success',
        'same-key',
      ),
    ).toMatchObject({ ok: false, code: 'PAYMENT_PENDING', paymentId: 'intent-1' });
  });
  it('rejects invalid state and retains HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ state: createInitialState() }), { status: 200 }),
        ),
    );
    await expect(new ApiClient('/api/v1', 'room-a').getState()).rejects.toThrow(
      'invalid bank state',
    );
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ ok: false, error: 'Different payload', code: 'HTTP_409' }),
            { status: 409 },
          ),
        ),
    );
    await expect(new ApiClient('/api/v1', 'room-a').reset()).rejects.toMatchObject({
      status: 409,
      code: 'HTTP_409',
    });
  });
  it('never fabricates local success on lost response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    await expect(new ApiClient('/api/v1', 'room-a').reset()).rejects.toBeInstanceOf(ApiFailure);
  });
});
