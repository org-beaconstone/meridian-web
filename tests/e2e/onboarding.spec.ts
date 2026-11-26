import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ONBOARDING_STORAGE_KEY } from '../../src/domain/identity/storage';

async function openOnboarding(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Onboarding', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pick up where you left off.' })).toBeVisible();
}

async function finishProfile(page: Page) {
  await page.getByRole('button', { name: 'Complete eligibility' }).click();
  await page.getByRole('button', { name: 'Confirm profile fixture' }).click();
  await page.getByRole('button', { name: 'Save contact preference' }).click();
  await expect(page.getByTestId('onboarding-step')).toHaveText('4');
  await expect(page.getByTestId('onboarding-gate')).toHaveText(
    'Account not activated. Not funded.',
  );
}

async function reachIdentity(page: Page) {
  await page.getByRole('button', { name: 'Start application' }).click();
  await finishProfile(page);
}

async function savedProgress(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }, ONBOARDING_STORAGE_KEY);
}

test('timeout pauses at step 4, survives reload, and resumes without funding', async ({ page }) => {
  await openOnboarding(page);
  await reachIdentity(page);
  await expect(page.getByRole('button', { name: 'Activate account' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Fund account' })).toBeDisabled();

  await page.getByRole('radio', { name: /Provider timeout/ }).check();
  await page.getByRole('button', { name: 'Submit identity check' }).click();
  await expect(page.getByTestId('onboarding-status')).toHaveAttribute(
    'data-status',
    'paused_recoverable',
  );
  await expect(page.getByTestId('onboarding-interruption')).toHaveText('timeout');
  await expect(page.getByText('Your progress is saved')).toBeVisible();
  const pausedAxe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(pausedAxe.violations).toEqual([]);
  await expect(page.getByTestId('onboarding-gate')).toHaveText(
    'Account not activated. Not funded.',
  );
  await expect(page.getByRole('button', { name: 'Activate account' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Fund account' })).toBeDisabled();

  const paused = await savedProgress(page);
  expect(paused).toMatchObject({
    status: 'paused_recoverable',
    step: 4,
    completedSteps: [1, 2, 3],
    identityOutcome: 'timeout_unavailable',
    interruption: 'timeout',
    activated: false,
    fundedMinor: 0,
  });

  await page.reload();
  await page.getByRole('button', { name: 'Onboarding', exact: true }).click();
  await expect(page.getByTestId('onboarding-status')).toHaveAttribute(
    'data-status',
    'paused_recoverable',
  );
  await expect(page.getByRole('listitem').filter({ hasText: '1. Eligibility' })).toContainText(
    'Completed',
  );
  await expect(
    page.getByRole('listitem').filter({ hasText: '3. Contact preference' }),
  ).toContainText('Completed');

  await page.getByRole('button', { name: 'Resume identity verification' }).click();
  await expect(page.getByTestId('onboarding-step')).toHaveText('4');
  await expect(page.getByTestId('onboarding-status')).toHaveAttribute('data-status', 'in_progress');
  await expect(page.getByRole('button', { name: 'Complete eligibility' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /Verified/ })).toBeVisible();
  await expect(page.getByTestId('onboarding-gate')).toHaveText(
    'Account not activated. Not funded.',
  );
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');
});

test('unavailable is a recoverable pause and rejection is not', async ({ page }) => {
  await openOnboarding(page);
  await reachIdentity(page);
  await page.getByRole('radio', { name: /Provider unavailable/ }).check();
  await page.getByRole('button', { name: 'Submit identity check' }).click();
  await expect(page.getByTestId('onboarding-interruption')).toHaveText('unavailable');
  await expect(page.getByTestId('onboarding-status')).toHaveAttribute(
    'data-status',
    'paused_recoverable',
  );
  await page.getByRole('button', { name: 'Discard saved progress' }).click();
  await page.getByRole('button', { name: 'Start application' }).click();
  await finishProfile(page);
  await page.getByRole('radio', { name: /Explicit rejection/ }).check();
  await page.getByRole('button', { name: 'Submit identity check' }).click();
  await expect(page.getByTestId('onboarding-status')).toHaveAttribute('data-status', 'rejected');
  await expect(page.getByRole('button', { name: 'Resume identity verification' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Activate account' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Fund account' })).toBeDisabled();
  await expect(page.getByTestId('onboarding-gate')).toHaveText(
    'Account not activated. Not funded.',
  );
  const saved = await savedProgress(page);
  expect(saved).toMatchObject({
    status: 'rejected',
    identityOutcome: 'explicit_rejection',
    activated: false,
    fundedMinor: 0,
  });
});

test('verified identity can activate and fund without changing the everyday balance', async ({
  page,
}) => {
  await openOnboarding(page);
  await reachIdentity(page);
  await page.getByRole('radio', { name: /^Verified/ }).check();
  await page.getByRole('button', { name: 'Submit identity check' }).click();
  await expect(page.getByTestId('onboarding-status')).toHaveAttribute(
    'data-status',
    'verified_ready',
  );
  await expect(page.getByRole('button', { name: 'Fund account' })).toBeDisabled();
  await page.getByRole('button', { name: 'Activate account' }).click();
  await expect(page.getByTestId('onboarding-gate')).toContainText('Account activated.');
  await expect(page.getByTestId('onboarding-gate')).toContainText('Not funded.');
  await page.getByLabel('Opening amount (GBP)').fill('25.00');
  await page.getByRole('button', { name: 'Fund account' }).click();
  await expect(page.getByTestId('onboarding-gate')).toContainText('Funded £25.00.');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');
});

test('paused onboarding fits a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openOnboarding(page);
  await reachIdentity(page);
  await page.getByRole('radio', { name: /Provider timeout/ }).check();
  await page.getByRole('button', { name: 'Submit identity check' }).click();
  await expect(page.getByRole('button', { name: 'Resume identity verification' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});
