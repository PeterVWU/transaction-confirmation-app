import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Login from './Login';
import { login } from './api';
jest.mock('./api', () => ({ login: jest.fn() }));
it('shows login errors from the server', async () => {
  login.mockResolvedValue({ message: 'Invalid credentials' });
  render(<MemoryRouter><Login onLogin={jest.fn()} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'staff@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: /Login/i }));
  expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
});
