import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import { useParams } from 'react-router';
import PaymentOrders from './PaymentOrders';
import { apiFetch } from './api'; // <-- Import your helper

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
      const res = await apiFetch(`/magento/order/${orderNumber}`);
      const data = await res.json();
      setOrderData(data);
      } catch (_) { setOrderData(null); }
      finally { setLoading(false); }
    };
    fetchOrder();
  }, [orderNumber]);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );

  if (!orderData || !orderData.order) return <><PaymentOrders orderNumber={orderNumber} /><Typography color="error">Magento order data is unavailable.</Typography></>;

  const { order, invoices, adminUrl, salesRep } = orderData;

  return (
    <Box component={Paper} sx={{ maxWidth: 700, mx: 'auto', mt: 4, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Magento Order: {order.increment_id}</Typography>
        {adminUrl && (
          <Button variant="contained" color="primary" href={adminUrl} target="_blank" rel="noopener noreferrer">
            View in Magento
          </Button>
        )}
      </Box>
      <PaymentOrders orderNumber={orderNumber} />
      <Divider sx={{ mb: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        Customer
      </Typography>
      <Table size="small">
        <TableBody>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>
              {order.customer_firstname} {order.customer_lastname}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>{order.customer_email}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Order Date</TableCell>
            <TableCell>{order.created_at}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Status</TableCell>
            <TableCell>{order.status}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {salesRep && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Sales Rep
          </Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>{salesRep.rep_name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>{salesRep.rep_email}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        Order Summary
      </Typography>
      <Table size="small">
        <TableBody>
          <TableRow>
            <TableCell>Grand Total</TableCell>
            <TableCell>${order.grand_total}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Shipping</TableCell>
            <TableCell>
              ${order.shipping_amount} ({order.shipping_description})
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Payment Method</TableCell>
            <TableCell>{order.payment?.additional_information?.[0]}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        Items
      </Typography>
      <Table size="small">
        <TableBody>
          {order.items.map((item) => (
            <TableRow key={item.item_id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>SKU: {item.sku}</TableCell>
              <TableCell>Qty: {item.qty_ordered}</TableCell>
              <TableCell>${item.price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        Invoice(s)
      </Typography>
      {invoices && invoices.length > 0 ? (
        <Table size="small">
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.entity_id}>
                <TableCell>Invoice #{inv.increment_id}</TableCell>
                <TableCell>Date: {inv.created_at}</TableCell>
                <TableCell>Amount: ${inv.grand_total}</TableCell>
                <TableCell>Status: {inv.state === 2 ? 'Paid' : 'Open'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography color="warning.main">No invoices found for this order.</Typography>
      )}
    </Box>
  );
}
