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

test('amount ceiling rejects £10,000.01 and a maximum payment debits once', async ({ page }) => {
  await page.goto('/');
  await startPayment(page, '10000.01');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.getByRole('alert')).toContainText('cannot exceed £10,000');
  await expect(page.locator('.aside-balance')).toHaveText('£12,480.50');
  await page.getByLabel('Amount (GBP)').fill('10000.00');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.getByText('Sending to Northline Studio')).toBeVisible();
  await expect(page.getByText('Adyen (simulated)', { exact: true })).toBeVisible();
  await expect(page.locator('.detail-list')).toContainText('£0.00');
  await expect(page.locator('.detail-list')).toContainText('£2,480.50');
  await page.getByRole('button', { name: 'Back to details' }).click();
  await expect(page.locator('.aside-balance')).toHaveText('£12,480.50');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await page.getByRole('button', { name: 'Confirm £10,000.00 payment' }).click();
  await expect(page.getByRole('heading', { name: 'A little thing, taken care of.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to overview' }).click();
  await expect(page.getByTestId('balance')).toHaveText('£2,480.50');
  await expect(page.getByText('£11,842.80')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('balance')).toHaveText('£2,480.50');
  await page.getByRole('button', { name: 'Budgets', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Shopping budget used' })).toHaveAttribute(
    'aria-valuetext',
    /£10,605.00 spent of £1,000.00/,
  );
});

test('quick recipient payment lands in the matching activity category', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('.quick-pay')
    .getByRole('button', { name: /Maya Chen/ })
    .click();
  await expect(page.getByLabel('Recipient')).toHaveValue('maya-chen');
  await page.getByLabel('Amount (GBP)').fill('20.00');
  await page.getByLabel('Reference (optional)').fill('Evening class');
  await expect(page.getByText('Lifestyle this month')).toBeVisible();
  await expect(page.locator('.payment-impact strong')).toHaveText('£170.00');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.getByText('Sending to Maya Chen')).toBeVisible();
  await expect(page.getByText('Adyen (simulated)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm £20.00 payment' }).click();
  await expect(page.locator('.payment-impact')).toContainText('including this payment');
  await page.getByRole('button', { name: 'Back to overview' }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,460.50');
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await page.getByLabel('Category').selectOption('Lifestyle');
  await expect(page.getByText('2 payments in view')).toBeVisible();
  await expect(page.locator('.transaction-row')).toHaveCount(2);
  await page.getByLabel('Search payments').fill('Evening class');
  await expect(page.locator('.transaction-row')).toHaveCount(1);
  await page.getByLabel('Category').selectOption('Bills');
  await expect(page.getByRole('heading', { name: 'No matching payments' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.transaction-row')).toHaveCount(9);
  await page.getByLabel('Category').selectOption('Bills');
  await expect(page.locator('.transaction-row')).toHaveCount(1);
  await expect(page.locator('.transaction-row')).toContainText('Octavia Energy');
});

test('account details stay masked and return focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Account details' }).click();
  const dialog = page.getByRole('dialog', { name: 'Your everyday account' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Demo account •• 2048');
  await expect(dialog).toContainText('Demo Visa •••• 4829');
  await expect(dialog).toContainText('Never enter real financial details');
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Account details' })).toBeFocused();
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');
});

test('invalid budget edits are rejected and a valid limit persists', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Budgets', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Transport budget' }).click();
  await page.getByLabel('Monthly limit (GBP)').fill('0');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid amount');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Monthly limit (GBP)').fill('10000.01');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid amount');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('progressbar', { name: 'Transport budget used' })).toHaveAttribute(
    'aria-valuetext',
    /£500.00/,
  );
  await page.getByRole('button', { name: 'Edit Transport budget' }).click();
  await page.getByLabel('Monthly limit (GBP)').fill('200.00');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await expect(page.getByRole('status')).toContainText('Transport budget updated');
  await page.reload();
  await page.getByRole('button', { name: 'Budgets', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Transport budget used' })).toHaveAttribute(
    'aria-valuetext',
    /£210.00 spent of £200.00/,
  );
  await expect(page.getByText('£10.00 over budget')).toBeVisible();
});

test('a second payment debits again and an empty reference is explicit', async ({ page }) => {
  await page.goto('/');
  await startPayment(page, '10.00');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.getByText('No reference', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm £10.00 payment' }).click();
  await page.getByRole('button', { name: 'View receipt' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('dt', { hasText: /^Note$/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Make another payment' }).click();
  await expect(page.getByLabel('Amount (GBP)')).toHaveValue('');
  await page.getByLabel('Amount (GBP)').fill('5.50');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await page.getByRole('button', { name: 'Confirm £5.50 payment' }).click();
  await page.getByRole('button', { name: 'Back to overview' }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,465.00');
  await page.reload();
  await expect(page.getByTestId('balance')).toHaveText('£12,465.00');
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await expect(page.locator('.transaction-row')).toHaveCount(10);
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
