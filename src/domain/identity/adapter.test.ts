import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DIAGNOSTIC_KEYS,
  activateOnboardingAccount,
  activationDecision,
  completeJourneyStep,
  createOnboarding,
  fundOnboardingAccount,
  fundingDecision,
  redactDiagnosticRecord,
  resumePausedOnboarding,
  submitIdentityCheck,
  type SafeDiagnostic,
} from './adapter';
import { createSimulatedIdentityPort, simulatedEnvelope, toPortResult } from './simulation';
import {
  ONBOARDING_STORAGE_KEY,
  clearOnboarding,
  loadOnboarding,
  persistProgress,
} from './storage';
import {
  IDENTITY_JOURNEY_STEP,
  type IdentityDisposition,
  type OnboardingProgress,
  type ProgressStore,
} from './types';

const NOW = '2026-09-18T09:00:00Z';
const LATER = '2026-09-18T10:00:00Z';
const APPLICATION_ID = 'demo-onboarding';

const SECRET_VALUES = [
  'Avery Quinn',
  '1990-04-02',
  'DOC-88421',
  'QQ123456C',
  '14 Harbour Lane',
  'avery@example.test',
  '+447700900123',
  '04-00-11',
  'GB00MERD12345678',
  'PROVIDER_BLOB_77',
  'prov_secret_should_not_cross',
  'tok_live_should_not_appear',
  'refresh_should_not_appear',
  'sec_should_not_appear',
  'Bearer secret-header',
  '4242424242424242',
  'socket timeout token=tok_live_should_not_appear',
];

function memoryStore(initial?: string): ProgressStore & { snapshot: () => string | null } {
  let value: string | null = initial ?? null;
  return {
    read: () => value,
    write: (next: string) => {
      value = next;
    },
    remove: () => {
      value = null;
    },
    snapshot: () => value,
  };
}

function readyForIdentity(store: ProgressStore = memoryStore()): OnboardingProgress {
  let progress = createOnboarding(APPLICATION_ID, NOW);
  if (!progress) throw new Error('application was not created');
  for (const step of [1, 2, 3] as const) {
    const result = completeJourneyStep(progress, step, NOW);
    if (!result.ok) throw new Error(result.error);
    progress = result.progress;
  }
  expect(persistProgress(store, progress)).toBe(true);
  return progress;
}

function check(disposition: IdentityDisposition, store = memoryStore()) {
  const progress = readyForIdentity(store);
  return {
    store,
    result: submitIdentityCheck(progress, createSimulatedIdentityPort(disposition), store, LATER),
  };
}

function serialized(diagnostic: SafeDiagnostic, saved: string | null): string {
  return `${JSON.stringify(diagnostic)}\n${saved ?? ''}`;
}

