import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  TextField,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  Divider,
  Snackbar,
  Alert,
  TablePagination,
} from '@mui/material';
import { Link } from 'react-router';
import PaymentOrders, { money } from './PaymentOrders';
import { apiFetch } from './api';

export default function TransactionRecords() {
  const [correctionPayment, setCorrectionPayment] = useState(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // Use string instead of number
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false); // Prevent double-click on confirm

  // Pagination state (server-side aware)
  const [page, setPage] = useState(0); // zero-based for MUI
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundId, setRefundId] = useState(null);
  const [refundMessage, setRefundMessage] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundError, setRefundError] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Add reject dialog state for accounting
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);

  // Add process confirmation dialog state
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processId, setProcessId] = useState(null);

  // Add confirmation error dialog state
  const [confirmErrorDialogOpen, setConfirmErrorDialogOpen] = useState(false);
  const [confirmErrorMessage, setConfirmErrorMessage] = useState('');
  const [confirmErrorDetails, setConfirmErrorDetails] = useState(null);

  // Add notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success', 'error', 'warning', 'info'
  });

  const [revision, setRevision] = useState(0);

  // Helper function to show notifications
  const showNotification = (message, severity = 'success') => {
    if (severity !== 'error') setRevision(value => value + 1);
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  // Fetch records with server-side pagination for 'all' tab without search; otherwise fetch all and paginate client-side
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const shouldServerPage = tab === 'all' && (!search || search.trim() === '');
        let res;
        if (shouldServerPage) {
          const serverPage = page + 1; // API expects 1-based
          res = await apiFetch(`/transactions?page=${serverPage}&limit=${rowsPerPage}`);
        } else {
          res = await apiFetch(`/transactions`);
        }
        const data = await res.json();
        const headerCount = res.headers ? res.headers.get && res.headers.get('X-Total-Count') : null;
        const parsedCount =
          shouldServerPage && headerCount ? parseInt(headerCount, 10) : Array.isArray(data) ? data.length : 0;
        setTotalCount(Number.isNaN(parsedCount) ? 0 : parsedCount);
        setRecords(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to fetch transactions:', e);
        setRecords([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, rowsPerPage, search, revision]);

  // Debug: Track error dialog state changes
  useEffect(() => {
    console.log('confirmErrorDialogOpen changed to:', confirmErrorDialogOpen);
    console.log('confirmErrorMessage:', confirmErrorMessage);
  }, [confirmErrorDialogOpen, confirmErrorMessage]);

  useEffect(() => {
    const role = localStorage.getItem('role');
    setUserRole(role);

    // Set default tab based on role
    if (role === 'accounting') {
      setTab('unconfirmed'); // Unconfirmed Transactions
    } else if (role === 'processTeam') {
      setTab('unprocessed'); // Unprocessed Records
    } else {
      setTab('all'); // All Transactions (for admin, customerService, etc.)
    }
  }, []);

  // Reset pagination when tab or search changes
  useEffect(() => {
    setPage(0);
  }, [tab, search]);

  // Remove order number error and enforcement for accounting UI
  const handleConfirmClick = (id) => {
    setSelectedId(id);
    setConfirmDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (confirmLoading) return; // Prevent double-click
    setConfirmLoading(true);
    try {
      console.log('Attempting to confirm transaction:', selectedId);
      const response = await apiFetch(`/transactions/${selectedId}/confirm`, {
        method: 'PATCH',
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseErr) {
          console.error('Failed to parse error response:', parseErr);
          errorData = { message: 'Failed to confirm transaction - server error' };
        }
        console.log('Error data from server:', errorData);

        setConfirmErrorMessage(errorData.message || 'Failed to confirm transaction');
        setConfirmErrorDetails(errorData);
        console.log('Setting confirmErrorDialogOpen to true');
        setConfirmErrorDialogOpen(true);
        setConfirmDialogOpen(false);
        setSelectedId(null);
        return;
      }
      const result = await response.json();

      // Show warning if there was an issue with Magento invoice
      if (result.warning) {
        showNotification(`Transaction confirmed with warning: ${result.warning}`, 'warning');
      } else {
        showNotification(result.orderReleased ? 'Payment confirmed; order released.' : 'Payment confirmed. Order awaits full payment or release checks.', 'success');
      }

      setRecords((prev) => prev.map((rec) => (rec._id === selectedId ? { ...rec, confirmed: true } : rec)));
      setConfirmDialogOpen(false);
      setSelectedId(null);
    } catch (error) {
      console.error('Error confirming transaction:', error);
      setConfirmErrorMessage('Network error occurred while confirming transaction');
      setConfirmErrorDetails({ error: error.message });
      console.log('Setting confirmErrorDialogOpen to true (catch block)');
      setConfirmErrorDialogOpen(true);
      setConfirmDialogOpen(false);
      setSelectedId(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDialogClose = () => {
    setConfirmDialogOpen(false);
    setSelectedId(null);
  };

  // Refund handlers
  const handleRefundClick = (id) => {
    setRefundId(id);
    const rec = records.find((r) => r._id === id);
    setRefundAmount(rec ? rec.amount : '');
    setRefundDialogOpen(true);
  };

  const handleRefund = async () => {
    const transaction = records.find((r) => r._id === refundId);
    const maxAmount = transaction ? transaction.amount : 0;
    const refundValue = parseFloat(refundAmount);

    if (isNaN(refundValue) || refundValue <= 0) {
      setRefundError('Refund amount must be greater than 0.');
      return;
    }
    if (refundValue > maxAmount) {
      setRefundError(`Refund amount cannot exceed $${maxAmount}.`);
      return;
    }

    setRefundError('');

    const response = await apiFetch(`/transactions/${refundId}/refund`, {
      method: 'PATCH',
      body: JSON.stringify({
        refundAmount,
        message: refundMessage,
      }),
    });
    if (!response.ok) {
      const result = await response.json();
      setRefundError(result.message);
      return;
    }
    // Refresh current page
    const serverPage = page + 1;
    const res = await apiFetch(`/transactions?page=${serverPage}&limit=${rowsPerPage}`);
    const data = await res.json();
    const headerCount = res.headers ? res.headers.get && res.headers.get('X-Total-Count') : null;
    const parsedCount = headerCount ? parseInt(headerCount, 10) : Array.isArray(data) ? data.length : 0;
    setTotalCount(Number.isNaN(parsedCount) ? 0 : parsedCount);
    setRecords(Array.isArray(data) ? data : []);

    setRefundDialogOpen(false);
    setRefundId(null);
    setRefundMessage('');
    setRefundAmount('');
  };

  const handleRefundDialogClose = () => {
    setRefundDialogOpen(false);
    setRefundId(null);
  };

  // Delete handlers
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    const response = await apiFetch(`/transactions/${deleteId}`, { method: 'DELETE', body: JSON.stringify({ reason: 'Administrative removal of unused submission' }) });
    const result = await response.json();
    if (!response.ok) { showNotification(result.message, 'error'); return; }
    showNotification('Submission voided.');
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  const handleExportRefunds = async () => {
    try {
      const res = await fetch('/api/transactions/export-refunds', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to export refunds');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'refund_requests.txt';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export refunds');
    }
  };

  // Process confirmation handlers
  const handleProcessClick = (id) => {
    setProcessId(id);
    setProcessDialogOpen(true);
  };

  const handleProcessConfirm = async () => {
    try {
      const response = await apiFetch(`/transactions/${processId}/mark-processed`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark as processed');
      }

      setRecords((prev) => prev.map((r) => (r._id === processId ? { ...r, processed: true } : r)));
      showNotification('Transaction marked as processed successfully', 'success');
    } catch (error) {
      console.error('Error marking as processed:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }

    setProcessDialogOpen(false);
    setProcessId(null);
  };

  const handleProcessDialogClose = () => {
    setProcessDialogOpen(false);
    setProcessId(null);
  };

  // Reject handlers for accounting
  const handleRejectClick = (id) => {
    setRejectId(id);
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    try {
      const response = await apiFetch(`/transactions/${rejectId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Payment information could not be verified' }), // Changed from DELETE to PATCH
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject transaction');
      }

      setRecords((prev) => prev.filter((r) => r._id !== rejectId));
      showNotification('Payment rejected. Customer notification queued.', 'success');
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }

    setRejectDialogOpen(false);
    setRejectId(null);
  };

  const handleRejectDialogClose = () => {
    setRejectDialogOpen(false);
    setRejectId(null);
  };

  const filteredRecords = records
    .filter((rec) => {
      if (tab === 'unconfirmed') return !rec.confirmed && !rec.rejected && !rec.voided;
      if (tab === 'all') return true;
      if (tab === 'refund') return rec.refundRequested === true;
      if (tab === 'unprocessed') return rec.confirmed && !rec.processed;
      // Removed: if (tab === 'processed') return rec.processed === true;
      return true;
    })
    .filter((rec) =>
      [rec.email, rec.orderNumber, rec.transactionNumber, rec.transactionType].some(
        (field) => field && field.toLowerCase().includes(search.toLowerCase())
      )
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by newest first

  // Compute rows for display: server-side paging only when tab is 'all' and no search
  const isServerPaged = tab === 'all' && (!search || search.trim() === '');
  const pagedRecords = isServerPaged
    ? filteredRecords // server already returned the page; we still apply in-page filters (none for 'all' tab/no search)
    : filteredRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (tab === 'unprocessed') return <><Button onClick={() => setTab('all')}>Payment queue</Button><PaymentOrders eligibleOnly /></>;

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      sx={{
        maxWidth: 1800,
        mx: 'auto',
        mt: 5,
        mb: 5,
        width: '100%',
        minWidth: 'fit-content',
        transition: 'width 0.3s ease-in-out',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 3,
          width: '100%',
          overflow: 'auto',
        }}
      >
        <Typography variant="h4" fontWeight={600} gutterBottom>
          {tab === 'unconfirmed'
            ? 'Unconfirmed Transactions'
            : tab === 'all'
            ? 'All Transactions'
            : tab === 'refund'
            ? 'Refund Request Transactions'
            : tab === 'unprocessed'
            ? 'Unprocessed Records'
            : 'All Transactions'}{' '}
          {/* Default fallback instead of 'Processed Records' */}
        </Typography>
        <Tabs
          value={getTabsForRole(userRole).findIndex((t) => t.key === tab)}
          onChange={(_, index) => setTab(getTabsForRole(userRole)[index].key)}
          sx={{ mb: 3 }}
        >
          {getTabsForRole(userRole).map((tabConfig) => (
            <Tab key={tabConfig.key} label={tabConfig.label} />
          ))}
        </Tabs>
        <TextField
          label="Search by email, order number, transaction number, or transaction type"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
        />
        {tab === 'refund' && (
          <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={handleExportRefunds}>
            Export Refund Requests
          </Button>
        )}
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            boxShadow: 0,
            width: '100%',
            overflow: 'auto',
            transition: 'width 0.3s ease-in-out',
          }}
        >
          <Table
            size="small"
            sx={{
              minWidth: 900,
              width: '100%',
              tableLayout: 'auto',
            }}
          >
            <TableHead sx={{ position: 'sticky', top: 0, bgcolor: '#f7f7fa', zIndex: 1 }}>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Order #</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Order balance</TableCell>
                <TableCell>Transaction Type</TableCell>
                <TableCell>Transaction #</TableCell>
                <TableCell>Time</TableCell>
                {tab === 'all' && <TableCell>Confirmed</TableCell>}
                {tab === 'all' && <TableCell>Processed</TableCell>}
                {tab === 'all' && <TableCell>Refunded</TableCell>}
                {tab === 'refund' && <TableCell>Comments</TableCell>}
                {tab === 'refund' && <TableCell>Refund Amount</TableCell>}
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRecords.map((rec) => (
                <TableRow
                  key={rec._id}
                  sx={{
                    bgcolor:
                      !rec.confirmed && tab === 'unconfirmed'
                        ? '#fffde7'
                        : rec.confirmed && tab === 'all'
                        ? '#c8e6c8 '
                        : undefined,
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                >
                  <TableCell>{rec.email}</TableCell>
                  <TableCell>{rec.orderNumber}</TableCell>
                  <TableCell>${rec.amount}</TableCell>
                  <TableCell>{rec.orderSummary ? <>Total: {money(rec.orderSummary.totalCents)}<br />Confirmed: {money(rec.orderSummary.confirmedCents)}<br />Remaining: {money(rec.orderSummary.remainingCents)}<br />Holds: {rec.orderSummary.holds.join(', ') || 'None'}</> : 'Order review required'}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor:
                          rec.transactionType === 'zelle'
                            ? 'primary.main'
                            : rec.transactionType === 'bank_deposit'
                            ? 'secondary.main'
                            : rec.transactionType === 'wire_transfer'
                            ? 'success.main'
                            : 'grey.400',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {rec.transactionType === 'bank_deposit'
                        ? 'ACH'
                        : rec.transactionType
                        ? rec.transactionType
                            .replace(/_/g, ' ') // Replace underscores with spaces
                            .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize first letter of each word
                        : 'N/A'}
                    </Box>
                  </TableCell>
                  <TableCell>{rec.transactionNumber}</TableCell>
                  <TableCell>{rec.createdAt ? new Date(rec.createdAt).toLocaleString() : ''}</TableCell>
                  {tab === 'all' && <TableCell>{rec.voided ? 'Voided' : rec.rejected ? 'Rejected' : rec.confirmed ? 'Yes' : 'No'}</TableCell>}
                  {tab === 'all' && <TableCell>{rec.processed ? 'Yes' : 'No'}</TableCell>}
                  {tab === 'all' && <TableCell>{rec.refunded ? 'Yes' : 'No'}</TableCell>}
                  {tab === 'refund' && (
                    <TableCell>
                      {rec.comments && rec.comments.length > 0 ? (
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          {rec.comments.map((c) => (
                            <li key={c._id}>
                              <strong>{c.author?.email || 'User'}:</strong> {c.message}
                              <br />
                              <span style={{ fontSize: 12, color: '#888' }}>
                                {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: '#888' }}>No comments</span>
                      )}
                    </TableCell>
                  )}
                  {tab === 'refund' && (
                    <TableCell>
                      {rec.refundAmount !== undefined && rec.refundAmount !== null && rec.refundAmount !== '' ? (
                        <span>${rec.refundAmount}</span>
                      ) : (
                        <span style={{ color: '#888' }}>N/A</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      {userRole === 'accounting' && rec.rejected && !rec.voided && <Button onClick={() => { setCorrectionPayment({ ...rec }); setCorrectionReason(''); }}>Correct and reopen</Button>}
                      {userRole === 'accounting' && !rec.confirmed && tab === 'unconfirmed' && (
                        <>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleConfirmClick(rec._id)}
                          >
                            Confirm
                          </Button>

                        </>
                      )}
                      {(userRole === 'admin' || (userRole === 'accounting' && tab === 'unconfirmed')) && !rec.confirmed && !rec.rejected && !rec.voided && !rec.refunded && !rec.refundRequested && (
                        <Button variant="outlined" color="error" size="small" onClick={() => handleRejectClick(rec._id)}>Reject</Button>
                      )}
                      {userRole === 'processTeam' && rec.orderSummary?.releasedAt && !rec.orderSummary?.holds.length && rec.orderSummary?.remainingCents === 0 && !rec.processed && (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleProcessClick(rec._id)}
                        >
                          Mark Processed
                        </Button>
                      )}
                      <Button variant="outlined" size="small" component={Link} to={`/order/${rec.orderNumber}`}>
                        View Order
                      </Button>
                      {tab === 'all' && rec.confirmed && !rec.refunded && !rec.refundRequested && (
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          onClick={() => handleRefundClick(rec._id)}
                        >
                          Refund Request
                        </Button>
                      )}
                      {userRole === 'admin' && tab === 'refund' && (
                        <>
                          {!rec.refunded && rec.refundRequested && (
                            <>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={async () => {
                                  await apiFetch(`/transactions/${rec._id}/mark-refunded`, {
                                    method: 'PATCH',
                                  });
                                  setRevision(value => value + 1);
                                  setRecords((prev) =>
                                    prev.map((r) =>
                                      r._id === rec._id ? { ...r, refunded: true, refundRequested: false } : r
                                    )
                                  );
                                }}
                                sx={{ mr: 1 }}
                              >
                                Mark as Refunded
                              </Button>
                              <Button
                                variant="outlined"
                                color="warning"
                                size="small"
                                onClick={async () => {
                                  await apiFetch(`/transactions/${rec._id}/cancel-refund`, {
                                    method: 'PATCH',
                                  });
                                  setRevision(value => value + 1);
                                  setRecords((prev) =>
                                    prev.map((r) => (r._id === rec._id ? { ...r, refundRequested: false } : r))
                                  );
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      {userRole === 'admin' && tab === 'all' && !rec.confirmed && !rec.refunded && !rec.voided && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleDeleteClick(rec._id)}
                        >
                          Void
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {pagedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={tab === 'all' ? 10 : 8} align="center">
                    <Typography color="text.secondary">No transactions found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {/* Pagination controls */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <PaginationControls
            count={isServerPaged ? totalCount : filteredRecords.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </Box>
      </Paper>

      <Dialog open={!!correctionPayment} onClose={() => setCorrectionPayment(null)}>
        <DialogTitle>Correct rejected payment</DialogTitle>
        <DialogContent>
          {correctionPayment && ['email', 'amount', 'orderNumber', 'transactionNumber', 'transactionType'].map(field => <TextField key={field} fullWidth margin="normal" label={field} value={correctionPayment[field]} onChange={event => setCorrectionPayment({ ...correctionPayment, [field]: event.target.value })} />)}
          <TextField fullWidth margin="normal" label="Correction reason" value={correctionReason} onChange={event => setCorrectionReason(event.target.value)} />
        </DialogContent>
        <DialogActions><Button onClick={() => setCorrectionPayment(null)}>Cancel</Button><Button disabled={!correctionReason.trim()} onClick={async () => {
          try {
            const response = await apiFetch(`/transactions/${correctionPayment._id}/correct`, { method: 'PATCH', body: JSON.stringify({ ...correctionPayment, reason: correctionReason }) });
            const result = await response.json();
            if (!response.ok) { showNotification(result.message, 'error'); return; }
            setCorrectionPayment(null);
            showNotification('Payment corrected and reopened.');
          } catch (failure) { showNotification(failure.message, 'error'); }
        }}>Save and reopen</Button></DialogActions>
      </Dialog>
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleDialogClose} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Confirm Transaction</DialogTitle>
        <Divider />
        <DialogContent sx={{ bgcolor: '#f9f9f9' }}>
          <DialogContentText sx={{ mb: 2 }}>Are you sure you want to confirm this transaction?</DialogContentText>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Order Number:</strong> {selectedId && records.find((r) => r._id === selectedId)?.orderNumber}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Amount:</strong> ${selectedId && records.find((r) => r._id === selectedId)?.amount}
          </Typography>
          <Typography variant="body2" color="warning.main">
            This confirms this payment only. The order is released after full payment and all review holds are resolved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={confirmLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="success" variant="contained" disabled={confirmLoading}>
            {confirmLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundDialogOpen} onClose={handleRefundDialogClose} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Refund Request</DialogTitle>
        <Divider />
        <DialogContent sx={{ bgcolor: '#f9f9f9' }}>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to request a refund for this transaction? Please provide a reason below.
          </DialogContentText>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Order Number:</strong> {refundId && records.find((r) => r._id === refundId)?.orderNumber}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Original Amount:</strong> ${refundId && records.find((r) => r._id === refundId)?.amount}
          </Typography>
          <TextField
            label="Refund Amount"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            type="number"
            fullWidth
            required
            sx={{ mt: 2 }}
          />
          <TextField
            label="Reason for refund"
            value={refundMessage}
            onChange={(e) => setRefundMessage(e.target.value)}
            fullWidth
            required
            multiline
            minRows={2}
            sx={{ mt: 2 }}
          />
          {refundError && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {refundError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRefundDialogClose}>Cancel</Button>
          <Button
            onClick={handleRefund}
            color="error"
            variant="contained"
            disabled={!refundMessage.trim() || !refundAmount}
          >
            Request Refund
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Void Submission</DialogTitle>
        <Divider />
        <DialogContent sx={{ bgcolor: '#f9f9f9' }}>
          <DialogContentText sx={{ mb: 2 }}>
            Void this unused submission? The record and payment reference will be preserved for audit.
          </DialogContentText>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Order Number:</strong> {deleteId && records.find((r) => r._id === deleteId)?.orderNumber}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Amount:</strong> ${deleteId && records.find((r) => r._id === deleteId)?.amount}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onClose={handleRejectDialogClose} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Reject Transaction</DialogTitle>
        <Divider />
        <DialogContent sx={{ bgcolor: '#f9f9f9' }}>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to reject this transaction? The customer will be notified via email to resubmit their
            information.
          </DialogContentText>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Order Number:</strong> {rejectId && records.find((r) => r._id === rejectId)?.orderNumber}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Amount:</strong> ${rejectId && records.find((r) => r._id === rejectId)?.amount}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Customer Email:</strong> {rejectId && records.find((r) => r._id === rejectId)?.email}
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            The payment will be preserved as rejected. Accounting can correct it with a reason and reopen it for confirmation.
          </Typography>
          <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
            📧 An email will be automatically sent to the customer with instructions to fill out the form again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectDialogClose}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject & Notify Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Confirmation Dialog */}
      <Dialog open={processDialogOpen} onClose={handleProcessDialogClose} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Mark Transaction as Processed</DialogTitle>
        <Divider />
        <DialogContent sx={{ bgcolor: '#f9f9f9' }}>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to mark this transaction as processed?
          </DialogContentText>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Order Number:</strong> {processId && records.find((r) => r._id === processId)?.orderNumber}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Amount:</strong> ${processId && records.find((r) => r._id === processId)?.amount}
          </Typography>
          <Typography variant="body2" color="info.main">
            This indicates that the order has been fulfilled and processed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleProcessDialogClose}>Cancel</Button>
          <Button onClick={handleProcessConfirm} color="primary" variant="contained">
            Mark as Processed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Error Dialog */}
      <Dialog
        open={confirmErrorDialogOpen}
        onClose={() => {
          console.log('Closing error dialog');
          setConfirmErrorDialogOpen(false);
        }}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 500, zIndex: 9999 } }}
        sx={{ zIndex: 9998 }}
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>⚠️ Transaction Confirmation Failed</DialogTitle>
        <Divider />
        <DialogContent sx={{ bgcolor: '#fdf2f2' }}>
          <DialogContentText sx={{ mb: 2, color: 'error.dark' }}>
            The transaction could not be confirmed due to the following issue:
          </DialogContentText>
          <Typography
            variant="body1"
            sx={{
              mb: 2,
              p: 2,
              bgcolor: 'white',
              border: '1px solid',
              borderColor: 'error.light',
              borderRadius: 1,
              fontWeight: 500,
            }}
          >
            {confirmErrorMessage}
          </Typography>

          {confirmErrorDetails && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Additional Details:</strong>
              </Typography>
              {confirmErrorDetails.orderTotal && confirmErrorDetails.transactionAmount && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Order Total: <strong>${confirmErrorDetails.orderTotal}</strong>
                </Typography>
              )}
              {confirmErrorDetails.orderTotal && confirmErrorDetails.transactionAmount && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Transaction Amount: <strong>${confirmErrorDetails.transactionAmount}</strong>
                </Typography>
              )}
            </>
          )}

          <Typography variant="body2" color="info.main" sx={{ mt: 2, fontStyle: 'italic' }}>
            💡 Please review the transaction details and contact the customer if needed to resolve this issue.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 2 }}>
          <Typography variant="body2" color="warning.main" sx={{ mb: 1, textAlign: 'center' }}>
            Use Order payments to review balances, holds, and manual invoice handling.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            <Button
              onClick={() => {
                console.log('Closing error dialog');
                setConfirmErrorDialogOpen(false);
              }}
              color="primary"
              variant="outlined"
              fullWidth
            >
              Understood
            </Button>

          </Box>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function PaginationControls({ count, page, rowsPerPage, onPageChange, onRowsPerPageChange }) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={onPageChange}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={[10, 25, 50, 100]}
      labelRowsPerPage="Rows per page"
    />
  );
}

function getTabsForRole(role) {
  const baseTabs = [
    { key: 'all', label: 'All Transactions' },
    { key: 'refund', label: 'Refund Request Transactions' },
  ];

  if (role === 'admin') {
    // Admin sees ALL tabs (removed 'processed' tab)
    return [
      { key: 'unconfirmed', label: 'Unconfirmed Transactions' },
      { key: 'unprocessed', label: 'Unprocessed Records' },
      ...baseTabs,
    ];
  }

  if (role === 'accounting') {
    return [{ key: 'unconfirmed', label: 'Unconfirmed Transactions' }, ...baseTabs];
  }

  if (role === 'processTeam') {
    return [{ key: 'unprocessed', label: 'Unprocessed Records' }, ...baseTabs];
  }

  return baseTabs; // For customerService and others
}
