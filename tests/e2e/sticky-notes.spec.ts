import { expect, test } from '@playwright/test';

test('colour palette is visible on the overview page', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByRole('group', { name: 'Note colour' });
  await expect(palette).toBeVisible();
  await expect(palette.getByRole('radio')).toHaveCount(5);
});

test('selected colour is applied to the added sticky note', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Pink' }).check();
  await page.getByLabel('Sticky note text').fill('Hello Meridian');
  await page.getByRole('button', { name: 'Add note' }).click();
  const note = page.locator('.sticky-note[data-colour="pink"]');
  await expect(note).toBeVisible();
  await expect(note).toContainText('Hello Meridian');
});