describe('identity adapter', () => {
  describe('AC-01 distinct outcomes', () => {
    it('keeps verified, explicit rejection, and timeout/unavailable apart', () => {
      const verified = check('verified');
      const rejected = check('explicit_rejection');
      const timeout = check('timeout');
      const unavailable = check('unavailable');

      expect(verified.result.progress).toMatchObject({
        status: 'verified_ready',
        identityOutcome: 'verified',
        interruption: null,
        step: 5,
        activated: false,
        fundedMinor: 0,
      });
      expect(rejected.result.progress).toMatchObject({
        status: 'rejected',
        identityOutcome: 'explicit_rejection',
        interruption: null,
        step: IDENTITY_JOURNEY_STEP,
        activated: false,
        fundedMinor: 0,
      });
      expect(timeout.result.progress).toMatchObject({
        status: 'paused_recoverable',
        identityOutcome: 'timeout_unavailable',
        interruption: 'timeout',
        step: IDENTITY_JOURNEY_STEP,
      });
      expect(unavailable.result.progress).toMatchObject({
        status: 'paused_recoverable',
        identityOutcome: 'timeout_unavailable',
        interruption: 'unavailable',
        step: IDENTITY_JOURNEY_STEP,
      });

      expect(timeout.result.progress.status).not.toBe(rejected.result.progress.status);
      expect(timeout.result.progress.identityOutcome).not.toBe('explicit_rejection');
      expect(timeout.result.progress.identityOutcome).not.toBe('verified');
      expect(timeout.result.diagnostic.event).toBe('progress_saved');
      expect(rejected.result.diagnostic.event).toBe('identity_checked');
      expect(verified.result.progress.activated).toBe(false);
      expect(verified.result.progress.fundedMinor).toBe(0);
    });

    it('treats an unrecognised or thrown provider result as unavailable, not a rejection', () => {
      const progress = readyForIdentity();
      const malformed = submitIdentityCheck(
        progress,
        {
          verify: () =>
            ({ disposition: 'declined' }) as unknown as { disposition: IdentityDisposition },
        },
        memoryStore(),
        LATER,
      );
      expect(malformed.progress).toMatchObject({
        status: 'paused_recoverable',
        identityOutcome: 'timeout_unavailable',
        interruption: 'unavailable',
      });

      const thrown = submitIdentityCheck(
        progress,
        {
          verify() {
            throw new Error('socket timeout token=tok_live_should_not_appear');
          },
        },
        memoryStore(),
        LATER,
      );
      expect(thrown.progress.status).toBe('paused_recoverable');
      expect(thrown.progress.identityOutcome).not.toBe('explicit_rejection');
      expect(serialized(thrown.diagnostic, JSON.stringify(thrown.progress))).not.toContain(
        'tok_live_should_not_appear',
      );
    });
  });

  describe('saved progress and resume at step 4', () => {
    it('persists the pause and resumes at identity verification with earlier steps intact', () => {
      const store = memoryStore();
      const { result } = check('timeout', store);
      expect(result.ok).toBe(true);
      expect(result.saved).toBe(true);
      expect(result.progress.completedSteps).toEqual([1, 2, 3]);

      const restored = loadOnboarding(store);
      expect(restored.warning).toBeNull();
      expect(restored.progress).toEqual(result.progress);

      const resumed = resumePausedOnboarding(result.progress, store, LATER);
      expect(resumed.ok).toBe(true);
      expect(resumed.progress).toMatchObject({
        status: 'in_progress',
        step: IDENTITY_JOURNEY_STEP,
        completedSteps: [1, 2, 3],
        identityOutcome: 'timeout_unavailable',
        interruption: 'timeout',
        activated: false,
        fundedMinor: 0,
      });
      expect(loadOnboarding(store).progress?.status).toBe('in_progress');

      const verified = submitIdentityCheck(
        resumed.progress,
        createSimulatedIdentityPort('verified'),
        store,
        LATER,
      );
      expect(verified.ok).toBe(true);
      expect(verified.progress.status).toBe('verified_ready');
      expect(verified.progress.step).toBe(5);
      expect(verified.progress.completedSteps).toEqual([1, 2, 3, 4]);
    });

    it('does not offer resume for an explicit rejection', () => {
      const { result } = check('explicit_rejection');
      const resumed = resumePausedOnboarding(result.progress, memoryStore(), LATER);
      expect(resumed.ok).toBe(false);
      expect(resumed.progress).toBe(result.progress);
      expect(resumed.progress.status).toBe('rejected');
    });

    it('reports failure when the pause cannot be written', () => {
      const progress = readyForIdentity();
      const result = submitIdentityCheck(
        progress,
        createSimulatedIdentityPort('unavailable'),
        {
          read: () => null,
          write() {
            throw new Error('quota');
          },
          remove() {},
        },
        LATER,
      );
      expect(result.ok).toBe(false);
      expect(result.saved).toBe(false);
      expect(result.progress.status).toBe('paused_recoverable');
      expect(result.diagnostic.reasonCode).toBe('not_saved');
      expect(result.error).toMatch(/saved/i);
    });

    it('does not mutate the application passed in', () => {
      const progress = readyForIdentity();
      const snapshot = structuredClone(progress);
      Object.freeze(progress);
      Object.freeze(progress.completedSteps);
      const result = submitIdentityCheck(
        progress,
        createSimulatedIdentityPort('timeout'),
        memoryStore(),
        LATER,
      );
      expect(progress).toEqual(snapshot);
      expect(result.progress).not.toBe(progress);
    });
  });

  describe('AC-02 activation and funding stay closed', () => {
    it('refuses pending, paused, and rejected applications', () => {
      const pendingEarly = readyForIdentity();
      const pendingAtIdentity = completeJourneyStep(createOnboarding(APPLICATION_ID, NOW)!, 1, NOW);
      expect(pendingAtIdentity.ok).toBe(true);
      const timeout = check('timeout').result.progress;
      const unavailable = check('unavailable').result.progress;
      const rejected = check('explicit_rejection').result.progress;
      const verified = check('verified').result.progress;

      for (const progress of [
        pendingEarly,
        pendingAtIdentity.progress,
        timeout,
        unavailable,
        rejected,
      ]) {
        const store = memoryStore();
        const before = structuredClone(progress);
        const activation = activateOnboardingAccount(progress, store, LATER);
        const funding = fundOnboardingAccount(progress, 2500, store, LATER);
        expect(activation.ok).toBe(false);
        expect(funding.ok).toBe(false);
        expect(activation.progress).toBe(progress);
        expect(funding.progress).toBe(progress);
        expect(progress).toEqual(before);
        expect(progress.activated).toBe(false);
        expect(progress.fundedMinor).toBe(0);
        expect(store.snapshot()).toBeNull();
      }

      expect(activationDecision(pendingEarly).reasonCode).toBe('pending');
      expect(fundingDecision(timeout).reasonCode).toBe('paused');
      expect(fundingDecision(unavailable).reasonCode).toBe('paused');
      expect(activationDecision(rejected).reasonCode).toBe('rejected');
      expect(fundingDecision(verified).reasonCode).toBe('not_active');
      expect(activateOnboardingAccount(verified, memoryStore(), LATER).ok).toBe(true);
    });

    it('funds only a verified active account, in integer minor units, and only once', () => {
      const verified = check('verified').result.progress;
      const store = memoryStore();
      const blocked = fundOnboardingAccount(verified, 2500, store, LATER);
      expect(blocked.ok).toBe(false);
      expect(blocked.progress.fundedMinor).toBe(0);

      const activated = activateOnboardingAccount(verified, store, LATER);
      expect(activated.ok).toBe(true);
      expect(activated.progress.activated).toBe(true);
      expect(activated.progress.fundedMinor).toBe(0);

      const invalid = fundOnboardingAccount(activated.progress, 10.5, store, LATER);
      expect(invalid.ok).toBe(false);
      expect(invalid.progress.fundedMinor).toBe(0);

      const funded = fundOnboardingAccount(activated.progress, 2500, store, LATER);
      expect(funded.ok).toBe(true);
      expect(funded.progress.fundedMinor).toBe(2500);
      const again = fundOnboardingAccount(funded.progress, 100, store, LATER);
      expect(again.ok).toBe(false);
      expect(again.progress.fundedMinor).toBe(2500);
    });
  });

  describe('AC-03 diagnostic redaction', () => {
    it('drops identity attributes, provider payloads, personal and account data, tokens, and secrets', () => {
      const leaked = {
        component: 'onboarding-identity-adapter',
        event: 'progress_saved',
        applicationId: APPLICATION_ID,
        outcome: 'timeout_unavailable',
        interruption: 'timeout',
        step: IDENTITY_JOURNEY_STEP,
        status: 'paused_recoverable',
        activated: false,
        fundedMinor: 0,
        reasonCode: 'none',
        givenName: 'Avery Quinn',
        dateOfBirth: '1990-04-02',
        documentNumber: 'DOC-88421',
        nationalId: 'QQ123456C',
        addressLine: '14 Harbour Lane',
        email: 'avery@example.test',
        phone: '+447700900123',
        accountNumber: '12345678',
        sortCode: '04-00-11',
        iban: 'GB00MERD12345678',
        providerPayload: { raw: 'PROVIDER_BLOB_77', secret: 'prov_secret_should_not_cross' },
        accessToken: 'tok_live_should_not_appear',
        refreshToken: 'refresh_should_not_appear',
        clientSecret: 'sec_should_not_appear',
        authorization: 'Bearer secret-header',
        pan: '4242424242424242',
      };

      const diagnostic = redactDiagnosticRecord(leaked);
      const encoded = JSON.stringify(diagnostic);
      expect(Object.keys(diagnostic).sort()).toEqual([...DIAGNOSTIC_KEYS].sort());
      for (const secret of [...SECRET_VALUES, '12345678']) expect(encoded).not.toContain(secret);
      expect(encoded).not.toContain('givenName');
      expect(encoded).not.toContain('providerPayload');
      expect(encoded).not.toContain('accountNumber');
      expect(diagnostic.applicationId).toBe(APPLICATION_ID);
      expect(diagnostic.outcome).toBe('timeout_unavailable');

      const store = memoryStore();
      const polluted = submitIdentityCheck(
        readyForIdentity(store),
        {
          verify: () =>
            ({
              disposition: 'timeout',
              providerPayload: { raw: 'PROVIDER_BLOB_77' },
              documentNumber: 'DOC-88421',
              accessToken: 'tok_live_should_not_appear',
              accountNumber: '12345678',
            }) as { disposition: IdentityDisposition },
        },
        store,
        LATER,
      );
      const saved = serialized(polluted.diagnostic, store.snapshot());
      for (const secret of [
        'PROVIDER_BLOB_77',
        'DOC-88421',
        'tok_live_should_not_appear',
        '12345678',
      ]) {
        expect(saved).not.toContain(secret);
      }
      expect(polluted.diagnostic.component).toBe('onboarding-identity-adapter');
    });
  });

  it('strips the simulated provider payload at the port boundary', () => {
    const envelope = simulatedEnvelope('timeout');
    const portResult = toPortResult(envelope);
    expect(portResult).toEqual({ disposition: 'timeout' });
    expect(Object.keys(portResult)).toEqual(['disposition']);
    expect(JSON.stringify(portResult)).not.toContain(envelope.providerPayload.secret);
    expect(envelope.providerPayload.raw).toBe('PROVIDER_BLOB_77');
  });

  it('requires earlier steps before identity verification', () => {
    const created = createOnboarding(APPLICATION_ID, NOW)!;
    const skipped = submitIdentityCheck(
      created,
      createSimulatedIdentityPort('verified'),
      memoryStore(),
      LATER,
    );
    expect(skipped.ok).toBe(false);
    expect(skipped.progress).toBe(created);
    const outOfOrder = completeJourneyStep(created, 2, NOW);
    expect(outOfOrder.ok).toBe(false);
  });
});

