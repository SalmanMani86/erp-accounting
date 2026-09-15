# ERP Accounting

A practical ERP Accounting module: multi-company, double-entry bookkeeping with fiscal
period controls, AR/AP, a General Ledger, and Trial Balance / P&L / Balance Sheet
reporting. Built for the *ERP / Accounting Engineering Assessment* — scoped to
demonstrate correct accounting flows and transactional integrity, not a full
production ERP.

- **Backend**: Node.js, TypeScript, Express, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **No authentication layer** (out of scope per the assessment brief) — every
  request is scoped by an explicit `companyId` in the URL, and isolation is
  enforced server-side at the query level, not by a login system.

## The scenario this system proves out

> A customer receives a transport service for SAR 10,000 plus 15% VAT and pays
> SAR 5,000 immediately.

| | |
|---|---|
| Invoice posts | Dr Accounts Receivable 11,500 = Cr Transport Revenue 10,000 + Cr VAT Payable 1,500 |
| Receipt posts | Dr Cash/Bank 5,000 = Cr Accounts Receivable 5,000 |
| Remaining AR balance | **SAR 6,500** |
| P&L impact | Revenue 10,000, Net Income 10,000 (VAT excluded — it was never revenue) |
| Balance Sheet | Assets 11,500 = Liabilities 1,500 + Equity 10,000 — balanced |

This is encoded as an executable test
(`backend/src/accounting-engine/scenario.test.ts`), not just documentation —
run `npm test` in `backend/` and it verifies these exact numbers on every run.

## Project structure

```
backend/    Express API + Prisma/PostgreSQL — see backend/prisma/schema.prisma
frontend/   React + Vite SPA
```

Each has full-depth business logic behind a thin CRUD layer for the parts the
assessment doesn't focus on (Customers, Suppliers, Chart of Accounts).

## Getting started

### Prerequisites

- Node.js 20+
- A local PostgreSQL server

### 1. Database

Create a dedicated user and database (adjust credentials as you like, then
match them in `backend/.env`):

```bash
sudo -u postgres psql -c "CREATE USER erp WITH PASSWORD 'erp' CREATEDB;" \
                       -c "CREATE DATABASE erp_accounting OWNER erp;"
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env            # defaults already point at the DB above
npm run prisma:migrate          # creates all tables
npm run prisma:seed             # optional — seeds two demo companies with a Chart of Accounts
npm run dev                     # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env            # points at http://localhost:4000/api
npm run dev                     # http://localhost:5173
```

Open `http://localhost:5173`, pick a company from the sidebar switcher (or
create one — it auto-seeds a standard Chart of Accounts), and start posting.

### Running tests

```bash
cd backend
npm test         # 32 tests: pure accounting-engine unit tests + real-Postgres integration tests
```

## Architecture, in brief

**No separate General Ledger table.** `journal_entries` +
`journal_entry_lines` *is* the GL — every report (Trial Balance, P&L, Balance
Sheet) is a live aggregate over these two tables, computed on every request,
never cached. This is the single design decision the rest of the system is
built around: there is nothing to reconcile, because there is nothing to
drift out of sync with.

**Domain logic is framework-free.** `backend/src/accounting-engine/` builds
and validates journal entries as pure functions — no Express, no Prisma, no
database. It's unit-tested in isolation, then called from
`backend/src/modules/*/*.service.ts`, which wraps it in a Prisma transaction
alongside the operational write (the invoice, receipt, etc.) and an audit log
entry — all three succeed together or none of them happen.

**Multi-company isolation is structural, not a filter.** Every tenant-owned
table carries `companyId`; every route is nested under a `:companyId` that a
`companyContext` middleware resolves and validates *before* any handler runs;
every service query goes through helpers that bake `companyId` into the
`WHERE` clause, so a mismatched ID reads as "not found," never another
company's data. A dedicated isolation test suite proves this end-to-end.
