/**
 * Frontend Component Tests - TransactionForm Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import TransactionForm from '../TransactionForm';

// Mock the api module
jest.mock('../api', () => ({
  apiFetch: jest.fn(),
}));

const { apiFetch } = require('../api');

const renderTransactionForm = () => {
  return render(
    <BrowserRouter>
      <TransactionForm />
    </BrowserRouter>
  );
};

describe('TransactionForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all form fields', () => {
    renderTransactionForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/order number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/transaction type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/transaction number/i)).toBeInTheDocument();
  });

  it('should have a submit button', () => {
    renderTransactionForm();

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should update form fields on input', async () => {
    renderTransactionForm();
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'customer@example.com');
    expect(emailInput).toHaveValue('customer@example.com');

    const orderInput = screen.getByLabelText(/order number/i);
    await user.type(orderInput, '1234567890');
    expect(orderInput).toHaveValue('1234567890');

    const amountInput = screen.getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '150.50');
    expect(amountInput).toHaveValue(150.5);
  });

  it('should submit form with correct data', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    renderTransactionForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/order number/i), '1234567890');

    const amountInput = screen.getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '100');

    await user.type(screen.getByLabelText(/transaction number/i), 'TXN123');

    // Select transaction type
    await user.click(screen.getByLabelText(/transaction type/i));
    await user.click(screen.getByRole('option', { name: /zelle/i }));

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should show success message after successful submission', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    renderTransactionForm();
    const user = userEvent.setup();

    // Fill form
    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/order number/i), '1234567890');
    await user.type(screen.getByLabelText(/transaction number/i), 'TXN123');

    const amountInput = screen.getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '100');

    await user.click(screen.getByLabelText(/transaction type/i));
    await user.click(screen.getByRole('option', { name: /zelle/i }));

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/success|submitted|thank you/i)).toBeInTheDocument();
    });
  });

  it('should show error message on submission failure', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Order already exists' }),
    });

    renderTransactionForm();
    const user = userEvent.setup();

    // Fill form
    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/order number/i), '1234567890');
    await user.type(screen.getByLabelText(/transaction number/i), 'TXN123');

    const amountInput = screen.getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '100');

    await user.click(screen.getByLabelText(/transaction type/i));
    await user.click(screen.getByRole('option', { name: /zelle/i }));

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists|error/i)).toBeInTheDocument();
    });
  });
});
