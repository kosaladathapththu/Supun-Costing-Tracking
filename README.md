# Supun Group Costing & Pricing

Responsive React application for shipment costing, shared-cost allocation, landed-cost calculation, pricing, margin analysis, reporting and audit history.

## Run locally

```bash
npm install
npm run dev
```

The app starts in demo mode and saves data in browser local storage. Any email/password signs in locally.

## Firebase setup

1. Create a Firebase project and enable Email/Password Authentication, Firestore and Storage.
2. Copy `.env.example` to `.env` and enter the Firebase web-app configuration values.
3. Install the Firebase CLI, authenticate, and select the project.
4. Deploy rules and hosting with `firebase deploy` after running `npm run build`.

The Firebase client is initialized by `src/services/firebase.js` whenever configuration is present. Production data functions should use the collections below and Firebase Authentication instead of demo local persistence.

## Firestore collection design

- `users/{uid}` — name, email, role, active
- `products/{productId}` — code, name, categoryId, type, weight, volume, status
- `categories/{categoryId}` — name, active
- `suppliers/{supplierId}` — name, country, currency, contact, notes
- `costTypes/{costTypeId}` — name, active
- `costings/{costingId}` — reference, supplierId, date, currency, exchangeRate, invoice, notes, status, totals
- `costings/{costingId}/items/{itemId}` — product, quantity, supplier price, measurements, allocated and landed costs, prices
- `costings/{costingId}/additionalCosts/{costId}` — cost type, amount, allocation method
- `productCostHistory/{historyId}` — productId, costingId, date, landed cost and selling prices
- `auditLogs/{logId}` — actor, action, time, old value and new value (append-only)

Roles are `cfo`/`admin`, `costing_officer`, and `viewer`. Finalized costings are read-only in the UI and audit entries are append-only in the supplied Firestore rules.

## Calculation behavior

Shared expenses can be allocated by product value, quantity, weight or volume. The reusable calculation engine returns purchase cost, allocated cost, total and unit landed cost, then separate retail/wholesale profit, markup and margin values.
