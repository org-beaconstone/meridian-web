import { test, expect } from '@playwright/test';

test('colour palette is visible on the overview page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('colour-palette')).toBeVisible();
  // All 5 colour options should be present
  const swatches = page.locator('.colour-swatch');
  await expect(swatches).toHaveCount(5);
});

test('selecting a colour updates the sticky note preview', async ({ page }) => {
  await page.goto('/');
  // Click the Green swatch label (identified by title attribute)
  await page.locator('[title="Green"]').click();
  const preview = page.getByTestId('sticky-note-preview');
  // The preview background should reflect green (#B8E994)
  await expect(preview).toHaveCSS('background-color', 'rgb(184, 233, 148)');
});

test('adding a note with a chosen colour creates a floating note', async ({ page }) => {
  await page.goto('/');
  await page.locator('[title="Blue"]').click();
  await page.getByRole('textbox', { name: 'Note' }).fill('Ship it!');
  await page.getByRole('button', { name: 'Add note' }).click();
  // A floating note should appear in the stage
  const stage = page.locator('.sticky-note-stage');
  await expect(stage).toBeVisible();
  await expect(stage.locator('.sticky-note-float').first()).toBeVisible();
});

test('adding a note without text shows a validation error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('alert')).toContainText('Note text is required');
});

test('text input is cleared after successfully adding a note', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Note' }).fill('Remember to breathe');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('textbox', { name: 'Note' })).toHaveValue('');
});

test('showcase is usable on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('colour-palette')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Note' })).toBeVisible();
  // Select pink and add a note
  await page.locator('[title="Pink"]').click();
  await page.getByRole('textbox', { name: 'Note' }).fill('Mobile check');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('textbox', { name: 'Note' })).toHaveValue('');
  // No horizontal overflow
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
