import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import TransactionRecords from './TransactionRecords';
import { apiFetch } from './api';
jest.mock('./api', () => ({ apiFetch: jest.fn() }));
const summary = { _id: 'order1', orderNumber: '000123456', totalCents: 150000, confirmedCents: 50000, refundedCents: 0, remainingCents: 100000, overpaidCents: 0, holds: [], invoiceState: 'pending', releaseState: 'pending' };
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });
it('shows authoritative order balances in the accounting payment queue', async () => {
  localStorage.setItem('role', 'accounting');
  apiFetch.mockResolvedValue({ ok: true, json: async () => [{ _id: '1', email: 'buyer@example.com', orderNumber: '000123456', amount: 500, transactionNumber: 'PAY-A', transactionType: 'zelle', orderSummary: summary }] });
  render(<MemoryRouter><TransactionRecords /></MemoryRouter>);
  expect(await screen.findByText(/Total: \$1500\.00/)).toBeInTheDocument();
  expect(screen.getByText(/Remaining: \$1000\.00/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
});
it('loads one fulfillment row per order from the order endpoint', async () => {
  localStorage.setItem('role', 'processTeam');
  apiFetch.mockImplementation(async path => ({ ok: true, json: async () => path.startsWith('/orders') ? { orders: [{ ...summary, confirmedCents: 150000, remainingCents: 0, releaseState: 'released' }], total: 1 } : [] }));
  render(<MemoryRouter><TransactionRecords /></MemoryRouter>);
  expect(await screen.findByText('000123456')).toBeInTheDocument();
  expect(screen.getAllByText('000123456')).toHaveLength(1);
  expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/orders?eligible=true'));
});
it('refreshes order balances after accounting actions', async () => {
  const PaymentOrders = require('./PaymentOrders').default;
  localStorage.setItem('role', 'accounting');
  apiFetch.mockImplementation(async (path, options) => ({ ok: true, json: async () => options ? { order: summary } : path === '/orders/order1' ? { order: summary, payments: [], jobs: [] } : { orders: [summary], total: 1 } }));
  render(<PaymentOrders />);
  fireEvent.click(await screen.findByRole('button', { name: 'Payment history' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Retry release' }));
  expect(await screen.findByRole('button', { name: 'Retry release' })).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/orders/order1/retry-release', expect.objectContaining({ method: 'PATCH' }));
});
it('lets admins reject pending payments from All Transactions without granting confirmation', async () => {
  localStorage.setItem('role', 'admin');
  apiFetch.mockResolvedValue({ ok: true, json: async () => [{ _id: 'pending', email: 'buyer@example.com', orderNumber: '000123456', amount: 500, transactionNumber: 'ADMIN-REJECT', transactionType: 'zelle', confirmed: false, orderSummary: summary }] });
  render(<MemoryRouter><TransactionRecords /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Reject', exact: true }));
  expect(screen.queryByRole('button', { name: 'Confirm', exact: true })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Reject & Notify Customer' }));
  expect(await screen.findByText('Payment rejected. Customer notification queued.')).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/transactions/pending/reject', expect.objectContaining({ method: 'PATCH' }));
});
it.each([{ confirmed: true }, { rejected: true }, { voided: true }, { refundRequested: true }, { refunded: true }])('hides admin rejection for ineligible payments: %j', async flags => {
  localStorage.setItem('role', 'admin');
  apiFetch.mockResolvedValue({ ok: true, json: async () => [{ _id: 'protected', email: 'buyer@example.com', orderNumber: '000123456', amount: 500, transactionNumber: 'PROTECTED', transactionType: 'zelle', orderSummary: summary, ...flags }] });
  render(<MemoryRouter><TransactionRecords /></MemoryRouter>);
  await screen.findByText('buyer@example.com');
  expect(screen.queryByRole('button', { name: 'Reject', exact: true })).not.toBeInTheDocument();
});
