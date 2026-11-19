import { test, expect } from '@playwright/test';
test.beforeEach(async ({ request }) => { await request.post('/api/test-reset'); });
test('employee signs in with a cookie and signs out', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: false }).fill('accounting@vapewholesaleusa.com');
  await page.getByLabel('Password', { exact: false }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unconfirmed Transactions' })).toBeVisible();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Employee' })).toBeVisible();
});
test('rejects an invalid password and protects order history', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: false }).fill('accounting@vapewholesaleusa.com');
  await page.getByLabel('Password', { exact: false }).fill('incorrect');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByText('Invalid password', { exact: true })).toBeVisible();
});
