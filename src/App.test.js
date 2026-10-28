import { render, screen } from '@testing-library/react';
import App from './App';
jest.mock('./api', () => ({ apiFetch: jest.fn().mockResolvedValue({ ok: false }), submitTransaction: jest.fn() }));
it('renders the payment submission portal', async () => {
  localStorage.clear();
  render(<App />);
  expect(await screen.findByText('Transaction Confirmation Portal')).toBeInTheDocument();
  expect(screen.getByText(/one transfer per form/i)).toBeInTheDocument();
});
