import { render, screen } from '@testing-library/react';
import App from './App';
jest.mock('./api', () => ({ apiFetch: jest.fn().mockResolvedValue({ ok: false }), submitTransaction: jest.fn() }));
it('renders the payment submission portal', async () => {
  localStorage.clear();
  render(<App />);
  expect(await screen.findByText('Transaction Confirmation Portal')).toBeInTheDocument();
  expect(screen.getByText(/Enter only the amount allocated to that order/i)).toBeInTheDocument();
});
