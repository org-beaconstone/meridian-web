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

async function openSavings(page: Page) {
  await page.getByRole('button', { name: 'Account details' }).click();
  await page.getByRole('button', { name: 'Open a savings account' }).click();
  await expect(page.getByRole('heading', { name: 'Open a savings account.' })).toBeVisible();
}

async function completeIdentity(page: Page, outcome: string) {
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('checkbox', { name: /fictional demo/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Given name').fill('Jordan');
  await page.getByLabel('Family name').fill('Ellis');
  await page.getByLabel('Date of birth').fill('1990-04-12');
  await page.getByLabel('Fictional reference').fill('AB12CD34');
  await page.getByLabel('Rehearsal verification outcome').selectOption(outcome);
  await page.getByRole('button', { name: 'Check identity' }).click();
}

test('identity outcomes do not open an account or log personal details', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (message) => logs.push(message.text()));
  await page.goto('/');
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');
  await openSavings(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert')).toContainText('Consent is required');

  await page.getByRole('checkbox', { name: /fictional demo/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Given name').fill('Jordan');
  await page.getByLabel('Family name').fill('Ellis');
  await page.getByLabel('Date of birth').fill('1990-04-12');
  await page.getByLabel('Fictional reference').fill('4242424242424242');
  await page.getByRole('button', { name: 'Check identity' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Card numbers, credentials, and tokens are not accepted',
  );
  await expect(page.getByRole('alert')).not.toContainText('4242424242424242');

  await page.getByLabel('Fictional reference').fill('AB12CD34');
  await page.getByLabel('Rehearsal verification outcome').selectOption('rejected');
  await page.getByRole('button', { name: 'Check identity' }).click();
  await expect(page.getByTestId('identity-outcome')).toContainText('final decision');
  await expect(page.getByTestId('identity-outcome')).not.toContainText('unavailable');
  await expect(page.getByRole('button', { name: 'Retry verification' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Set up savings account' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add initial funding' })).toHaveCount(0);
  await expect(page.getByText('Not opened')).toBeVisible();
  await expect(page.getByText('Not accepted')).toBeVisible();
  const rejectedHtml = await page.locator('.journey-layout').innerHTML();
  expect(rejectedHtml).not.toContain('AB12CD34');
  expect(rejectedHtml).not.toContain('Jordan');
  expect(rejectedHtml).not.toContain('1990-04-12');

  await page.getByRole('button', { name: 'Start a new application' }).click();
  await completeIdentity(page, 'unavailable');
  await expect(page.getByTestId('identity-outcome')).toContainText('not a rejection');
  await expect(page.getByTestId('identity-outcome')).not.toContainText('final decision');
  await expect(page.getByRole('button', { name: 'Retry verification' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Set up savings account' })).toHaveCount(0);
  await page.getByLabel('Rehearsal verification outcome').selectOption('verified');
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await expect(page.getByTestId('identity-outcome')).toContainText('not an accepted verification');
  await page.getByRole('button', { name: 'Set up savings account' }).click();
  await expect(page.getByRole('alert')).toContainText('W02');
  await expect(page.getByRole('alert')).toContainText('26 November 2026');
  await expect(page.getByRole('alert')).not.toContainText('rejected');
  await page.getByRole('button', { name: 'Add initial funding' }).click();
  await expect(page.getByRole('alert')).toContainText('funding is not accepted');
  await expect(page.getByText('Everyday balance £12,480.50')).toBeVisible();
  await page.getByRole('button', { name: 'Back to overview' }).click();
  await expect(page.getByTestId('balance')).toHaveText('£12,480.50');

  const stored = await page.evaluate(() => localStorage.getItem('meridian_bank_state') ?? '');
  const consoleText = logs.join('\n');
  for (const secret of ['Jordan', 'Ellis', '1990-04-12', 'AB12CD34', '4242424242424242']) {
    expect(stored).not.toContain(secret);
    expect(consoleText).not.toContain(secret);
  }
});
