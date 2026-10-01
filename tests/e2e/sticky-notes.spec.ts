import { expect, test } from '@playwright/test';

test('sticky note colour palette renders with all five swatches', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Add a sticky note' })).toBeVisible();
  // The palette renders five visible colour swatches
  await expect(page.locator('.colour-swatch')).toHaveCount(5);
  // Each colour radio input is accessible in the DOM
  for (const label of ['Yellow', 'Blue', 'Green', 'Pink', 'Orange']) {
    await expect(page.getByRole('radio', { name: label })).toBeAttached();
  }
});

test('selected colour is applied immediately to the sticky note preview', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your note').fill('Hello world');
  // Default preview renders
  await expect(page.locator('.sticky-preview')).toBeVisible();
  // Click the Blue swatch label to select it
  await page
    .locator('.colour-swatch-label')
    .filter({ has: page.getByRole('radio', { name: 'Blue' }) })
    .click();
  await expect(page.getByRole('radio', { name: 'Blue' })).toBeChecked();
  // The selected swatch gains the 'selected' class
  await expect(
    page
      .locator('.colour-swatch-label')
      .filter({ has: page.getByRole('radio', { name: 'Blue' }) })
      .locator('.colour-swatch.selected'),
  ).toBeAttached();
  // The preview CSS variable reflects the blue background
  const previewBg = await page
    .locator('.sticky-preview')
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--sn-bg').trim());
  expect(previewBg).toBe('#B3E5FC');
});

test('adding a sticky note with a chosen colour creates an animated note in the stage', async ({
  page,
}) => {
  await page.goto('/');
  // Click the Pink swatch
  await page
    .locator('.colour-swatch-label')
    .filter({ has: page.getByRole('radio', { name: 'Pink' }) })
    .click();
  await page.getByLabel('Your note').fill('Great idea!');
  await page.getByRole('button', { name: 'Add sticky note' }).click();
  // A floating note is appended to the DOM inside the stage
  const floatingNote = page.locator('.sticky-note-float').first();
  await expect(floatingNote).toBeAttached();
  await expect(floatingNote).toContainText('Great idea!');
  // Correct colour CSS variable applied to the floating note
  const bg = await floatingNote.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--sn-bg').trim(),
  );
  expect(bg).toBe('#F8BBD9');
});

test('submitting an empty note shows a validation error and does not add a floating note', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add sticky note' }).click();
  await expect(page.getByRole('alert')).toContainText('Please enter some text');
  await expect(page.locator('.sticky-note-float')).toHaveCount(0);
});

test('sticky note showcase works on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Add a sticky note' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Click the Green swatch
  await page
    .locator('.colour-swatch-label')
    .filter({ has: page.getByRole('radio', { name: 'Green' }) })
    .click();
  await page.getByLabel('Your note').fill('Mobile note');
  await page.getByRole('button', { name: 'Add sticky note' }).click();
  await expect(page.locator('.sticky-note-float').first()).toContainText('Mobile note');
});
