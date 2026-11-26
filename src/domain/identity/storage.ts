import { z } from 'zod';
import {
  MAX_FUNDING_MINOR,
  isApplicationId,
  isTimestamp,
  progressInvariants,
  type OnboardingProgress,
  type ProgressStore,
} from './types';

export const ONBOARDING_STORAGE_KEY = 'meridian_onboarding_progress';

export const OnboardingProgressSchema = z
  .object({
    version: z.literal(1),
    applicationId: z.string().refine(isApplicationId, 'Invalid application id'),
    status: z.enum(['in_progress', 'paused_recoverable', 'rejected', 'verified_ready', 'active']),
    step: z.number().int().min(1).max(5),
    completedSteps: z.array(z.number().int().min(1).max(5)),
    identityOutcome: z.enum(['verified', 'explicit_rejection', 'timeout_unavailable']).nullable(),
    interruption: z.enum(['timeout', 'unavailable']).nullable(),
    activated: z.boolean(),
    fundedMinor: z.number().int().safe().nonnegative().max(MAX_FUNDING_MINOR),
    updatedAt: z.string().refine(isTimestamp, 'Invalid timestamp'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!progressInvariants(value as OnboardingProgress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Onboarding progress invariant failed',
      });
    }
  });

export interface LoadOnboardingResult {
  progress: OnboardingProgress | null;
  warning: string | null;
}

export function browserProgressStore(): ProgressStore {
  return {
    read: () => localStorage.getItem(ONBOARDING_STORAGE_KEY),
    write: (value: string) => localStorage.setItem(ONBOARDING_STORAGE_KEY, value),
    remove: () => localStorage.removeItem(ONBOARDING_STORAGE_KEY),
  };
}

export function loadOnboarding(
  store: ProgressStore = browserProgressStore(),
): LoadOnboardingResult {
  try {
    const stored = store.read();
    if (!stored) return { progress: null, warning: null };
    let data: unknown;
    try {
      data = JSON.parse(stored);
    } catch {
      return { progress: null, warning: 'Corrupted onboarding progress, nothing restored' };
    }
    const parsed = OnboardingProgressSchema.safeParse(data);
    if (!parsed.success) {
      return { progress: null, warning: 'Invalid onboarding progress, nothing restored' };
    }
    return { progress: parsed.data as OnboardingProgress, warning: null };
  } catch {
    return { progress: null, warning: 'Onboarding progress could not be read' };
  }
}

export function persistProgress(store: ProgressStore, progress: OnboardingProgress): boolean {
  const parsed = OnboardingProgressSchema.safeParse(progress);
  if (!parsed.success) return false;
  try {
    store.write(JSON.stringify(parsed.data));
    return true;
  } catch {
    return false;
  }
}

export function clearOnboarding(store: ProgressStore = browserProgressStore()): boolean {
  try {
    store.remove();
    return true;
  } catch {
    return false;
  }
}
