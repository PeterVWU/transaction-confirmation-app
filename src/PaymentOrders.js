import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, Typography, Table, TableHead, TableBody, TableRow, TableCell, TextField, Stack } from '@mui/material';
import { apiFetch } from './api';

export const money = value => value == null ? 'Unknown' : `$${(value / 100).toFixed(2)}`;
export default function PaymentOrders({ eligibleOnly = false, orderNumber }) {
  const [orders, setOrders] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [reason, setReason] = useState('');
  const [correction, setCorrection] = useState({});
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const role = localStorage.getItem('role');
  const load = useCallback(async () => {
    try {
      const response = await apiFetch(`/orders?eligible=${eligibleOnly}&page=${page}&limit=25${orderNumber ? `&orderNumber=${encodeURIComponent(orderNumber)}` : ''}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (failure) { setError(failure.message); }
  }, [eligibleOnly, orderNumber, page]);
  useEffect(() => { load(); }, [load]);
  const expand = async id => {
    const response = await apiFetch(`/orders/${id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setDetail(data);
  };
  const action = async (path, body = {}) => {
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      await load();
      if (detail) await expand(detail.order._id);
      setReason('');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <Box component={Paper} sx={{ p: 3, m: 2, overflowX: 'auto' }}>
    <Typography variant="h5">{eligibleOnly ? 'Orders ready for fulfillment' : 'Order payments'}</Typography>
    <Button onClick={async () => { await load(); if (detail) await expand(detail.order._id); }}>Refresh balances</Button>
    {error && <Alert severity="error">{error}</Alert>}
    <Table aria-label="Order payment summaries">
      <TableHead><TableRow>{['Order', 'Total', 'Confirmed', 'Refunded', 'Remaining', 'Holds', 'Invoice', 'Fulfillment', ''].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
      <TableBody>{orders.map(order => <TableRow key={order._id}>
        <TableCell>{order.orderNumber}</TableCell><TableCell>{money(order.totalCents)}</TableCell><TableCell>{money(order.confirmedCents)}</TableCell><TableCell>{money(order.refundedCents)}</TableCell><TableCell>{money(order.remainingCents)}</TableCell>
        <TableCell>{order.holds.join(', ') || 'None'}{order.accountingFollowUp && ' • Accounting follow-up'}</TableCell><TableCell>{order.invoiceState}</TableCell><TableCell>{order.processed ? 'Processed' : order.releaseState}</TableCell>
        <TableCell><Button onClick={() => expand(order._id).catch(failure => setError(failure.message))}>Payment history</Button></TableCell>
      </TableRow>)}</TableBody>
    </Table>
    {orders.length === 0 && <Typography>No matching orders.</Typography>}
    <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
    <Button disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</Button>
    {detail && <Box sx={{ mt: 3 }}>
      <Typography variant="h6">Payment history: {detail.order.orderNumber}</Typography>
      <Typography>Overpayment: {money(detail.order.overpaidCents)}. Release: {detail.order.releaseState}. Invoice: {detail.order.invoiceState}.</Typography>
      {detail.payments.map(payment => <Box key={payment._id} sx={{ my: 2, borderBottom: '1px solid #ddd', pb: 2 }}>
        <Typography>{payment.transactionType} / {payment.transactionNumber} — {money(payment.amountCents)} — {payment.voided ? 'Voided' : payment.rejected ? 'Rejected' : payment.confirmed ? 'Confirmed' : 'Pending'}{payment.refundRequested ? ` — Pending refund: ${money(payment.refundAmountCents)}` : payment.refunded ? ` — Refunded: ${money(payment.refundAmountCents)}` : ''}</Typography>
        {payment.rejected && !payment.voided && role === 'accounting' && <Stack spacing={1}>
          <TextField label="Corrected order number" value={correction[payment._id]?.orderNumber ?? payment.orderNumber} onChange={event => setCorrection({ ...correction, [payment._id]: { ...correction[payment._id], orderNumber: event.target.value } })} />
          <TextField label="Corrected email" value={correction[payment._id]?.email ?? payment.email} onChange={event => setCorrection({ ...correction, [payment._id]: { ...correction[payment._id], email: event.target.value } })} />
          <TextField label="Corrected payment method" select SelectProps={{ native: true }} value={correction[payment._id]?.transactionType ?? payment.transactionType} onChange={event => setCorrection({ ...correction, [payment._id]: { ...correction[payment._id], transactionType: event.target.value } })}><option value="zelle">Zelle</option><option value="bank_deposit">ACH</option><option value="wire_transfer">Wire Transfer</option></TextField>
          <TextField label="Corrected amount" value={correction[payment._id]?.amount ?? payment.amount} onChange={event => setCorrection({ ...correction, [payment._id]: { ...correction[payment._id], amount: event.target.value } })} />
          <TextField label="Corrected reference" value={correction[payment._id]?.transactionNumber ?? payment.transactionNumber} onChange={event => setCorrection({ ...correction, [payment._id]: { ...correction[payment._id], transactionNumber: event.target.value } })} />
          <Button disabled={busy || !reason.trim()} onClick={() => action(`/transactions/${payment._id}/correct`, { ...correction[payment._id], reason })}>Correct and reopen</Button>
        </Stack>}
      </Box>)}
      {role === 'accounting' && <>
        <TextField fullWidth label="Accounting reason" value={reason} onChange={event => setReason(event.target.value)} />
        <Button disabled={busy || !reason.trim() || !detail.order.overpaidCents} onClick={() => action(`/orders/${detail.order._id}/acknowledge-overpayment`, { reason })}>Acknowledge overpayment</Button>
        <Button disabled={busy} onClick={() => action(`/orders/${detail.order._id}/retry-release`)}>Retry release</Button>
        <TextField label="Verified paid Magento invoice ID" value={invoiceId} onChange={event => setInvoiceId(event.target.value)} />
        <Button disabled={busy || !reason.trim()} onClick={() => action(`/orders/${detail.order._id}/resolve-review`, { reason, invoiceId })}>Resolve reviewed order data</Button>
        <Button disabled={busy || !reason.trim()} onClick={() => action(`/orders/${detail.order._id}/recover-stalled-release`, { reason })}>Recover stalled release</Button>
        <Button disabled={busy || !reason.trim()} onClick={() => action(`/orders/${detail.order._id}/bypass`, { reason })}>Use manual invoice</Button>
      </>}
      {['processTeam', 'admin'].includes(role) && <Button disabled={busy} onClick={() => action(`/orders/${detail.order._id}/${detail.order.processed ? 'unmark-processed' : 'mark-processed'}`)}>{detail.order.processed ? 'Reopen processing' : 'Mark processed'}</Button>}
      <Typography variant="h6" sx={{ mt: 2 }}>Delivery and release jobs</Typography>
      {detail.jobs.map(job => <Typography key={job._id}>{job.kind}: {job.state}{job.error ? ` — ${job.error}` : ''}{role === 'accounting' && job.kind !== 'release' && ['uncertain', 'working'].includes(job.state) && <Button disabled={busy || !reason.trim()} onClick={() => action(`/orders/${detail.order._id}/reconcile-notification`, { reason, jobId: job._id })}>Record manual reconciliation</Button>}</Typography>)}
    </Box>}
  </Box>;
}
