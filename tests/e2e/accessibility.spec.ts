import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390])
  test(`core pages at ${width}px have no detected WCAG AA violations`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    for (const name of ['Overview', 'Payments', 'Budgets', 'Activity']) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        result.violations.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => ({ target: node.target, failure: node.failureSummary })),
        })),
        name,
      ).toEqual([]);
    }
    await page.getByRole('button', { name: 'Payments', exact: true }).click();
    await page.getByLabel('Amount (GBP)').fill('10.00');
    await page.getByRole('button', { name: 'Review payment' }).click();
    await page.getByRole('button', { name: 'Continue to verification' }).click();
    const biometric = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(biometric.violations, 'verify').toEqual([]);
    await page.getByRole('button', { name: 'Use 6-digit passcode instead' }).click();
    const passcode = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(passcode.violations, 'passcode').toEqual([]);
  });
