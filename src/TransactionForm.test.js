import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionForm from './TransactionForm';
import { submitTransaction } from './api';
jest.mock('./api', () => ({ submitTransaction: jest.fn() }));
const fill = () => {
  for (const [label, value] of [['Email', 'buyer@example.com'], ['Amount', '500'], ['Order Number', ' 000123456 '], ['Transaction Number', ' REF-A '], ['Transaction Type', 'zelle']]) {
    fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`, 'i')), { target: { value } });
  }
};
beforeEach(() => jest.clearAllMocks());
it('explains installments and trims the original order number and reference', async () => {
  submitTransaction.mockResolvedValue({ _id: '1' });
  render(<TransactionForm />);
  expect(screen.getByText(/one transfer per form/i)).toBeInTheDocument();
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await screen.findByText('Transaction submitted!');
  expect(submitTransaction).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: '000123456', transactionNumber: 'REF-A', amount: '500' }));
});
it('displays duplicate-reference errors and clears them when the reference changes', async () => {
  submitTransaction.mockResolvedValue({ code: 'DUPLICATE_PAYMENT_REFERENCE', message: 'Reference already submitted.' });
  render(<TransactionForm />);
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await screen.findByText('Reference already submitted.');
  fireEvent.change(screen.getByLabelText(/Transaction Number/), { target: { value: 'NEW' } });
  expect(screen.queryByText('Reference already submitted.')).not.toBeInTheDocument();
});
it('shows actual validation errors and handles network failures', async () => {
  submitTransaction.mockRejectedValue(new Error('offline'));
  render(<TransactionForm />);
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
  expect(submitTransaction).not.toHaveBeenCalled();
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to submit'));
});
