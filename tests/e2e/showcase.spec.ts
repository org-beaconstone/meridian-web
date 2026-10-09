import { expect, test } from '@playwright/test';

test('colour palette is shown and selected colour is applied to the sticky note', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.sticky-showcase').scrollIntoViewIfNeeded();

  // Palette is visible
  await expect(page.getByRole('group', { name: 'Choose sticky note colour' })).toBeVisible();

  // Click the Sage swatch label (the visual element wrapping the hidden radio)
  await page.locator('label[title="Sage"]').scrollIntoViewIfNeeded();
  await page.locator('label[title="Sage"]').click();
  await page.getByLabel('Sticky note text').fill('Hello Meridian');
  await page.getByRole('button', { name: /Add note/ }).click();

  // The note should appear with the Sage background colour
  const note = page.locator('.sticky-note-chip').first();
  await expect(note).toBeVisible();
  const bg = await note.evaluate((el) => getComputedStyle(el).backgroundColor);
  // Sage value #C8E8C4 → rgb(200, 232, 196)
  expect(bg).toBe('rgb(200, 232, 196)');
});

test('sticky note preview reflects the selected colour before adding', async ({ page }) => {
  await page.goto('/');

  // Click the Rose swatch label and verify the preview updates immediately
  await page.locator('label[title="Rose"]').scrollIntoViewIfNeeded();
  await page.locator('label[title="Rose"]').click();
  const preview = page.locator('.sticky-preview');
  const bg = await preview.evaluate((el) => getComputedStyle(el).backgroundColor);
  // Rose value #F0C4D0 → rgb(240, 196, 208)
  expect(bg).toBe('rgb(240, 196, 208)');
});
