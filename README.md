# Transaction Confirmation Portal

React frontend for customer payment submissions, accounting confirmation, and order fulfillment. ECOM-343 supports multiple payments per Magento order. Each submission represents one transfer; customers reuse the original order number and provide a distinct payment reference.

Accounting confirms each payment separately. The order view shows authoritative totals, completed refunds, remaining balance, review holds, invoice state, fulfillment state, and expandable payment history. The fulfillment queue includes one eligible row per order. Three confirmed $500 transfers toward a $1,500 order release it only after the third confirmation and resolution of all holds.

## Run the isolated local demo

Clone the frontend and backend into sibling directories named `transaction-confirmation-app` and `transaction-confirmation-backend`. Install dependencies with `npm ci` in each package. Then run from this directory:

```sh
npm run build
node e2e/payments-server.cjs
```

Open <http://localhost:3001> for customer submissions or <http://localhost:3001/login> for employees. The demo listens on loopback ports 3000 and 3001, creates a temporary MongoDB replica set, and mocks Magento and notification delivery. It does not use production payments, invoices, or notification credentials. MongoDB binaries may download on the first run. Data resets when the server restarts.

These credentials are seeded only by the isolated demo server:

| Role | Email | Password |
| --- | --- | --- |
| Accounting | accounting@vapewholesaleusa.com | `BrowserTest123!` |
| Fulfillment | processteam@vapewholesaleusa.com | `BrowserTest123!` |

Every valid mock order has a $1,500 USD total. To test installments:

1. Submit three $500 transfers for order `000123456`, using references `DEMO-1`, `DEMO-2`, and `DEMO-3`.
2. Sign in as accounting and confirm each transfer. The first two confirmations leave a balance and do not capture an invoice or notify fulfillment.
3. Open **Order payments**, refresh balances, and expand **Payment history**. The final confirmation permits a single order release.
4. Sign out and sign in as fulfillment to process the eligible order.

Accounting can also test rejected-payment corrections, refund holds, overpayment acknowledgment, and release recovery. References are trimmed and matched without regard to letter case, with punctuation preserved. Rejected and voided records retain their reserved references.

## Development and validation

`npm start` runs the CRA development server. Configure `PORT=3001` and `REACT_APP_API_URL` for a separately running API; the default API prefix is `/api`. Local environment files must remain untracked.

```sh
CI=true npm run test:coverage -- --runInBand
npm run build
npx playwright install chromium
npm run e2e
```

Stop the manual demo before running Playwright: the test runner starts its own isolated server on the same ports. Default browser journeys run in Chromium with mocked external services and reset the test database between tests. To run only the installment journey, use `npx playwright test --config playwright.payments.config.ts`.

Validated for ECOM-343: 8 frontend tests, a successful production build, and 6 Chromium journeys. Backend verification passed 96 affected tests; its full suite also has 12 failures in unchanged authentication/user-management expectations. Details and commands are recorded in the backend rollout guide.

Screenshots captured by the installment journey:

- [Partial-payment queue](screenshots/partial-payment.png)
- [Completed order summary and payment history](screenshots/order-summary.png)

## Backend rollout

Use the matching `feature/ecom-343-multiple-payments` backend revision. See [the backend rollout and recovery guide](https://github.com/PeterVWU/transaction-confirmation-backend/blob/feature/ecom-343-multiple-payments/MULTIPLE-PAYMENTS.md) for migrations, flags, transaction support, API changes, monitoring, and rollback.

Real payment writes remain paused until the backend migration is verified and `MULTIPLE_PAYMENTS_ENABLED=true` is configured. Deploy the matching frontend and backend together after the documented rollout prerequisites. The local demo enables its own test-only feature flag automatically.

When the manual demo occupies ports 3000/3001, run browser tests with `ECOM343_TEST_FRONTEND_PORT=3311 ECOM343_TEST_BACKEND_PORT=3310 npm run e2e`.
