import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function showResult(page: import('@playwright/test').Page, name: RegExp | string) {
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await page.getByRole('radio', { name }).check();
  await page.getByRole('button', { name: 'Check identity' }).click();
}

test('timeout and unavailable pause the application without declining it', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');

  for (const name of [/Identity check timed out/, /Identity check unavailable/]) {
    await showResult(page, name);
    const message = page.getByTestId('applicant-identity-message');
    await expect(message).toHaveAttribute('data-outcome', 'paused');
    await expect(message).toContainText('Application paused, not declined');
    await expect(message).toContainText(
      'Your application is paused and still open. The identity check could not be completed, so no decision has been made.',
    );
    await expect(message).toContainText('Return to continue, or try again later.');
    await expect(message).not.toContainText('rejected');
    await expect(message).not.toContainText('Application declined');
    await expect(message).not.toContainText('automatic');
    await page.getByRole('button', { name: 'Return to continue' }).click();
    const resumed = page.getByRole('status').filter({ hasText: 'has not been run again' });
    await expect(resumed).toContainText('Try again later');
    await expect(resumed).toContainText('has not been run again');
    await expect(page.getByRole('radio', { name: /Identity check timed out/ })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');
});

test('verified and explicit rejection keep their existing outcomes', async ({ page }) => {
  await page.goto('/');
  await showResult(page, /Verified/);
  const verified = page.getByTestId('applicant-identity-message');
  await expect(verified).toHaveAttribute('data-outcome', 'verified');
  await expect(verified).toContainText('Identity verified');
  await expect(verified).toContainText(
    'Your identity check is complete. You can continue this application.',
  );
  await expect(verified).not.toContainText('Application paused, not declined');
  await expect(page.getByRole('button', { name: 'Return to continue' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Show another result' }).click();
  await page.getByRole('radio', { name: /Explicit decline/ }).check();
  await page.getByRole('button', { name: 'Check identity' }).click();
  const declined = page.getByTestId('applicant-identity-message');
  await expect(declined).toHaveAttribute('data-outcome', 'explicit_rejection');
  await expect(declined).toContainText('Application declined');
  await expect(declined).toContainText('That decision is final for this application.');
  await expect(declined).not.toContainText('Application paused, not declined');
  await expect(page.getByRole('button', { name: 'Return to continue' })).toHaveCount(0);
});

for (const width of [1440, 390])
  for (const choice of ['Identity check timed out', 'Verified', 'Explicit decline'] as const)
    test(`identity outcome ${choice} at ${width}px has no WCAG AA violations`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/');
      await showResult(page, new RegExp(choice));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        result.violations.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => ({ target: node.target, failure: node.failureSummary })),
        })),
      ).toEqual([]);
    });
