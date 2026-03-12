# Sonno Homes — Architecture & Implementation Notes

## Tech Stack Recommendation

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Database | PostgreSQL 16 | Robust, supports generated columns, JSONB for audit metadata, excellent indexing |
| Backend | Node.js + Express | Matches the React frontend ecosystem, large middleware library |
| ORM | Prisma | Type-safe, excellent migration system, auto-generated client, great DX with TypeScript |
| Auth | JWT (access + refresh) | Stateless access tokens (15min), refresh tokens stored in DB for revocation |
| File Storage | S3-compatible | Store reference URLs in `documents.file_url`, use pre-signed URLs for upload/download |
| Validation | Zod | Runtime schema validation for all API inputs, pairs well with TypeScript |

## Key Schema Design Decisions

### Multi-tenancy
- `organizations` table is the top-level tenant. Every major entity (users, properties, documents) has an `org_id`.
- Queries should always scope by `org_id` to prevent data leakage. Middleware can inject this from the JWT.

### Investments as a First-Class Entity
- The `investments` table is the junction between investors and properties, but it's more than a join table — it carries `amount`, `equity_share`, `start_date`, and `status`.
- Distributions hang off investments (not directly off investors or properties), which correctly models "investor X received $Y from property Z for period Q."

### Performance Reports Workflow
1. Admin creates a report (status: `draft`) for a property + period.
2. Admin adds expense line items (flexible — any category, any count).
3. `gross_profit` and `net_profit` are PostgreSQL generated columns — always consistent.
4. Admin publishes → status becomes `published`, a document record is auto-created, and `document_recipients` rows are inserted for every investor linked to that property.
5. Investors see the report in their Documents tab and when they click into the property.

### Expense Line Items
- `report_expenses` is a separate table with a `category` varchar — not a fixed set of columns.
- Admin can add rent, cleaning, utilities, maintenance, or any custom category.
- `sort_order` allows controlling display order in the UI.
- When expenses are added/updated, the backend recalculates `total_expenses` on the parent report.

### Soft Deletes
- Applied to: organizations, users, properties, investments, performance_reports, documents.
- All queries should include `WHERE deleted_at IS NULL` by default. Prisma middleware can handle this globally.
- Not applied to: distributions (financial records should never be soft-deleted — use status changes instead), audit_log (immutable), report_expenses (cascade-deleted with report).

### Audit Trail
- `audit_log` captures who did what, when, to which entity.
- `metadata` is JSONB for flexibility — can store old/new values, request context, etc.
- Key actions to log: report creation/publish/edit, distribution payments, investment changes, document uploads, user login.

## Indexes & Performance

- All foreign keys are indexed for join performance.
- `distributions` has a composite index on `(period_start, period_end)` for date-range queries.
- `audit_log` is indexed on `(entity_type, entity_id)` for entity-specific history lookups and `created_at` for time-range queries.
- Dashboard aggregation queries (total AUM, total distributions, avg ROI) should use materialized views or caching (Redis) if they become slow at scale. For the current data volume (<100 investors, <50 properties), direct queries are fine.

## Migration Strategy

1. Set up Prisma with the PostgreSQL schema. Use `prisma db push` for initial development, then switch to `prisma migrate` for production.
2. Seed the database with the existing hardcoded data from `App.jsx` — write a seed script that maps the current `INVESTORS` and `PROPERTIES` arrays into proper DB records.
3. Build the API layer incrementally: auth → properties → investments → distributions → reports → documents → dashboards.
4. Swap out frontend hardcoded data one page at a time, starting with the admin dashboard (highest value, most data).

## Computed Fields (Frontend Responsibility)

These values are derived and should be computed by the API or frontend, not stored:

- **Total invested per investor**: `SUM(investments.amount) WHERE investor_id = X`
- **Total distributed per investor**: `SUM(distributions.amount) WHERE investment.investor_id = X`
- **ROI %**: `total_distributed / total_invested * 100`
- **Months active / remaining**: derived from `investments.start_date` and `contract_years`
- **Time to recoup**: `(amount - total_distributed) / avg_monthly_distribution`
- **Allocation pie chart**: `investment.amount / total_invested * 100` per property
