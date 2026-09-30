import { expect, test } from '@playwright/test';

test('colour palette shows all six colour options when adding a sticky note', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your ideas, pinned in one place.' })).toBeVisible();
  await page.getByRole('button', { name: 'Add sticky note' }).click();
  for (const colour of ['Yellow', 'Pink', 'Blue', 'Green', 'Purple', 'Orange']) {
    await expect(page.getByRole('button', { name: colour })).toBeVisible();
  }
  await expect(page.getByText('Choose a colour')).toBeVisible();
});

test('sticky note is added with the selected colour and text', async ({ page }) => {
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
});

test('sticky notes persist across page reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();
  await page.getByRole('button', { name: 'Add sticky note' }).click();
  await page.getByRole('button', { name: 'Green' }).click();
  await page.getByLabel('Note text').fill('Check savings plan');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('article', { name: /Check savings plan/ })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Whiteboard', exact: true }).click();
  await expect(page.getByRole('article', { name: /Check savings plan/ })).toBeVisible();
  const note = page.getByRole('article', { name: /Check savings plan/ });
  await expect(note).toHaveCSS('background-color', 'rgb(134, 239, 172)');
});
