import { test, expect } from '@playwright/test';
test.beforeEach(async ({ request }) => { await request.post('/api/test-reset'); });
test('fulfillment queue excludes an order with a partial confirmed payment', async ({ page, request }) => {
  const payment = await (await request.post('/api/transactions', { data: { email: 'buyer@example.test', amount: 500, orderNumber: '000123456', transactionNumber: 'PARTIAL', transactionType: 'zelle' } })).json();
  await request.post('/api/auth/login', { data: { email: 'accounting@vapewholesaleusa.com', password: 'BrowserTest123!' } });
  const confirmation = await request.patch(`/api/transactions/${payment._id}/confirm`);
  expect(confirmation.ok()).toBeTruthy();
  // Establish the fulfillment employee's browser session independently.
  await page.goto('/login');
  await page.getByLabel('Email', { exact: false }).fill('processteam@vapewholesaleusa.com');
  await page.getByLabel('Password', { exact: false }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Orders ready for fulfillment' })).toBeVisible();
  await expect(page.getByText('No matching orders.')).toBeVisible();
  const effects = await (await request.get('/api/test-effects')).json();
  expect(effects.captures).toHaveLength(0);
});
