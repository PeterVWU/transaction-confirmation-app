import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import Login from './Login';
import Register from './Register';
import TransactionForm from './TransactionForm';
import TransactionRecords from './TransactionRecords';
import PublicRoute from './PublicRoute';
import UserManagement from './UserManagement';
import OrderDetail from './OrderDetail';
import PaymentOrders from './PaymentOrders';
import ResetPassword from './ResetPassword';
import NotificationSettings from './NotificationSettings';
import { apiFetch } from './api'; // Make sure this import exists

function App() {
  const [user, setUser] = useState(() => {
    const role = localStorage.getItem('role');
    const email = localStorage.getItem('email');
    if (role && email) {
      return { role, email };
    }
    return null;
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiFetch('/transactions');
        if (res.ok) {
          // Optionally, fetch user info from backend if you have a /me endpoint
          // setUser({ ...user info });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  // Admin-only route protection
  const AdminRoute = ({ user, children }) => {
    if (!user || user.role !== 'admin') {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    setUser(null);
  };

  React.useEffect(() => {
    console.log('Current user:', user);
  }, [user]);

  return (
    <Router>
      <div
        className="App"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar position="static">
          <Toolbar
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
              Transaction Confirmation Portal
            </Typography>
          </Toolbar>
        </AppBar>
        {/* Horizontal navigation bar */}
        <Box
          sx={{
            bgcolor: '#f5f5f5',
            borderBottom: '1px solid #e0e0e0',
            px: 2,
            py: 1,
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {!user && (
            <>
              <Button color="primary" component={Link} to="/">
                Home
              </Button>
              <Button color="primary" component={Link} to="/login">
                Employee
              </Button>
            </>
          )}
          {user && user.role === 'admin' && (
            <>
              <Button color="primary" component={Link} to="/records">
                Records
              </Button>
              <Button color="primary" component={Link} to="/admin/notification-settings">
                Notification Settings
              </Button>
              <Button color="primary" component={Link} to="/users">
                Users
              </Button>
              <Button color="primary" component={Link} to="/reset-password">
                Reset Password
              </Button>
              <Button color="primary" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
          {user && user.role !== 'admin' && (
            <>
              <Button color="primary" component={Link} to="/records">
                Records
              </Button>
              <Button color="primary" component={Link} to="/reset-password">
                Reset Password
              </Button>
              <Button color="primary" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
        </Box>
        {user && <Button component={Link} to="/orders">Order payments</Button>}
        <Box sx={{ mt: 4, flex: 1 }}>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute user={user}>
                  <TransactionForm />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute user={user}>
                  <Login onLogin={setUser} />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <AdminRoute user={user}>
                  <Register />
                </AdminRoute>
              }
            />
            <Route path="/records" element={user ? <TransactionRecords /> : <Navigate to="/login" replace />} />
            <Route
              path="/users"
              element={
                <AdminRoute user={user}>
                  <UserManagement />
                </AdminRoute>
              }
            />
            <Route path="/orders" element={user ? <PaymentOrders /> : <Navigate to="/login" replace />} />
            <Route path="/order/:orderNumber" element={user ? <OrderDetail /> : <Navigate to="/login" replace />} />
            <Route path="/reset-password" element={user ? <ResetPassword /> : <Navigate to="/login" replace />} />
            <Route
              path="/admin/notification-settings"
              element={
                <AdminRoute user={user}>
                  <NotificationSettings />
                </AdminRoute>
              }
            />
          </Routes>
        </Box>
        <Box
          component="footer"
          sx={{
            py: 2,
            px: 2,
            mt: 4,
            bgcolor: '#f5f5f5',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            &copy; {new Date().getFullYear()} Transaction Confirmation Portal
          </Typography>
        </Box>
        {/* User info in bottom right */}
        <Box
          sx={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            bgcolor: 'background.paper',
            boxShadow: 3,
            borderRadius: 2,
            px: 2,
            py: 1,
            zIndex: 1300,
            minWidth: 180,
            textAlign: 'right',
            fontSize: 14,
            color: 'text.secondary',
          }}
        >
          {user ? (
            <>
              <div>
                <strong>Email:</strong> {user.email}
              </div>
              <div>
                <strong>Role:</strong> {user.role}
              </div>
            </>
          ) : (
            <div>Not logged in</div>
          )}
        </Box>
      </div>
    </Router>
  );
}

export default App;
