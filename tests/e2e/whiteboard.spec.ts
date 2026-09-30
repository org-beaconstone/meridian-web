import { expect, test } from '@playwright/test';

test('whiteboard page renders and a sticky note can be added with a colour', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your ideas, in one place.' })).toBeVisible();
  await expect(page.getByText('No notes yet')).toBeVisible();

  // Select a colour (blue) and add a note
  await page.getByLabel('Blue').check();
  await page.getByRole('textbox', { name: 'Note' }).fill('Review Q3 strategy');
  await page.getByRole('button', { name: 'Add note' }).click();

  // Note appears on the board
  const note = page.getByTestId('sticky-note').first();
  await expect(note).toBeVisible();
  await expect(note).toContainText('Review Q3 strategy');

  // Empty state is gone
  await expect(page.getByText('No notes yet')).not.toBeVisible();

  // Input cleared after submission
  await expect(page.getByRole('textbox', { name: 'Note' })).toHaveValue('');
});

test('multiple sticky notes each display with their chosen colour', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();

  // Add a yellow note
  await page.getByLabel('Yellow').check();
  await page.getByRole('textbox', { name: 'Note' }).fill('Yellow idea');
  await page.getByRole('button', { name: 'Add note' }).click();

  // Add a pink note
  await page.getByLabel('Pink').check();
  await page.getByRole('textbox', { name: 'Note' }).fill('Pink idea');
  await page.getByRole('button', { name: 'Add note' }).click();

  const notes = page.getByTestId('sticky-note');
  await expect(notes).toHaveCount(2);
  await expect(notes.nth(0)).toContainText('Pink idea');
  await expect(notes.nth(1)).toContainText('Yellow idea');
});

test('sticky note can be removed from the whiteboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();

  await page.getByLabel('Green').check();
  await page.getByRole('textbox', { name: 'Note' }).fill('To remove');
  await page.getByRole('button', { name: 'Add note' }).click();

  await expect(page.getByTestId('sticky-note')).toHaveCount(1);

  await page.getByRole('button', { name: /Remove note: To remove/ }).click();

  await expect(page.getByTestId('sticky-note')).toHaveCount(0);
  await expect(page.getByText('No notes yet')).toBeVisible();
});
