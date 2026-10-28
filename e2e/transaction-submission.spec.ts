import { test, expect } from '@playwright/test';
test.beforeEach(async ({ request }) => { await request.post('/api/test-reset'); });
test('validates an empty submission and clears stale field errors', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
  await page.getByLabel('Email', { exact: false }).fill('buyer@example.test');
  await expect(page.getByText('Please enter a valid email address.')).not.toBeVisible();
});
test('accepts repeated order numbers and reports normalized duplicate references', async ({ page }) => {
  await page.goto('/');
  for (const reference of ['REF-A', 'REF-B', ' ref-a ']) {
    await page.getByLabel('Email', { exact: false }).fill('buyer@example.test');
    await page.getByLabel('Amount', { exact: false }).fill('500');
    await page.getByLabel('Order Number', { exact: false }).fill('000123456');
    await page.getByLabel('Transaction Number', { exact: false }).fill(reference);
    await page.getByLabel('Transaction Type', { exact: true }).selectOption('zelle');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    if (reference === ' ref-a ') await expect(page.getByText('This payment reference has already been submitted for this payment method.')).toBeVisible();
    else await expect(page.getByText('Transaction submitted!', { exact: true })).toBeVisible();
  }
});
