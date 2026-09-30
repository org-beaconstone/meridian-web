import { test, expect } from '@playwright/test';

test('colour palette is visible on the overview page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('colour-palette')).toBeVisible();
  // All 5 colour swatches should be present
  const swatches = page.locator('.colour-swatch');
  await expect(swatches).toHaveCount(5);
});

test('selecting a colour updates the sticky note preview', async ({ page }) => {
  await page.goto('/');
  // Click the Mint swatch (brand-compatible teal-green)
  await page.locator('[title="Mint"]').click();
  const preview = page.getByTestId('sticky-note-preview');
  // The preview background should reflect the mint colour (#d1f2d3)
  await expect(preview).toHaveCSS('background-color', 'rgb(209, 242, 211)');
});

test('adding a note with a chosen colour creates a floating note', async ({ page }) => {
  await page.goto('/');
  await page.locator('[title="Sky"]').click();
  await page.getByRole('textbox', { name: 'Note' }).fill('Ship it!');
  await page.getByRole('button', { name: 'Add note' }).click();
  // A floating note should appear in the canvas
  const canvas = page.locator('.sticky-note-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas.locator('.sticky-note-card').first()).toBeVisible();
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
  // Select coral and add a note
  await page.locator('[title="Coral"]').click();
  await page.getByRole('textbox', { name: 'Note' }).fill('Mobile check');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('textbox', { name: 'Note' })).toHaveValue('');
  // No horizontal overflow
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('yellow is the default selected colour', async ({ page }) => {
  await page.goto('/');
  // Yellow swatch should report aria-pressed=true by default
  await expect(page.locator('[title="Yellow"]')).toHaveAttribute('aria-pressed', 'true');
  // Every other swatch should not be pressed
  for (const label of ['Coral', 'Mint', 'Sky', 'Lavender']) {
    await expect(page.locator(`[title="${label}"]`)).toHaveAttribute('aria-pressed', 'false');
  }
});

test('preview reflects typed note text in real time', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Note' });
  const preview = page.getByTestId('sticky-note-preview');
  await input.fill('Real-time sync');
  await expect(preview).toContainText('Real-time sync');
});

test('multiple notes can be added sequentially', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('.sticky-note-canvas');
  const initialCount = await canvas.locator('.sticky-note-card').count();

  await page.getByRole('textbox', { name: 'Note' }).fill('First idea');
  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByRole('textbox', { name: 'Note' }).fill('Second idea');
  await page.getByRole('button', { name: 'Add note' }).click();

  await expect(canvas.locator('.sticky-note-card')).toHaveCount(initialCount + 2);
});

test('pressing Enter in the text field submits the note', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Note' });
  const canvas = page.locator('.sticky-note-canvas');
  const initialCount = await canvas.locator('.sticky-note-card').count();

  await input.fill('Enter key shortcut');
  await input.press('Enter');

  await expect(canvas.locator('.sticky-note-card')).toHaveCount(initialCount + 1);
  await expect(input).toHaveValue('');
});
