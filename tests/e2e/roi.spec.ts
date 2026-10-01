import { expect, test } from '@playwright/test';

test('whiteboard displacement calculator, notes, and case studies', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ROI', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Whiteboard displacement savings.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Enter seats from discovery to calculate annual savings.'),
  ).toBeVisible();
  await expect(page.getByLabel('Price per seat (USD per month)')).toHaveValue('20.00');

  await page.getByRole('textbox', { name: 'Seats', exact: true }).fill('120');
  await page.getByRole('textbox', { name: 'Boards to import', exact: true }).fill('40');
  await expect(page.getByTestId('annual-savings')).toContainText('$27,800.00');
  await expect(page.getByText('Not a quote')).toBeVisible();
  await page.getByRole('checkbox', { name: /Discovery confirmed/ }).check();
  await expect(page.getByText('Discovery confirmed', { exact: true })).toBeVisible();

  await page.getByLabel('Competitor tool').selectOption('mural');
  await expect(page.getByLabel('Price per seat (USD per month)')).toHaveValue('17.99');
  await page.getByRole('textbox', { name: 'Seats', exact: true }).fill('100');
  await page.getByRole('textbox', { name: 'Boards to import', exact: true }).fill('0');
  await expect(page.getByTestId('annual-savings')).toContainText('$21,588.00');
  await expect(page.getByText('Not a quote')).toBeVisible();

  await page.getByRole('tab', { name: 'Notes' }).click();
  await expect(page.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true');
  const notes = page.getByRole('tabpanel');
  await expect(notes).toContainText('battle card ticket');
  await expect(notes).toContainText('https://miro.com/pricing/');
  await expect(notes).toContainText('https://www.mural.co/pricing');
  await expect(notes).toContainText('Salesforce');

  await page.getByRole('tab', { name: 'Case studies' }).click();
  await expect(page.getByRole('article')).toHaveCount(10);
  await expect(page.getByText('Illustrative', { exact: true })).toHaveCount(10);
  await expect(page.getByText('Whiteboard displacement', { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole('article', { name: 'A Miro estate moves onto Whiteboard' }),
  ).toContainText('$27,800.00');
});

test('ROI navigation fits a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const overflows = await nav.evaluate((element) => element.scrollWidth > element.clientWidth + 1);
  expect(overflows).toBe(false);
  await page.getByRole('button', { name: 'ROI', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('textbox', { name: 'Seats', exact: true }).fill('10');
  await expect(page.getByTestId('annual-savings')).toContainText('$2,400.00');
});
