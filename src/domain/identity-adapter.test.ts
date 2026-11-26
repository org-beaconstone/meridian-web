import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from './model';
import {
  IDENTITY_DIAGNOSTIC_FIELDS,
  IDENTITY_JOURNEY_STEP,
  ONBOARDING_STORAGE_KEY,
  PERSONAL_CURRENT_ACCOUNT,
  accountMayBeFunded,
  activateAndFund,
  applyIdentityResult,
  browserOnboardingStore,
  createIdentityCheckpoint,
  createMemoryOnboardingStore,
  createSimulatedIdentityProvider,
  redactDiagnostic,
  resumeOnboarding,
  runIdentityCheck,
  type IdentityDiagnostic,
  type IdentityProvider,
  type IdentityProviderResult,
  type OnboardingProgress,
  type OnboardingStore,
} from './identity-adapter';

const NOW = '2026-09-18T09:30:00Z';
const LATER = '2026-09-18T10:00:00Z';
const LEAKS = [
  'DOC-554433',
  'Avery Quinn',
  '1991-07-14',
  'avery.quinn@example.com',
  '1 Harbour Lane',
  'acct-10293847',
  'sort-11-22-33',
  'tok_live_identity',
  'super-secret-value',
  'provider-payload-marker',
];

const HOSTILE_BODY = {
  documentNumber: 'DOC-554433',
  givenName: 'Avery Quinn',
  dateOfBirth: '1991-07-14',
  email: 'avery.quinn@example.com',
  address: '1 Harbour Lane',
  accountNumber: 'acct-10293847',
  sortCode: 'sort-11-22-33',
  accessToken: 'tok_live_identity',
  clientSecret: 'super-secret-value',
  providerPayload: 'provider-payload-marker',
  nested: { raw: ['DOC-554433', { token: 'tok_live_identity' }] },
};

function expectNoLeaks(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const leak of LEAKS) expect(serialized).not.toContain(leak);
}

function checkpoint(applicationRef = 'app-2048'): OnboardingProgress {
  const created = createIdentityCheckpoint(applicationRef, PERSONAL_CURRENT_ACCOUNT);
  if (!created.ok) throw new Error(created.error);
  return created.progress;
}

function providerResult(status: IdentityProviderResult['status']): IdentityProviderResult {
  return { status, providerPayload: HOSTILE_BODY };
}

