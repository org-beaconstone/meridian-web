import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390])
  test(`core pages at ${width}px have no detected WCAG AA violations`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    for (const name of ['Overview', 'Payments', 'Budgets', 'Activity', 'ROI']) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const tabs = name === 'ROI' ? ['Calculator', 'Notes', 'Case studies'] : [null];
      for (const tab of tabs) {
        if (tab) await page.getByRole('tab', { name: tab }).click();
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          result.violations.map((item) => ({
            id: item.id,
            nodes: item.nodes.map((node) => ({
              target: node.target,
              failure: node.failureSummary,
            })),
          })),
          tab ? `${name} ${tab}` : name,
        ).toEqual([]);
      }
    }
  });
