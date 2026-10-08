# Ledgerly — Multi-Company Accounting & Audit Management Platform

Ledgerly is a full-stack, multi-tenant accounting system: double-entry
bookkeeping, real financial statements (Trial Balance, Income Statement,
Balance Sheet, Cash Flow), fixed-asset management with depreciation and
disposal, customers/suppliers/employees, accounting periods, a full audit
trail, and role-based access control — all backed by real PostgreSQL data,
with no mock or hardcoded report values.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React, TypeScript |
| Database | PostgreSQL |
| ORM | **Drizzle ORM** — see [ORM note](#orm-note-drizzle-instead-of-prisma) |
| Auth | NextAuth v5 (Credentials provider, JWT sessions), bcrypt password hashing |
| Styling | Tailwind CSS v4 + a small hand-built shadcn/ui-style component set on Radix UI primitives |
| Validation | Zod |
| API | REST (Next.js Route Handlers) |
| Tests | Vitest, against a dedicated `accounting_test` database |

### ORM note: Drizzle instead of Prisma

The spec asked for Prisma. In this build environment, Prisma's engine
binary download (`binaries.prisma.sh`) is blocked by network policy with no
workaround available (organization-level policy denial, not a transient
error). **Drizzle ORM was substituted** — it is a pure TypeScript/SQL ORM
with no native binary dependency, and it preserves every architectural
property the spec cares about: a typed schema, generated SQL migrations,
atomic multi-statement transactions, and a clean service-layer boundary
between the database and the rest of the app. If you deploy this somewhere
without that network restriction, migrating from Drizzle to Prisma is
possible but not necessary — Drizzle is production-ready and works
identically on Vercel/any standard Postgres host.

## Architecture

```
User Input (General Entries UI)
        │
        ▼
Transaction Service (src/server/services/transactions.ts)
  — knows how to turn "Paid Salary" into the correct debit/credit lines
        │
        ▼
Accounting Engine (src/server/services/accounting-engine.ts)
  — the ONLY path that writes journal data. Validates: ≥2 lines, no
    negative amounts, no line with both a debit and a credit, debits
    total == credits total, all accounts belong to the company and are
    active, the target accounting period is open. Runs inside a single
    DB transaction (or joins a caller's existing one — see below).
        │
        ▼
journal_entries + journal_lines (Postgres)
        │
        ▼
Reporting Service (src/server/services/reports.ts)
  — the ONLY place financial-statement math happens. Trial Balance,
    Income Statement, Balance Sheet and Cash Flow are all computed here,
    from SQL-side SUM() aggregation over POSTED journal lines only.
        │
        ▼
UI (Server Components read report data directly; pages never
    recompute or duplicate accounting formulas)
```

**Nothing in the frontend calculates a financial statement.** Every number
shown in the UI comes from the reporting service, which in turn comes from
real posted journal lines — never from the transaction form's own inputs,
and never hardcoded.

### Why a transaction can pass an existing DB transaction through

Composite operations — like registering a fixed asset, which both inserts
an `assets` row *and* books a journal entry in one atomic unit — call
`createJournalEntry(input, existingTx)`. If `existingTx` is provided, the
engine reuses it instead of opening a new one. This was added specifically
to fix a self-deadlock: two nested `db.transaction()` calls both trying to
`SELECT ... FOR UPDATE` the same `companies` row (for atomic entry
numbering) on separate connections will wait on each other forever. Every
service that composes multiple writes into one business operation now
threads its transaction handle through explicitly.

### How each financial statement is calculated

All of the below operate only on `journal_entries.status = 'POSTED'` lines
— draft, reversed and voided entries never affect a report.

- **Trial Balance** — for every account, `debit − credit` summed across all
  posted lines up to the as-of date. A positive net lists under Debit, a
  negative net under Credit. This is a *raw* net, independent of the
  account's own normal balance side — that's the definition of a trial
  balance, and it's how an out-of-balance error would actually surface.

- **General Ledger** (single account) — opening balance = net of all
  posted activity strictly before the period start; each subsequent line
  updates a running balance in the account's normal-balance direction;
  closing balance = the last running balance.

- **Income Statement** — `Revenue − COGS = Gross Profit`,
  `Gross Profit − Operating Expenses = Operating Profit (= Net Profit,
  since "other income/expense" accounts are just ordinary Revenue/Expense
  accounts here)`. Each category total is the *category-normalized* net
  (credit-normal for Revenue, debit-normal for COGS/Expense) summed across
  every account in that category — see the contra-account note below.

- **Balance Sheet** — `Assets`, `Liabilities`, `Equity` totals, each summed
  the same category-normalized way, plus Current Year Earnings (this
  period's Income Statement net profit) rolled into Equity so the sheet
  balances without a manual year-end closing entry. Validated as
  `Assets = Liabilities + Equity`.

- **Cash Flow Statement** (indirect-ish, transaction-type based) — every
  posted line touching a cash/bank account (`gl_accounts.is_cash_or_bank`)
  is grouped by its journal entry's transaction type into
  Operating / Investing / Financing per standard classification rules
  (asset purchases/disposals → Investing; owner investment/drawings and
  loans → Financing; everything else → Operating). Opening-balance entries
  are folded into the opening cash figure rather than classified as
  movement. `Opening + Operating + Investing + Financing` is checked
  against the account's actual ledger closing balance (`reconciles`).

#### A note on contra-accounts

Some accounts run opposite their category's usual side — Accumulated
Depreciation (an Asset, but naturally a *credit* balance) and Drawings (an
Equity account, but naturally a *debit* balance). Category totals in the
Balance Sheet and Income Statement compute each account's contribution
using the **category's** natural direction, not the individual account's
own `normalBalance` — so a contra-account correctly nets *against* its
category instead of being added the wrong way. (Per-account display, e.g.
in the General Ledger, still uses that account's own normal side, which is
the correct convention there.)

## Data model highlights

- Every business table (`gl_accounts`, `journal_entries`, `customers`,
  `suppliers`, `employees`, `assets`, `tax_rates`, `accounting_periods`,
  `attachments`, `audit_logs`, `notifications`, …) carries a `company_id`
  foreign key, and every service-layer query filters by it — this is the
  entire mechanism behind multi-tenant data isolation, tested explicitly
  (see [Tests](#tests)).
- `journal_entries.status` is one of `DRAFT / POSTED / REVERSED / VOIDED`.
  Only `POSTED` entries affect financial statements. A posted entry is
  **never edited or deleted** — correcting one means reversing it (an
  equal-and-opposite entry) and posting a new correct one, preserving full
  audit history.
- `accounting_periods.status` is `OPEN / CLOSED / LOCKED`. Closing a period
  blocks new postings dated inside it; reopening requires the Owner role.
- `audit_logs` records who did what, when, and the before/after JSON for
  every journal-entry create/post/reverse/void and period change.
- Attachments are **metadata + reference, never raw binaries in Postgres**:
  the `attachments` table stores `fileName/fileType/fileSize/storageKey/
  storageProvider`; actual bytes live in whichever storage provider is
  configured (`local` disk under `./uploads` in dev, or any
  S3-compatible bucket in production — see `STORAGE_PROVIDER`).

## Getting started (local development)

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (running locally or reachable via `DATABASE_URL`)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Session signing secret — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `STORAGE_PROVIDER` | `local` (default, dev) or `s3` |
| `STORAGE_S3_BUCKET` / `STORAGE_S3_REGION` / `STORAGE_S3_ACCESS_KEY_ID` / `STORAGE_S3_SECRET_ACCESS_KEY` | Only needed when `STORAGE_PROVIDER=s3` |

Never commit `.env` — it's gitignored. `.env.example` is the only
env-related file tracked in git.

### 3. Create the database and enable the UUID extension

```bash
createdb accounting_dev
psql accounting_dev -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

### 4. Run migrations

```bash
npm run db:generate   # regenerate SQL migrations from schema.ts (only needed after a schema change)
npm run db:migrate    # apply migrations to DATABASE_URL
```

### 5. Seed demo data (optional but recommended)

```bash
npm run db:seed
```

This creates a fully worked example company, **ABC Manufacturing Ltd.**,
with opening balances, purchases, sales, payroll, a loan, an asset
purchase/depreciation/disposal, tax handling, and customer/supplier credit
transactions — enough to exercise every report. Login after seeding:

```
Email:    demo@ledgerly.dev
Password: Password123!
```

### 6. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Tests

Tests run against a **separate** database (`accounting_test`) — they
`TRUNCATE` every table between test cases, so this must never point at your
dev or production database. `tests/setup.ts` refuses to run if
`DATABASE_URL` doesn't contain `accounting_test`, as a safety check.

```bash
createdb accounting_test
psql accounting_test -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/accounting_test" npm run db:migrate

npm test            # run once
npm run test:watch  # watch mode
```

The suite (`tests/accounting.test.ts`) covers every scenario the spec
calls out as critical: balanced-entry acceptance, unbalanced-entry
rejection, revenue/expense flowing correctly into the Income Statement,
asset purchase and disposal (gain and loss cases), owner investment, loan
received/paid, salary payment, Trial Balance always balancing, the Balance
Sheet equation holding (including with contra-accounts present), Cash Flow
reconciling to the actual ledger balance, draft entries being excluded from
reports, closed periods blocking new postings, and company data isolation
across tenants.

## Production build & deployment (Vercel)

```bash
npm run build
npm start
```

To deploy on Vercel:

1. Push this repository to GitHub.
2. Import it into Vercel.
3. Provision a Postgres database (Vercel Postgres, Neon, Supabase, RDS —
   any standard Postgres works) and set `DATABASE_URL` in the Vercel
   project's environment variables.
4. Set `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (your Vercel deployment URL),
   and `STORAGE_PROVIDER` (`s3` in production, with the four
   `STORAGE_S3_*` variables — local disk storage does not persist across
   serverless invocations, so `local` is dev-only).
5. Run migrations against the production database once, before or during
   your first deploy: `DATABASE_URL=<prod-url> npm run db:migrate`. This is
   a deliberate manual/CI step, not run automatically on every build, so a
   bad migration never blocks or corrupts a live deploy.
6. Optionally run `npm run db:seed` once against production if you want the
   demo company there too (skip this for a real deployment).

## Project structure

```
src/
  app/                      Next.js App Router pages + API route handlers
    api/                    REST endpoints (see below)
    (auth)/                 Login / register / password reset pages
    companies/[companyId]/  All company-scoped pages (dashboard, entries,
                             accounts, journal, ledger, reports, assets,
                             customers, suppliers, employees, taxes,
                             periods, audit trail, settings)
  components/
    ui/                     Hand-built shadcn/ui-style primitives (Radix + Tailwind)
    layout/                 App shell (sidebar/topbar), search, notifications
    accounting/             Shared accounting widgets (ledger view, report
                             toolbar, attachments panel, parties table)
  server/
    db/                     Drizzle schema, client, seed script
    services/                Every business rule lives here — see Architecture
    api/                    Auth/permission helpers shared by all routes
    auth/                   NextAuth config + password hashing
  lib/                      money.ts (cents-safe arithmetic), errors.ts, api-client.ts
tests/                      Vitest suite + test-only helpers
scripts/                    verify-reports.ts — ad hoc report sanity check against seeded data
drizzle/                    Generated SQL migrations
```

### REST API surface

All endpoints are under `/api/companies/[companyId]/...` and enforce
company membership + role on every mutating call server-side (never relying
on the frontend to hide a button):

- `accounts`, `accounts/[id]`, `accounts/[id]/ledger`
- `journal-entries`, `journal-entries/[id]`, `.../post`, `.../reverse`, `.../void`
- `transactions` — the single endpoint the "General Entries" UI posts to; a
  Zod discriminated union dispatches to the correct transaction template
  (sale, expense, purchase, salary, loan, owner investment/drawings,
  transfer, tax payment, custom entry, manual journal, opening balances)
- `reports/trial-balance`, `reports/income-statement`,
  `reports/balance-sheet`, `reports/cash-flow`
- `assets`, `assets/[id]`, `assets/[id]/depreciate`, `assets/[id]/dispose`
- `customers`, `suppliers`, `employees` (+ `[id]` for each)
- `taxes`, `periods`, `periods/[id]/{close,reopen,lock}`
- `audit-logs`, `dashboard`, `search`
- `attachments`, `attachments/[id]` (upload/list/download-link/delete)
- `members` (invite / change role)

Plus account-level: `/api/auth/*` (register, NextAuth session, password
reset) and `/api/notifications*`.

## Security notes

- Every mutating API route re-checks the caller's company membership and
  role server-side via `requireCompanyUserId(companyId, allowedRoles)` —
  the frontend hiding a button is never the only protection.
- Passwords are hashed with bcrypt; sessions are signed JWTs (NextAuth).
- All SQL goes through Drizzle's parameterized query builder — no raw
  string-concatenated SQL anywhere in the app.
- API errors are sanitized (`toSafeError`) before reaching the client —
  raw database errors and stack traces are logged server-side only.
- `.env` is gitignored; only `.env.example` (no real secrets) is committed.

## Known scope decisions

- Notifications are generated for the higher-signal events (journal entry
  posted/reversed via explicit post/reverse actions, period closed/
  reopened, user invited/role changed) rather than for every single
  transaction-template auto-post, to avoid flooding the notification list —
  every General Entries transaction still fully updates the books and audit
  trail regardless.
- PDF report export is not yet implemented (CSV export and browser print/
  "Save as PDF" are available from every report's toolbar); this is the one
  export format left as a follow-up.
