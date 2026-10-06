import { expect, test, type Page } from '@playwright/test';

async function startPayment(page: Page, amount = '25.99') {
  await page.getByRole('button', { name: 'Make a payment', exact: true }).first().click();
  await page.getByLabel('Amount (GBP)').fill(amount);
}
async function controls(page: Page, scenario: string) {
  await page.getByRole('button', { name: 'Demo controls' }).click();
  await page.getByLabel('Simulated payment outcome').selectOption(scenario);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
}

test('overview renders cleanly and payment persists exactly once', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) => errors.push(`Failed request: ${request.url()}`));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your everyday, balanced.' })).toBeVisible();
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');
  await page.evaluate(() => document.fonts.ready);
  await startPayment(page);
  await page.getByLabel('Reference (optional)').fill('Friday essentials');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.getByText('Adyen (simulated)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm £25.99 payment' }).click();
  await expect(page.getByRole('heading', { name: 'A little thing, taken care of.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to overview' }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,454.51');
  await page.reload();
  await expect(page.getByTestId('balance')).toHaveText('£12,454.51');
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await page.getByLabel('Search payments').fill('Friday essentials');
  await expect(page.locator('.transaction-row')).toHaveCount(1);
  await page.locator('.transaction-row').click();
  await expect(page.getByRole('dialog')).toContainText('Friday essentials');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('bank payment uses Worldpay and resets safely', async ({ page }) => {
  await page.goto('/');
  await startPayment(page, '48.00');
  await page.getByRole('radio', { name: /Bank payment/ }).check();
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.getByText('Worldpay (simulated)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm £48.00 payment' }).click();
  await page.getByRole('button', { name: 'Back to overview' }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,432.50');
  await page.getByRole('button', { name: 'Demo controls' }).click();
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await page.getByRole('button', { name: 'Keep my changes' }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,432.50');
  await page.getByRole('button', { name: 'Demo controls' }).click();
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await page.getByRole('button', { name: 'Reset everything' }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');
});

for (const scenario of ['declined', 'unavailable'])
  test(`${scenario} leaves balance unchanged and can retry`, async ({ page }) => {
    await page.goto('/');
    await controls(page, scenario);
    await startPayment(page, '10.00');
    await page.getByRole('button', { name: 'Review payment' }).click();
    await page.getByRole('button', { name: 'Confirm £10.00 payment' }).click();
    await expect(page.getByRole('alert')).toContainText('No money has left your account');
    await controls(page, 'success');
    await page.getByRole('button', { name: 'Confirm £10.00 payment' }).click();
    await expect(
      page.getByRole('heading', { name: 'A little thing, taken care of.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Back to overview' }).click();
    await expect(page.getByTestId('balance')).toHaveText('£12,470.50');
  });

test('validation and budget editing work', async ({ page }) => {
  await page.goto('/');
  await startPayment(page, '1.999');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.getByRole('alert')).toContainText('2 decimal places');
  await page.getByLabel('Amount (GBP)').fill('0');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.getByRole('alert')).toContainText('greater than zero');
  await page.getByRole('button', { name: 'Budgets', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Shopping budget' }).click();
  await page.getByLabel('Monthly limit (GBP)').fill('900.00');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await expect(page.getByRole('status')).toContainText('Shopping budget updated');
  await expect(page.getByRole('progressbar', { name: 'Shopping budget used' })).toHaveAttribute(
    'aria-valuetext',
    /£900.00/,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Budgets', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Shopping budget used' })).toHaveAttribute(
    'aria-valuetext',
    /£900.00/,
  );
});

test('corrupt or inaccessible storage recovers without blocking payments', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('meridian_bank_state', '{bad json'));
  await page.goto('/');
  await expect(page.getByText('Browser storage notice')).toBeVisible();
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');
  await startPayment(page, '15');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await page.getByRole('button', { name: 'Confirm £15.00 payment' }).click();
  await expect(page.getByRole('heading', { name: 'A little thing, taken care of.' })).toBeVisible();
});

test('denied storage keeps app interactive', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('Storage denied');
    };
    Storage.prototype.setItem = () => {
      throw new Error('Storage denied');
    };
  });
  await page.goto('/');
  await expect(
    page.getByText('Changes are kept for this visit only.', { exact: false }),
  ).toBeVisible();
  await startPayment(page, '5');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await page.getByRole('button', { name: 'Confirm £5.00 payment' }).click();
  await expect(page.getByRole('heading', { name: 'A little thing, taken care of.' })).toBeVisible();
});

test('mobile layout, keyboard dialog and empty search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your everyday, balanced.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await page.getByLabel('Search payments').fill('not a payment');
  await expect(page.getByRole('heading', { name: 'No matching payments' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.transaction-row')).toHaveCount(8);
  await startPayment(page, '12.50');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Review payment' }).click();
  await page.getByRole('button', { name: 'Confirm £12.50 payment' }).click();
  await expect(page.getByRole('heading', { name: 'A little thing, taken care of.' })).toBeVisible();
  await page.getByRole('button', { name: 'View receipt' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'View receipt' })).toBeFocused();
});

test('sticky showcase: palette renders all five colours with Sunshine selected by default', async ({
  page,
}) => {
  await page.goto('/');
  const palette = page.getByRole('group', { name: 'Choose a colour' });
  await expect(palette).toBeVisible();
  const swatches = palette.getByRole('radio');
  await expect(swatches).toHaveCount(5);
  await expect(palette.getByRole('radio', { name: 'Sunshine' })).toBeChecked();
});

test('sticky showcase: selecting a colour updates the preview immediately', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.sticky-preview');
  const defaultBg = await preview.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.locator('.colour-swatch-label[title="Lavender"]').click();
  await expect(page.getByRole('radio', { name: 'Lavender' })).toBeChecked();
  // Preview background must change away from the Sunshine default
  const newBg = await preview.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(newBg).not.toBe(defaultBg);
});

test('sticky showcase: adding a note shows it on the board', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your note').fill('Hello Meridian!');
  await page.getByRole('button', { name: 'Add to the flow' }).click();
  const notes = page.locator('[data-testid="floating-sticky-note"]');
  // Seed notes are already there; after adding, count increases to at least 6
  await expect(notes).toHaveCount(6);
});

test('sticky showcase: note added with selected colour appears with that colour', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.colour-swatch-label[title="Peach"]').click();
  await page.getByLabel('Your note').fill('Peach note');
  await page.getByRole('button', { name: 'Add to the flow' }).click();
  const notes = page.locator('[data-testid="floating-sticky-note"]');
  const lastNote = notes.last();
  await expect(lastNote).toBeVisible();
  // Peach colour is #FFCCBC → rgb(255, 204, 188)
  const bg = await lastNote.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(255, 204, 188)');
});
