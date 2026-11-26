// Synthetic onboarding types. No personal data, provider payloads, or secrets belong here.

import { isCalendarDate } from '../model';

/** Identity verification is journey step 4. Resume returns here. */
export const IDENTITY_JOURNEY_STEP = 4;

export const MAX_FUNDING_MINOR = 1_000_000;

export const JOURNEY = [
  {
    step: 1,
    id: 'eligibility',
    title: 'Eligibility',
    detail: 'Confirm this rehearsal is for a fictional everyday account.',
  },
  {
    step: 2,
    id: 'profile',
    title: 'Profile fixture',
    detail: 'A synthetic profile is already on file. No name or date of birth is collected.',
  },
  {
    step: 3,
    id: 'contact',
    title: 'Contact preference',
    detail: 'Updates stay in this demo. No phone number or email is collected.',
  },
  {
    step: 4,
    id: 'identity',
    title: 'Identity verification',
    detail: 'A simulated check. Timeout and unavailable save your progress so you can resume here.',
  },
  {
    step: 5,
    id: 'activation',
    title: 'Activation and funding',
    detail: 'Available only after a verified identity result.',
  },
] as const;

export type JourneyStep = (typeof JOURNEY)[number]['step'];

/** Provider-facing dispositions. Timeout and unavailable are not a rejection. */
export type IdentityDisposition = 'verified' | 'explicit_rejection' | 'timeout' | 'unavailable';

/** Verified, explicit rejection, and timeout/unavailable stay distinct. */
export type IdentityOutcome = 'verified' | 'explicit_rejection' | 'timeout_unavailable';

export type IdentityInterruption = 'timeout' | 'unavailable';

export type ApplicationStatus =
  'in_progress' | 'paused_recoverable' | 'rejected' | 'verified_ready' | 'active';

export interface OnboardingProgress {
  version: 1;
  applicationId: string;
  status: ApplicationStatus;
  step: JourneyStep;
  completedSteps: JourneyStep[];
  identityOutcome: IdentityOutcome | null;
  interruption: IdentityInterruption | null;
  activated: boolean;
  /** Integer minor units. Stays 0 until a verified, activated application is funded. */
  fundedMinor: number;
  updatedAt: string;
}

/** Simulation and live adapters both stop at this boundary. Payloads do not cross it. */
export interface IdentityCheckPort {
  verify(command: { applicationId: string }): { disposition: IdentityDisposition };
}

export interface ProgressStore {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}

const APPLICATION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isApplicationId(value: string): boolean {
  return value.length >= 4 && value.length <= 40 && APPLICATION_ID.test(value);
}

export function isTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
  return isCalendarDate(value.slice(0, 10));
}

function sameSteps(actual: readonly number[], expected: readonly number[]): boolean {
  return (
    actual.length === expected.length && actual.every((step, index) => step === expected[index])
  );
}

export function progressInvariants(progress: OnboardingProgress): boolean {
  const { step, completedSteps, status, identityOutcome, interruption, activated, fundedMinor } =
    progress;
  if (!Number.isInteger(step) || step < 1 || step > 5) return false;
  if (!Number.isSafeInteger(fundedMinor) || fundedMinor < 0 || fundedMinor > MAX_FUNDING_MINOR) {
    return false;
  }
  if (activated !== (status === 'active')) return false;
  if (fundedMinor !== 0 && status !== 'active') return false;
  if (activated && identityOutcome !== 'verified') return false;

  if (status === 'paused_recoverable') {
    return (
      step === IDENTITY_JOURNEY_STEP &&
      identityOutcome === 'timeout_unavailable' &&
      (interruption === 'timeout' || interruption === 'unavailable') &&
      sameSteps(completedSteps, [1, 2, 3]) &&
      !activated &&
      fundedMinor === 0
    );
  }

  if (status === 'rejected') {
    return (
      step === IDENTITY_JOURNEY_STEP &&
      identityOutcome === 'explicit_rejection' &&
      interruption === null &&
      sameSteps(completedSteps, [1, 2, 3]) &&
      !activated &&
      fundedMinor === 0
    );
  }

  if (status === 'verified_ready') {
    return (
      step === 5 &&
      identityOutcome === 'verified' &&
      interruption === null &&
      sameSteps(completedSteps, [1, 2, 3, 4]) &&
      !activated &&
      fundedMinor === 0
    );
  }

  if (status === 'active') {
    return (
      step === 5 &&
      identityOutcome === 'verified' &&
      interruption === null &&
      sameSteps(completedSteps, [1, 2, 3, 4]) &&
      activated
    );
  }

  if (status !== 'in_progress') return false;
  if (activated || fundedMinor !== 0 || step > IDENTITY_JOURNEY_STEP) return false;
  if (
    !sameSteps(
      completedSteps,
      Array.from({ length: step - 1 }, (_, index) => index + 1),
    )
  ) {
    return false;
  }
  if (identityOutcome === null) return interruption === null;
  if (identityOutcome === 'timeout_unavailable') {
    return (
      step === IDENTITY_JOURNEY_STEP &&
      (interruption === 'timeout' || interruption === 'unavailable')
    );
  }
  return false;
}