describe('onboarding storage', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      key: (index: number) => Object.keys(mockStorage)[index] ?? null,
      get length() {
        return Object.keys(mockStorage).length;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a recoverable pause and clears it', () => {
    const { result } = check('unavailable');
    expect(persistProgress(browserStore(), result.progress)).toBe(true);
    expect(loadOnboarding().progress).toEqual(result.progress);
    expect(clearOnboarding()).toBe(true);
    expect(loadOnboarding()).toEqual({ progress: null, warning: null });
    expect(mockStorage[ONBOARDING_STORAGE_KEY]).toBeUndefined();
  });

  it('drops corrupt, extra, and illegally funded records', () => {
    mockStorage[ONBOARDING_STORAGE_KEY] = '{';
    expect(loadOnboarding().warning).toMatch(/Corrupted/);

    const { result } = check('timeout');
    mockStorage[ONBOARDING_STORAGE_KEY] = JSON.stringify({
      ...result.progress,
      documentNumber: 'DOC-88421',
    });
    expect(loadOnboarding().progress).toBeNull();

    mockStorage[ONBOARDING_STORAGE_KEY] = JSON.stringify({
      ...result.progress,
      status: 'rejected',
      identityOutcome: 'explicit_rejection',
      interruption: null,
      fundedMinor: 2500,
      activated: true,
    });
    expect(loadOnboarding().warning).toMatch(/Invalid/);
    expect(loadOnboarding().progress).toBeNull();
  });
});

function browserStore(): ProgressStore {
  return {
    read: () => localStorage.getItem(ONBOARDING_STORAGE_KEY),
    write: (value: string) => localStorage.setItem(ONBOARDING_STORAGE_KEY, value),
    remove: () => localStorage.removeItem(ONBOARDING_STORAGE_KEY),
  };
}
