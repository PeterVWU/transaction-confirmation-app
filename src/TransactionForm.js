import React, { useState } from 'react';
import { submitTransaction } from './api';
import { Box, Button, TextField, Typography, Alert, Paper } from '@mui/material';

export default function TransactionForm() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }
    // Amount validation
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      errs.amount = 'Amount must be greater than 0.';
    }
    // Order Number warning
    if (!orderNumber) {
      errs.orderNumber = 'Order number is required.';
    }
    // Transaction Number warning
    if (!transactionNumber) {
      errs.transactionNumber = 'Transaction number is required. Incorrect value will result in unprocessed order.';
    }

    // Order number validation: at least 9 digits with optional suffix like -1, -2, etc.
    if (!orderNumber || !/^[0-9]{9,}(-[0-9]+)*$/.test(orderNumber)) {
      errs.orderNumber =
        'Order number must be at least 9 digits (including leading zeros) with optional suffix like -1, -2. Examples: 000111111, 0000111111-1';
    }

    // Transaction Type validation
    if (!transactionType) {
      errs.transactionType = 'Transaction type is required.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage('');

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Submit to backend
    const res = await submitTransaction({
      email,
      amount,
      orderNumber,
      transactionNumber,
      transactionType, // <-- add this
    });

    // Check for duplicate order number error
    if (res.message === 'Order number already exists.') {
      setErrors({ orderNumber: 'Order number already exists.' });
      setMessage('');
      return;
    }

    if (res._id) {
      setMessage('Transaction submitted!');
      setEmail('');
      setAmount('');
      setOrderNumber('');
      setTransactionNumber('');
      setTransactionType(''); // <-- add this
      setErrors({});
    } else {
      setMessage(res.message || 'Submission failed.');
    }
  };

  return (
    <Box component={Paper} elevation={3} sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 4 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        You are required to fill out this form because you chose the Deposit at Bank / Zelle payment option on our store
        page. Please complete this form after you have sent your payment. If you selected this payment option by
        accident, you may contact customer service to request cancellation of the order and then reorder with card.
      </Typography>
      <Typography variant="body2" color="info.main" sx={{ mb: 2 }}>
        <strong>Note:</strong> Please use the email address associated with your vapewholesaleusa.com account.
      </Typography>
      <Typography variant="h5" gutterBottom>
        Submit Transaction
      </Typography>
      {message && (
        <Alert severity={message === 'Transaction submitted!' ? 'success' : 'error'} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          margin="normal"
          required
          error={!!errors.email}
          helperText={errors.email}
        />
        <TextField
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          fullWidth
          margin="normal"
          required
          error={!!errors.amount}
          helperText={errors.amount}
        />
        <TextField
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          fullWidth
          margin="normal"
          required
          select
          SelectProps={{ native: true }}
          error={!!errors.transactionType}
          helperText={errors.transactionType || 'Transaction type is required'}
        >
          <option value="">Select Transaction Type</option>
          <option value="zelle">Zelle</option>
          <option value="bank_deposit">ACH</option>
          <option value="wire_transfer">Wire Transfer</option>
        </TextField>
        {/* Order Number warning */}
        <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
          Please double-check your Order Number. Incorrect value will result in unprocessed order.
        </Typography>
        <TextField
          label="Order Number"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          fullWidth
          margin="normal"
          required
          error={!!errors.orderNumber}
          helperText={
            errors.orderNumber
              ? 'Order number must be at least 9 digits (including leading zeros) with optional suffix. Examples: 000123456, 0000123456-1'
              : 'Order number is required and must be at least 9 digits (including leading zeros). Suffixes like -1, -2 are allowed.'
          }
        />
        {/* Transaction Number warning */}
        <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
          Please double-check your Transaction Number. Incorrect value will result in unprocessed order.
        </Typography>
        <TextField
          label="Transaction Number"
          value={transactionNumber}
          onChange={(e) => setTransactionNumber(e.target.value)}
          fullWidth
          margin="normal"
          required
          error={!!errors.transactionNumber}
          helperText={
            errors.transactionNumber &&
            'Transaction number is required. Incorrect value will result in unprocessed order.'
          }
        />
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Submit
        </Button>
      </form>
    </Box>
  );
}
