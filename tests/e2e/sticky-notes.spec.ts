import { expect, test } from '@playwright/test';

test('colour palette updates the preview and stays on the moving note', async ({ page }) => {
  await page.goto('/');
  const showcase = page.getByRole('region', { name: 'Notes that wander' });
  await showcase.scrollIntoViewIfNeeded();

  await expect(page.getByRole('group', { name: 'Colour' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Gold' })).toBeChecked();
  for (const name of ['Gold', 'Sage', 'Sky', 'Blush', 'Lilac']) {
    await expect(page.getByRole('radio', { name })).toBeVisible();
  }

  const preview = page.getByTestId('sticky-preview');
  await page.getByRole('radio', { name: 'Blush' }).check();
  await expect(preview).toHaveAttribute('data-colour', 'blush');
  await expect(preview).toHaveCSS('background-color', 'rgb(246, 213, 207)');
  await expect(preview).toHaveCSS('color', 'rgb(74, 36, 28)');

  await page.getByLabel('Note').fill('Pack the picnic rug');
  await expect(preview).toContainText('Pack the picnic rug');
  await page.getByRole('button', { name: 'Add sticky note' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Blush sticky note added' }),
  ).toBeVisible();

  const note = page.getByTestId('sticky-note').filter({ hasText: 'Pack the picnic rug' });
  await expect(note).toHaveAttribute('data-colour', 'blush');
  await expect(note).toHaveCSS('background-color', 'rgb(246, 213, 207)');
  await expect(page.getByLabel('Note')).toHaveValue('');

  const earlier = page
    .getByTestId('sticky-note')
    .filter({ hasText: 'The trip fund can wait a week' });
  await expect(earlier).toHaveAttribute('data-colour', 'sky');

  const before = await note.evaluate((element) => element.getBoundingClientRect().left);
  await page.waitForTimeout(500);
  const after = await note.evaluate((element) => element.getBoundingClientRect().left);
  expect(after).not.toBe(before);
  await expect(note).toHaveCSS('background-color', 'rgb(246, 213, 207)');
  await expect(note).toHaveCSS('color', 'rgb(74, 36, 28)');
});

test('empty sticky notes are refused', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Notes that wander' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Add sticky note' }).click();
  await expect(page.getByRole('alert')).toHaveText('Write something on the sticky note');
  await expect(page.getByTestId('sticky-note')).toHaveCount(3);
});

test('sticky note colour selection fits a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const showcase = page.getByRole('region', { name: 'Notes that wander' });
  await showcase.scrollIntoViewIfNeeded();
  await expect(page.getByRole('radio', { name: 'Lilac' })).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);

  await page.getByRole('radio', { name: 'Lilac' }).check();
  await expect(page.getByTestId('sticky-preview')).toHaveAttribute('data-colour', 'lilac');
  await page.getByLabel('Note').fill('A note from the train');
  await page.getByRole('button', { name: 'Add sticky note' }).click();
  const note = page.getByTestId('sticky-note').filter({ hasText: 'A note from the train' });
  await expect(note).toHaveAttribute('data-colour', 'lilac');
  await expect(note).toHaveCSS('background-color', 'rgb(227, 214, 239)');
});
