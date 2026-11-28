import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

function violations(result: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return result.violations.map((item) => ({
    id: item.id,
    nodes: item.nodes.map((node) => ({ target: node.target, failure: node.failureSummary })),
  }));
}

for (const width of [1440, 390])
  test(`core pages at ${width}px have no detected WCAG AA violations`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    for (const name of ['Overview', 'Payments', 'Budgets', 'Activity']) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const result = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
      expect(violations(result), name).toEqual([]);
    }
  });

for (const width of [1440, 390])
  test(`account details, review and budget dialog at ${width}px have no detected WCAG AA violations`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Account details' }).click();
    await expect(page.getByRole('dialog', { name: 'Your everyday account' })).toBeVisible();
    expect(violations(await new AxeBuilder({ page }).withTags(wcagTags).analyze())).toEqual([]);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Make a payment', exact: true }).first().click();
    await page.getByLabel('Amount (GBP)').fill('25.99');
    await page.getByRole('button', { name: 'Review payment' }).click();
    await expect(page.getByRole('heading', { name: 'One last look.' })).toBeVisible();
    expect(
      violations(await new AxeBuilder({ page }).withTags(wcagTags).analyze()),
      'review',
    ).toEqual([]);

    await page.getByRole('button', { name: 'Budgets', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Shopping budget' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit Shopping budget' })).toBeVisible();
    expect(
      violations(await new AxeBuilder({ page }).withTags(wcagTags).analyze()),
      'budget',
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
