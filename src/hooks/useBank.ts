import { useEffect, useRef, useState } from 'react';
import { ApiClient, ApiFailure, getApiBaseUrl, isConnectedMode } from '../domain/api-client';
import { loadState, saveState } from '../domain/storage';
import {
  createInitialState,
  executePayment,
  parseAmount,
  updateBudget as editBudget,
  DEMO_DATE,
  type BankState,
  type PaymentDraft,
  type Scenario,
  type Category,
  type Transaction,
} from '../domain/model';

export function useBank() {
  const [connectionMode] = useState<'connected' | 'standalone'>(
    isConnectedMode() ? 'connected' : 'standalone',
  );
  const [initial] = useState(() =>
    connectionMode === 'standalone' ? loadState() : { state: createInitialState(), warning: null },
  );
  const [state, setState] = useState(initial.state);
  const stateRef = useRef(state);
  const [warning, setWarning] = useState<string | null>(initial.warning);
  const [sessionId, setSessionId] = useState('meridian-rehearsal');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>(
    connectionMode === 'standalone' ? 'connected' : 'connecting',
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useRef<ApiClient | null>(null);
  const epoch = useRef(0);
  const revision = useRef(0);
  const mutating = useRef(false);
  const apply = (value: BankState) => {
    stateRef.current = value;
    setState(value);
  };

  useEffect(() => {
    if (connectionMode === 'standalone' && !saveState(state))
      setWarning('Changes are kept for this visit only. Browser storage is unavailable.');
  }, [state, connectionMode]);

  useEffect(() => {
    if (connectionMode !== 'connected') return;
    const generation = ++epoch.current;
    const api = new ApiClient(getApiBaseUrl(), sessionId);
    client.current = api;
    let disposed = false,
      timer: ReturnType<typeof setTimeout>;
    setConnectionStatus('connecting');
    setConnectionError(null);
    async function poll() {
      const started = revision.current;
      try {
        if (!mutating.current) {
          const next = await api.getState();
          if (
            !disposed &&
            epoch.current === generation &&
            started === revision.current &&
            !mutating.current
          ) {
            apply(next);
            setConnectionStatus('connected');
            setConnectionError(null);
          }
        }
      } catch (error) {
        if (!disposed && epoch.current === generation && started === revision.current) {
          setConnectionStatus('error');
          setConnectionError(error instanceof Error ? error.message : 'API unavailable');
        }
      } finally {
        if (!disposed) timer = setTimeout(poll, 2000);
      }
    }
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [connectionMode, sessionId]);

  async function mutation<T>(action: (api: ApiClient) => Promise<T>): Promise<T> {
    if (mutating.current) throw new Error('A change is already in progress.');
    if (!client.current || connectionStatus !== 'connected')
      throw new Error('API unavailable. Wait for reconnection; no local fallback is used.');
    mutating.current = true;
    setBusy(true);
    revision.current++;
    const generation = epoch.current;
    try {
      const result = await action(client.current);
      if (epoch.current !== generation) throw new Error('Rehearsal session changed');
      return result;
    } catch (error) {
      if (error instanceof ApiFailure && error.status === 0) {
        setConnectionStatus('error');
        setConnectionError(error.message);
      }
      throw error;
    } finally {
      revision.current++;
      mutating.current = false;
      setBusy(false);
    }
  }
  async function submitPayment(
    draft: PaymentDraft,
    scenario: Scenario,
    key: string,
  ): Promise<{
    ok: boolean;
    transaction?: Transaction;
    error?: string;
    code?: string;
    paymentId?: string;
  }> {
    try {
      if (connectionMode === 'standalone') {
        const result = executePayment(stateRef.current, draft, scenario, key, DEMO_DATE);
        if (result.ok) {
          apply(result.state);
          return { ok: true, transaction: result.transaction };
        }
        return result;
      }
      const [amount, error] = parseAmount(draft.amount);
      if (amount === null) return { ok: false, error: error || 'Invalid amount' };
      const result = await mutation((api) =>
        api.submitPayment(draft.recipientId, amount, draft.method, draft.note, scenario, key),
      );
      if (result.ok) apply(result.state);
      return result;
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Payment failed',
        code: error instanceof ApiFailure ? error.code : undefined,
      };
    }
  }
  async function updateBudget(category: Category, limitMinor: number) {
    try {
      if (connectionMode === 'standalone') {
        const result = editBudget(stateRef.current, category, (limitMinor / 100).toFixed(2));
        if (result.ok) apply(result.state);
        return result;
      }
      const result = await mutation((api) => api.updateBudget(category, limitMinor));
      apply(result.state);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Budget update failed' };
    }
  }
  async function reset() {
    try {
      if (connectionMode === 'standalone') {
        setWarning(null);
        apply(createInitialState());
        return { ok: true };
      }
      const result = await mutation((api) => api.reset());
      apply(result.state);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Reset failed' };
    }
  }
  async function changeSession(next: string) {
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(next))
      throw new Error('Use 3-64 letters, numbers, hyphens or underscores.');
    if (mutating.current) throw new Error('Wait for the current request before switching rooms.');
    if (next === sessionId) return;
    epoch.current++;
    revision.current++;
    setConnectionStatus('connecting');
    setConnectionError(null);
    setSessionId(next);
  }
  return {
    state,
    warning,
    busy,
    connectionMode,
    connectionStatus,
    connectionError,
    sessionId,
    submitPayment,
    updateBudget,
    reset,
    changeSession,
  };
}
