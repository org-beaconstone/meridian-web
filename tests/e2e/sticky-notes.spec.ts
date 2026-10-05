import { expect, test } from '@playwright/test';

test('showcase colour palette renders five options with yellow as default', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Leave a sticky note' })).toBeVisible();

  // Five colour radio inputs must be present
  const radios = page.locator('[name="note-color"]');
  await expect(radios).toHaveCount(5);

  // Yellow is selected by default
  await expect(page.getByRole('radio', { name: 'Sunny yellow' })).toBeChecked();

  // The note preview reflects the default yellow colour
  await expect(page.getByTestId('note-preview')).toHaveAttribute('data-color', 'yellow');
});

test('selecting a colour immediately updates the note preview', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Leave a sticky note' })).toBeVisible();

  // Click the label (swatch) to select sky blue
  await page.locator('[title="Sky blue"]').click();
  await expect(page.getByRole('radio', { name: 'Sky blue' })).toBeChecked();
  await expect(page.getByTestId('note-preview')).toHaveAttribute('data-color', 'blue');

  // Switch to blossom pink
  await page.locator('[title="Blossom pink"]').click();
  await expect(page.getByTestId('note-preview')).toHaveAttribute('data-color', 'pink');
});

test('adding a note with a selected colour places it in the showcase stage', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Leave a sticky note' })).toBeVisible();

  await page.locator('[title="Soft green"]').click();
  await page.getByLabel('Message').fill('A little clarity.');
  await page.getByRole('button', { name: 'Add note' }).click();

  // The sticky note element is attached to the stage with the correct colour
  const note = page.locator('[data-testid="sticky-note"]');
  await expect(note).toHaveCount(1);
  await expect(note).toHaveAttribute('data-color', 'green');
  await expect(note).toContainText('A little clarity.');

  // The text field is cleared after adding
  await expect(page.getByLabel('Message')).toHaveValue('');
});

test('submitting with empty text shows a validation error and does not add a note', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Leave a sticky note' })).toBeVisible();

  await page.getByRole('button', { name: 'Add note' }).click();

  await expect(page.getByRole('alert')).toContainText('Please enter a message');
  await expect(page.locator('[data-testid="sticky-note"]')).toHaveCount(0);
});
