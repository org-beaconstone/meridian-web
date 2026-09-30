import { expect, test } from '@playwright/test';

test('whiteboard page renders with colour palette when adding a sticky note', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your ideas, in one place.' })).toBeVisible();
  await page.getByRole('button', { name: 'Add sticky note' }).click();

  // All six colour swatches are present
  for (const colour of ['Yellow', 'Pink', 'Blue', 'Green', 'Purple', 'Orange']) {
    await expect(page.getByRole('button', { name: colour })).toBeVisible();
  }
  await expect(page.getByText('Choose a colour')).toBeVisible();
});

test('sticky note is added with the selected colour and persists after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();

  await page.getByRole('button', { name: 'Add sticky note' }).click();
  await page.getByRole('button', { name: 'Blue' }).click();
  await expect(page.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Note text').fill('Review Q3 budget targets');
  await page.getByRole('button', { name: 'Add note' }).click();

  const note = page.getByRole('article', { name: /Review Q3 budget targets/ });
  await expect(note).toBeVisible();
  await expect(note).toHaveCSS('background-color', 'rgb(147, 197, 253)');

  // Note survives a page reload
  await page.reload();
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();
  await expect(page.getByRole('article', { name: /Review Q3 budget targets/ })).toBeVisible();
});

test('sticky note can be removed from the whiteboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();

  await page.getByRole('button', { name: 'Add sticky note' }).click();
  await page.getByRole('button', { name: 'Green' }).click();
  await page.getByLabel('Note text').fill('To remove');
  await page.getByRole('button', { name: 'Add note' }).click();

  await expect(page.getByRole('article', { name: /To remove/ })).toBeVisible();
  await page.getByRole('button', { name: 'Remove sticky note' }).click();
  await expect(page.getByRole('article', { name: /To remove/ })).not.toBeVisible();
});