describe('identity adapter', () => {
  describe('distinct outcomes', () => {
    it('keeps verified, explicit rejection, and timeout/unavailable apart', () => {
      const verified = applyIdentityResult(
        checkpoint('app-verified'),
        providerResult('verified'),
        createMemoryOnboardingStore(),
        NOW,
      );
      const rejected = applyIdentityResult(
        checkpoint('app-rejected'),
        providerResult('rejected'),
        createMemoryOnboardingStore(),
        NOW,
      );
      const timedOut = applyIdentityResult(
        checkpoint('app-timeout'),
        providerResult('timeout'),
        createMemoryOnboardingStore(),
        NOW,
      );
      const unavailable = applyIdentityResult(
        checkpoint('app-unavailable'),
        providerResult('unavailable'),
        createMemoryOnboardingStore(),
        NOW,
      );

      expect(verified.ok && verified.outcome).toBe('verified');
      expect(rejected.ok && rejected.outcome).toBe('rejected');
      expect(timedOut.ok && timedOut.outcome).toBe('timeout_unavailable');
      expect(unavailable.ok && unavailable.outcome).toBe('timeout_unavailable');
      expect(
        new Set([
          verified.ok && verified.outcome,
          rejected.ok && rejected.outcome,
          timedOut.ok && timedOut.outcome,
        ]).size,
      ).toBe(3);

      expect(verified.ok && verified.progress.pause).toBeNull();
      expect(rejected.ok && rejected.progress.pause).toBeNull();
      expect(rejected.ok && rejected.progress.identityStatus).toBe('rejected');
      expect(timedOut.ok && timedOut.progress.identityStatus).not.toBe('rejected');
      expect(timedOut.ok && timedOut.progress.pause).toEqual({
        recoverable: true,
        reason: 'timeout',
        savedAt: NOW,
      });
      expect(unavailable.ok && unavailable.progress.pause).toEqual({
        recoverable: true,
        reason: 'unavailable',
        savedAt: NOW,
      });
      expect(timedOut.ok && timedOut.diagnostic.reasonCode).toBe('timeout');
      expect(unavailable.ok && unavailable.diagnostic.reasonCode).toBe('unavailable');
      expect(rejected.ok && rejected.diagnostic.reasonCode).toBe('explicit_rejection');
    });

    it('treats a malformed provider body as unavailable rather than a rejection', () => {
      const result = applyIdentityResult(
        checkpoint(),
        { status: 'declined', ...HOSTILE_BODY } as unknown as IdentityProviderResult,
        createMemoryOnboardingStore(),
        NOW,
      );
      expect(result.ok && result.outcome).toBe('timeout_unavailable');
      if (!result.ok || result.outcome !== 'timeout_unavailable') {
        throw new Error('expected pause');
      }
      expect(result.progress.identityStatus).toBe('unavailable');
      expect(result.progress.pause?.reason).toBe('unavailable');
      expect(result.progress.identityStatus).not.toBe('rejected');
      expectNoLeaks(result);
    });

    it('does not let a later timeout or approval overwrite a final decision', () => {
      const store = createMemoryOnboardingStore();
      const verified = applyIdentityResult(checkpoint(), providerResult('verified'), store, NOW);
      if (!verified.ok) throw new Error(verified.error);
      const lateTimeout = applyIdentityResult(
        verified.progress,
        providerResult('timeout'),
        store,
        LATER,
      );
      expect(lateTimeout.ok).toBe(false);
      expect(lateTimeout.progress?.identityStatus).toBe('verified');
      expect(store.load('app-2048')?.identityStatus).toBe('verified');

      const rejectedStore = createMemoryOnboardingStore();
      const rejected = applyIdentityResult(
        checkpoint(),
        providerResult('rejected'),
        rejectedStore,
        NOW,
      );
      if (!rejected.ok) throw new Error(rejected.error);
      const lateApproval = applyIdentityResult(
        rejected.progress,
        providerResult('verified'),
        rejectedStore,
        LATER,
      );
      expect(lateApproval.ok).toBe(false);
      expect(rejectedStore.load('app-2048')?.identityStatus).toBe('rejected');
      expect(rejectedStore.load('app-2048')?.account).toEqual({
        phase: 'inactive',
        fundedMinorUnits: 0,
      });
    });
  });

  describe('saved progress and resume', () => {
    it('saves a recoverable pause and resumes the same scope at journey step 4', () => {
      const store = createMemoryOnboardingStore();
      const start = checkpoint();
      const paused = applyIdentityResult(start, providerResult('timeout'), store, NOW);
      expect(start.identityStatus).toBe('pending');
      if (!paused.ok || paused.outcome !== 'timeout_unavailable') throw new Error('expected pause');

      expect(paused.resume).toEqual({
        scope: PERSONAL_CURRENT_ACCOUNT,
        journeyStep: IDENTITY_JOURNEY_STEP,
        applicationRef: 'app-2048',
      });
      expect(paused.resume.journeyStep).toBe(4);
      expect(paused.persisted).toBe(true);
      expect(store.load('app-2048')).toEqual(paused.progress);
      expect(paused.progress.completedSteps).toEqual([1, 2, 3]);
      expect(paused.progress.account).toEqual({ phase: 'inactive', fundedMinorUnits: 0 });

      const resumed = resumeOnboarding(store, 'app-2048');
      if (!resumed.ok) throw new Error(resumed.error);
      expect(resumed.resume).toEqual({
        scope: 'personal-current-account',
        journeyStep: 4,
        applicationRef: 'app-2048',
      });
      expect(resumed.progress.journeyStep).toBe(4);
      expect(resumed.progress.scope).toBe('personal-current-account');
      expect(resumed.progress.completedSteps).toEqual([1, 2, 3]);
      expect(resumed.progress.identityStatus).toBe('pending');
      expect(resumed.progress.pause).toBeNull();
      expect(resumed.progress.account).toEqual({ phase: 'inactive', fundedMinorUnits: 0 });
      expect(store.load('app-2048')).toEqual(resumed.progress);

      const retried = resumeOnboarding(store, 'app-2048');
      if (!retried.ok) throw new Error(retried.error);
      expect(retried.resume).toEqual(resumed.resume);
      expect(retried.progress.account).toEqual({ phase: 'inactive', fundedMinorUnits: 0 });
    });

    it('resumes an unavailable provider the same way as a timeout', () => {
      const store = createMemoryOnboardingStore();
      const paused = runIdentityCheck(
        checkpoint(),
        createSimulatedIdentityProvider('unavailable'),
        store,
        NOW,
      );
      if (!paused.ok || paused.outcome !== 'timeout_unavailable') throw new Error('expected pause');
      const resumed = resumeOnboarding(store, 'app-2048');
      if (!resumed.ok) throw new Error(resumed.error);
      expect(resumed.resume.scope).toBe(PERSONAL_CURRENT_ACCOUNT);
      expect(resumed.resume.journeyStep).toBe(4);
      expect(resumed.progress.completedSteps).toEqual([1, 2, 3]);
    });

    it('refuses to resume an explicit rejection', () => {
      const store = createMemoryOnboardingStore();
      const rejected = applyIdentityResult(checkpoint(), providerResult('rejected'), store, NOW);
      if (!rejected.ok) throw new Error(rejected.error);
      expect(rejected.progress.pause).toBeNull();
      const resumed = resumeOnboarding(store, 'app-2048');
      expect(resumed.ok).toBe(false);
      if (resumed.ok) return;
      expect(resumed.error).toBe('Rejected identity cannot be resumed');
      expect(resumed.progress?.identityStatus).toBe('rejected');
      expect(resumed.progress?.account.fundedMinorUnits).toBe(0);
    });

    it('does not offer resume when the pause could not be saved', () => {
      const store: OnboardingStore = { save: () => false, load: () => null };
      const seen: IdentityDiagnostic[] = [];
      const paused = applyIdentityResult(
        checkpoint(),
        providerResult('unavailable'),
        store,
        NOW,
        (event) => seen.push(event),
      );
      expect(paused.ok).toBe(false);
      expect(paused.persisted).toBe(false);
      expect(paused.progress?.pause?.recoverable).toBe(true);
      expect(paused.progress?.account).toEqual({ phase: 'inactive', fundedMinorUnits: 0 });
      expect(seen).toEqual([]);
      expect(resumeOnboarding(store, 'app-2048').ok).toBe(false);
    });

    it('keeps the saved pause free of later caller mutations', () => {
      const store = createMemoryOnboardingStore();
      const paused = applyIdentityResult(checkpoint(), providerResult('timeout'), store, NOW);
      if (!paused.ok) throw new Error(paused.error);
      (paused.progress as OnboardingProgress & { documentNumber?: string }).documentNumber =
        'DOC-554433';
      expectNoLeaks(store.load('app-2048'));
    });
  });

  describe('activation and funding gate', () => {
    it.each(['pending', 'timeout', 'unavailable', 'rejected'] as const)(
      'does not activate or fund a %s identity',
      (status) => {
        const store = createMemoryOnboardingStore();
        const ledger = createInitialState();
        const progress =
          status === 'pending'
            ? checkpoint()
            : applyIdentityResult(
                checkpoint(),
                providerResult(status === 'rejected' ? 'rejected' : status),
                store,
                NOW,
              );
        const subject = 'ok' in progress ? progress.progress : progress;
        if (!subject) throw new Error('missing progress');
        const seen: IdentityDiagnostic[] = [];
        const funded = activateAndFund(subject, 2500, store, (event) => seen.push(event));
        expect(funded.ok).toBe(false);
        if (funded.ok) return;
        expect(funded.progress?.account).toEqual({ phase: 'inactive', fundedMinorUnits: 0 });
        expect(funded.progress?.account.phase).not.toBe('active');
        expect(accountMayBeFunded(subject)).toBe(false);
        expect(store.load('app-2048')?.account.fundedMinorUnits ?? 0).toBe(0);
        expect(ledger.balance).toBe(1248050);
        expect(seen[0]?.outcome).toBe('activation_refused');
        expectNoLeaks(funded);
        expectNoLeaks(seen);
      },
    );

    it('funds a verified identity once, in minor units, and ignores a conflicting second amount', () => {
      const store = createMemoryOnboardingStore();
      const verified = runIdentityCheck(
        checkpoint(),
        createSimulatedIdentityProvider('verified'),
        store,
        NOW,
      );
      if (!verified.ok || verified.outcome !== 'verified') throw new Error('expected verified');
      expect(verified.progress.account).toEqual({ phase: 'inactive', fundedMinorUnits: 0 });
      expect(accountMayBeFunded(verified.progress)).toBe(true);

      const funded = activateAndFund(verified.progress, 2500, store);
      if (!funded.ok) throw new Error(funded.error);
      expect(funded.progress.account).toEqual({ phase: 'active', fundedMinorUnits: 2500 });
      expect(funded.progress.journeyStep).toBe(5);
      expect(funded.progress.identityStatus).toBe('verified');

      const replay = activateAndFund(funded.progress, 2500, store);
      if (!replay.ok) throw new Error(replay.error);
      expect(replay.progress.account.fundedMinorUnits).toBe(2500);

      const changed = activateAndFund(funded.progress, 2600, store);
      expect(changed.ok).toBe(false);
      expect(store.load('app-2048')?.account.fundedMinorUnits).toBe(2500);
    });

    it('completes a paused journey only after a later verification', () => {
      const store = createMemoryOnboardingStore();
      const paused = runIdentityCheck(
        checkpoint(),
        createSimulatedIdentityProvider('timeout'),
        store,
        NOW,
      );
      if (!paused.ok) throw new Error(paused.error);
      expect(activateAndFund(paused.progress, 1500, store).ok).toBe(false);

      const resumed = resumeOnboarding(store, 'app-2048');
      if (!resumed.ok) throw new Error(resumed.error);
      expect(activateAndFund(resumed.progress, 1500, store).ok).toBe(false);

      const verified = runIdentityCheck(
        resumed.progress,
        createSimulatedIdentityProvider('verified'),
        store,
        LATER,
      );
      if (!verified.ok || verified.outcome !== 'verified') throw new Error('expected verified');
      const funded = activateAndFund(verified.progress, 1500, store);
      if (!funded.ok) throw new Error(funded.error);
      expect(funded.progress.account).toEqual({ phase: 'active', fundedMinorUnits: 1500 });
      expect(resumeOnboarding(store, 'app-2048').ok).toBe(false);
    });

    it('rejects unsafe opening amounts without activating a verified identity', () => {
      const store = createMemoryOnboardingStore();
      const verified = applyIdentityResult(checkpoint(), providerResult('verified'), store, NOW);
      if (!verified.ok) throw new Error(verified.error);
      for (const amount of [1.5, -1, Number.NaN, 1_000_001]) {
        const result = activateAndFund(verified.progress, amount, store);
        expect(result.ok).toBe(false);
        expect(store.load('app-2048')?.account).toEqual({ phase: 'inactive', fundedMinorUnits: 0 });
      }
    });
  });

  describe('diagnostics', () => {
    it('redacts identity attributes, provider payloads, account data, tokens and secrets', () => {
      const redacted = redactDiagnostic({
        component: 'identity-adapter',
        applicationRef: 'app-2048',
        scope: PERSONAL_CURRENT_ACCOUNT,
        journeyStep: 4,
        outcome: 'timeout_unavailable',
        reasonCode: 'timeout',
        ...HOSTILE_BODY,
      });
      expect(redacted).toEqual({
        component: 'identity-adapter',
        applicationRef: 'app-2048',
        scope: 'personal-current-account',
        journeyStep: 4,
        outcome: 'timeout_unavailable',
        reasonCode: 'timeout',
      });
      expect(Object.keys(redacted ?? {}).sort()).toEqual([...IDENTITY_DIAGNOSTIC_FIELDS].sort());
      expectNoLeaks(redacted);
      expect(
        redactDiagnostic({ accessToken: 'tok_live_identity', clientSecret: 'super-secret-value' }),
      ).toBeNull();
      expect(
        redactDiagnostic({
          component: 'identity-adapter',
          applicationRef: 'app-2048',
          scope: PERSONAL_CURRENT_ACCOUNT,
          journeyStep: 4,
          outcome: 'timeout_unavailable',
          reasonCode: 'super-secret-value',
        }),
      ).toBeNull();
      expect(
        redactDiagnostic({
          component: 'identity-adapter',
          applicationRef: 'tok_live_identity',
          scope: PERSONAL_CURRENT_ACCOUNT,
          journeyStep: 4,
          outcome: 'verified',
          reasonCode: 'verified',
        }),
      ).toBeNull();
    });

    it('drops the simulated provider payload from the recorded pause', () => {
      const provider = createSimulatedIdentityProvider('timeout');
      const raw = provider.verify({ applicationRef: 'app-2048' });
      for (const leak of LEAKS) expect(JSON.stringify(raw)).toContain(leak);

      const seen: IdentityDiagnostic[] = [];
      const store = createMemoryOnboardingStore();
      const paused = runIdentityCheck(checkpoint(), provider, store, NOW, (event) =>
        seen.push(event),
      );
      expect(paused.ok && paused.outcome).toBe('timeout_unavailable');
      expectNoLeaks(paused);
      expectNoLeaks(store.load('app-2048'));
      expectNoLeaks(seen);
      expect(seen).toHaveLength(1);
      expect(Object.keys(seen[0]).sort()).toEqual([...IDENTITY_DIAGNOSTIC_FIELDS].sort());
    });

    it('discards provider exceptions instead of recording their messages', () => {
      const provider: IdentityProvider = {
        verify() {
          throw new Error('provider failed with super-secret-value and DOC-554433');
        },
      };
      const store = createMemoryOnboardingStore();
      const paused = runIdentityCheck(checkpoint(), provider, store, NOW);
      if (!paused.ok || paused.outcome !== 'timeout_unavailable') throw new Error('expected pause');
      expect(paused.progress.pause?.reason).toBe('unavailable');
      expectNoLeaks(paused);
      expectNoLeaks(store.load('app-2048'));
    });
  });

  describe('persistence', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('rejects identity attributes and reloads a saved pause from browser storage', () => {
      const records = new Map<string, string>();
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => records.get(key) ?? null,
        setItem: (key: string, value: string) => records.set(key, value),
        removeItem: (key: string) => records.delete(key),
      });
      const store = browserOnboardingStore();
      const poisoned = { ...checkpoint(), documentNumber: 'DOC-554433' };
      expect(store.save(poisoned as OnboardingProgress)).toBe(false);
      expect(records.size).toBe(0);

      const paused = applyIdentityResult(checkpoint(), providerResult('timeout'), store, NOW);
      if (!paused.ok || paused.outcome !== 'timeout_unavailable') throw new Error('expected pause');
      expect(records.get(ONBOARDING_STORAGE_KEY)).not.toContain('DOC-554433');
      expect(browserOnboardingStore().load('app-2048')).toEqual(paused.progress);

      records.set(ONBOARDING_STORAGE_KEY, '{"app-2048":{"documentNumber":"DOC-554433"}}');
      expect(browserOnboardingStore().load('app-2048')).toBeNull();
      expect(store.save(paused.progress)).toBe(true);
      expect(records.get(ONBOARDING_STORAGE_KEY)).not.toContain('DOC-554433');
      expect(browserOnboardingStore().load('app-2048')?.pause?.recoverable).toBe(true);
    });

    it('returns false when browser storage refuses the write', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        },
      });
      expect(browserOnboardingStore().save(checkpoint())).toBe(false);
    });

    it('does not resume an opaque reference that fails the id check, and omits that input', () => {
      const result = resumeOnboarding(createMemoryOnboardingStore(), 'super-secret-value');
      expect(result.ok).toBe(false);
      expectNoLeaks(result);
    });
  });
});
