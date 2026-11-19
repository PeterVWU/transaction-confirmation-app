import { test, expect } from '@playwright/test';
import path from 'path';
test.beforeEach(async ({ request }) => { await request.post('/api/test-reset'); });
test('three customer transfers release one order after the last accounting confirmation', async ({ page }) => {
  await page.goto('/');
  for (let index = 1; index <= 3; index += 1) {
    await page.getByLabel('Email', { exact: false }).fill('buyer@example.test');
    await page.getByLabel('Amount', { exact: false }).fill('500');
    await page.getByLabel('Order Number', { exact: false }).fill(' 000123456 ');
    await page.getByLabel('Transaction Number', { exact: false }).fill(`BROWSER-${index}`);
    await page.getByLabel('Transaction Type', { exact: true }).selectOption('zelle');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByText('Transaction submitted!', { exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Employee' }).click();
  await expect(page.getByLabel('Password', { exact: false })).toBeVisible();
  await page.getByLabel('Email', { exact: false }).fill('accounting@vapewholesaleusa.com');
  await page.getByLabel('Password', { exact: false }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unconfirmed Transactions' })).toBeVisible();
  for (let index = 1; index <= 3; index += 1) {
    await page.getByRole('button', { name: 'Confirm', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(3 - index);
    if (index < 3) {
      const effects = await (await page.request.get('/api/test-effects')).json();
      expect(effects.captures).toHaveLength(0);
      expect(effects.notices.filter((name: string) => name === 'notifyProcessTeamConfirmed')).toHaveLength(0);
    }
    if (index === 1) await page.screenshot({ path: path.resolve('screenshots/partial-payment.png'), fullPage: true });
  }
  await page.getByRole('link', { name: 'Order payments' }).click();
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh balances' }).click();
    await expect(page.getByRole('cell', { name: 'released', exact: true })).toBeVisible();
  }).toPass();
  await page.getByRole('button', { name: 'Payment history' }).click();
  await expect(page.getByText(/BROWSER-1/)).toBeVisible();
  await expect(page.getByText(/BROWSER-2/)).toBeVisible();
  await expect(page.getByText(/BROWSER-3/)).toBeVisible();
  await page.screenshot({ path: path.resolve('screenshots/order-summary.png'), fullPage: true });
  const effects = await (await page.request.get('/api/test-effects')).json();
  expect(effects.captures).toHaveLength(1);
  expect(effects.notices.filter((name: string) => name === 'notifyProcessTeamConfirmed')).toHaveLength(1);
});
test('accepts separate order allocations using the same transaction number', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Enter only the amount allocated to that order/)).toBeVisible();
  for (const [order, amount] of [['000123456', '200'], ['000999999', '350']]) {
    await page.getByLabel('Email', { exact: false }).fill('buyer@example.test');
    await page.getByLabel('Amount', { exact: false }).fill(amount);
    await page.getByLabel('Order Number', { exact: false }).fill(order);
    await page.getByLabel('Transaction Number', { exact: false }).fill('SHARED-TRANSFER');
    await page.getByLabel('Transaction Type', { exact: true }).selectOption('zelle');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByText('Transaction submitted!', { exact: true })).toBeVisible();
  }
  await page.getByLabel('Email', { exact: false }).fill('buyer@example.test');
  await page.getByLabel('Amount', { exact: false }).fill('200');
  await page.getByLabel('Order Number', { exact: false }).fill('000123456');
  await page.getByLabel('Transaction Number', { exact: false }).fill('shared-transfer');
  await page.getByLabel('Transaction Type', { exact: true }).selectOption('zelle');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('This payment reference has already been submitted for this order and payment method.')).toBeVisible();
  await page.getByLabel('Order Number', { exact: false }).fill('000888888');
  await expect(page.getByText('This payment reference has already been submitted for this order and payment method.')).not.toBeVisible();
  await page.screenshot({ path: '/tmp/order-allocation-form.png', fullPage: true });
});
