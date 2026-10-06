import { expect, test } from '@playwright/test';

test('sticky note colour palette is visible on the overview page', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Leave your mark on the day.' }),
  ).toBeVisible();
  // All 5 colour swatches are rendered
  const swatches = page.locator('.colour-swatch');
  await expect(swatches).toHaveCount(5);
  // Seed notes are already floating in the flow area
  const floatingNotes = page.locator('[data-testid="floating-sticky-note"]');
  await expect(floatingNotes).toHaveCount(5);
});

test('selecting a colour and adding a note creates a floating sticky note', async ({ page }) => {
  await page.goto('/');
  // Select 'Mint' colour via its label (radio is visually hidden, label is clickable)
  await page.getByTitle('Mint').click();
  // Type a note
  await page.getByLabel('Your note').fill('Green thoughts');
  // Preview should reflect text
  await expect(page.locator('.sticky-preview')).toContainText('Green thoughts');
  // Add to the flow
  await page.getByRole('button', { name: 'Add to the flow' }).click();
  // A new note should appear (seed 5 + 1 user = 6)
  const floatingNotes = page.locator('[data-testid="floating-sticky-note"]');
  await expect(floatingNotes).toHaveCount(6);
  // The newest note has the entered text
  await expect(floatingNotes.last()).toHaveText('Green thoughts');
  // Input should be cleared after submit
  await expect(page.getByLabel('Your note')).toHaveValue('');
});
