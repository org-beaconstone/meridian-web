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
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      recipientId: 'birch-bloom',
      amountMinor: 3500,
      method: 'card',
      note: '',
      scenario: 'success',
    });
  });
  it('attaches the euro idempotency key to the JSON payload', async () => {
    const state = createInitialState();
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, state, transaction: state.transactions[0] }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    await new ApiClient('/api/v1', 'room-a').submitPayment(
      'eur-DE89370400440532013000',
      2150,
      'bank',
      'Invoice',
      'success',
      '11111111-1111-4111-8111-111111111111',
      {
        idempotencyKey: '11111111-1111-4111-8111-111111111111',
        corridor: 'eur-sepa',
        recipientId: 'eur-DE89370400440532013000',
        recipientName: 'Ada Berger',
        amountMinor: 2500,
        currency: 'EUR',
        debitMinor: 2150,
        method: 'bank',
        note: 'Invoice',
        iban: 'DE89370400440532013000',
        feeMinor: 0,
        feeCurrency: 'EUR',
        exchangeRate: '€1.00 = £0.86',
        estimatedClearing: 'Next business day · Monday 21 September 2026',
      },
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      corridor: 'eur-sepa',
      iban: 'DE89370400440532013000',
      settlementAmount: 2500,
      settlementCurrency: 'EUR',
      feeMinor: 0,
      amountMinor: 2150,
    });
    expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
  });
  it('preserves pending outcome instead of fabricating receipt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
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
