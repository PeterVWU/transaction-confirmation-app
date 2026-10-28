// Isolated browser-test server. It never loads application .env files or calls external services.
const path = require('path');
const backend = path.resolve(__dirname, '../../transaction-confirmation-backend');
const dependency = name => require(path.join(backend, 'node_modules', name));
const express = dependency('express');
const mongoose = dependency('mongoose');
const { MongoMemoryReplSet } = dependency('mongodb-memory-server');
process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || path.join(backend, 'node_modules/.cache/mongodb-memory-server');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-browser-test-only';
process.env.MULTIPLE_PAYMENTS_ENABLED = 'true';
process.env.PAYMENT_MUTATIONS_PAUSED = 'false';
const captures = [];
const notices = [];
const magento = require(path.join(backend, 'utils/magentoHelper'));
Object.assign(magento, {
  findMagentoOrder: async number => ({ order: { entity_id: Number(number.split('-')[0]), increment_id: number.split('-')[0], grand_total: 1500, order_currency_code: 'USD', total_paid: 0 }, orderList: [] }),
  getOrderInvoices: async id => captures.includes(String(id)) ? [{ entity_id: id, state: 2, grand_total: 1500 }] : [],
  captureInvoice: async id => { captures.push(String(id)); return { success: true, invoiceId: id }; },
  getOrderSalesRep: async () => ({ rep_email: 'mock-sales@example.test' }),
});
const notifications = require(path.join(backend, 'utils/omnisendHelper'));
for (const name of Object.keys(notifications)) {
  notifications[name] = async () => { notices.push(name); return [{ success: true }]; };
}
async function start() {
  const database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(database.getUri());
  const User = require(path.join(backend, 'models/User'));
  const Payment = require(path.join(backend, 'models/TransactionRecord'));
  const Order = require(path.join(backend, 'models/PaymentOrder'));
  const Reference = require(path.join(backend, 'models/PaymentReference'));
  const Job = require(path.join(backend, 'models/PaymentJob'));
  await Promise.all([Payment.init(), Order.init(), Reference.init(), Job.init()]);
  for (const role of ['accounting', 'processTeam']) await User.create({ email: `${role.toLowerCase()}@vapewholesaleusa.com`, password: await dependency('bcryptjs').hash('BrowserTest123!', 4), role });
  let running = false;
  let resetting = false;
  const app = express();
  app.use(express.json());
  app.use(dependency('cookie-parser')());
  app.use('/api/auth', require(path.join(backend, 'routes/auth')));
  app.use('/api/transactions', require(path.join(backend, 'routes/transaction')));
  app.use('/api/orders', require(path.join(backend, 'routes/orders')));
  app.get('/api/health', (req, res) => res.json({ isolated: true }));
  app.post('/api/test-reset', async (req, res) => {
    resetting = true;
    while (running) await new Promise(resolve => setTimeout(resolve, 10));
    for (const model of [Payment, Order, Reference, Job, require(path.join(backend, 'models/PaymentAudit'))]) await model.deleteMany({});
    captures.length = 0;
    notices.length = 0;
    resetting = false;
    res.json({ reset: true });
  });
  app.get('/api/test-effects', (req, res) => res.json({ captures, notices }));
  app.use(express.static(path.resolve(__dirname, '../build')));
  app.get('*path', (req, res) => res.sendFile(path.resolve(__dirname, '../build/index.html')));
  const servers = [app.listen(3000, '127.0.0.1'), app.listen(3001, '127.0.0.1')];
  const timer = setInterval(async () => {
    if (running || resetting) return;
    running = true;
    try { await require(path.join(backend, 'services/paymentWorker')).runJobs(); }
    finally { running = false; }
  }, 100);
  const shutdown = async () => { clearInterval(timer); for (const server of servers) server.close(); await mongoose.disconnect(); await database.stop(); process.exit(0); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
start().catch(error => { console.error(error); process.exit(1); });
