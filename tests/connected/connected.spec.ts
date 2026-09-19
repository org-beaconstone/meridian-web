import { expect, test } from '@playwright/test';

test('web and mobile share real backend payments, budgets and isolated rooms', async ({
  browser,
  request,
}) => {
  const session = 'meridian-rehearsal';
  const reset = await request.post(
    (process.env.CONNECTED_API_URL || 'http://127.0.0.1:8080') + '/api/v1/reset',
    { headers: { 'X-Rehearsal-Session': session } },
  );
  expect(reset.ok()).toBe(true);
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1080 } }),
    handset = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const web = await desktop.newPage(),
    mobile = await handset.newPage();
  const errors: string[] = [];
  for (const page of [web, mobile]) {
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  await web.goto(process.env.CONNECTED_WEB_URL || 'http://127.0.0.1:5175');
  await mobile.goto(process.env.CONNECTED_MOBILE_URL || 'http://127.0.0.1:5176');
  await expect(web.getByTestId('balance')).toHaveText('£12,480.50');
  await expect(web.getByText('Connected API', { exact: true })).toBeVisible();
  await expect(mobile.getByTestId('mobile-balance')).toHaveText('£12,480.50');
  await web.getByRole('button', { name: 'Make a payment', exact: true }).first().click();
  await web.getByLabel('Amount (GBP)').fill('25.99');
  await web.getByLabel('Reference (optional)').fill('Shared web payment');
  await web.getByRole('button', { name: 'Review payment' }).click();
  await web.getByRole('button', { name: 'Confirm £25.99 payment' }).click();
  await expect(web.getByRole('heading', { name: 'A little thing, taken care of.' })).toBeVisible();
  await expect(mobile.getByTestId('mobile-balance')).toHaveText('£12,454.51', { timeout: 10000 });
  await mobile.getByRole('button', { name: 'Make a payment', exact: false }).click();
  await mobile.getByLabel('Amount (GBP)').fill('10.00');
  await mobile.getByLabel('Reference', { exact: true }).fill('Mobile back to web');
  await mobile.getByRole('radio', { name: /Bank payment/ }).check();
  await mobile.getByRole('button', { name: 'Review payment' }).click();
  await mobile.getByRole('button', { name: 'Confirm payment', exact: true }).click();
  await expect(mobile.getByRole('heading', { name: 'Demo payment complete' })).toBeVisible();
  await web.getByRole('button', { name: 'Back to overview' }).click();
  await expect(web.getByTestId('balance')).toHaveText('£12,444.51', { timeout: 10000 });
  await mobile.getByRole('button', { name: 'Settings', exact: true }).click();
  await mobile.getByLabel('Monthly limit (GBP)').fill('1500');
  await mobile.getByRole('button', { name: 'Save budget' }).click();
  await web.getByRole('button', { name: 'Budgets', exact: true }).click();
  await expect(web.getByRole('progressbar', { name: 'Shopping budget used' })).toHaveAttribute(
    'aria-valuetext',
    /£1,500.00/,
    { timeout: 10000 },
  );
  await mobile.getByLabel('Shared room').fill('isolated-mobile');
  await mobile.getByRole('button', { name: 'Apply room' }).click();
  await mobile.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(mobile.getByTestId('mobile-balance')).toHaveText('£12,480.50', { timeout: 10000 });
  await web.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(web.getByTestId('balance')).toHaveText('£12,444.51');
  await web.screenshot({ path: 'docs/images/connected-desktop.png', fullPage: true });
  await mobile.screenshot({ path: 'docs/images/connected-mobile.png', fullPage: true });
  const audit = await request.get(
    (process.env.CONNECTED_API_URL || 'http://127.0.0.1:8080') + '/api/v1/events',
    { headers: { 'X-Rehearsal-Session': session } },
  );
  expect((await audit.json()).events.length).toBeGreaterThan(0);
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
  await desktop.close();
  await handset.close();
});
