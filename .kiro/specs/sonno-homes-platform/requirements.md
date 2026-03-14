# Requirements Document

## Introduction

Sonno Homes is a full-stack investor portal for an Italian short-term rental property management company. The platform replaces the third-party Agora (agorareal.com) investor management system with a custom-built solution. It serves two user roles — admins (Sonno Homes management team) and investors — providing portfolio management, performance reporting, distribution tracking, document management, and dashboard analytics. The frontend is a Vite + React 19 SPA currently running with hardcoded data that must be connected to a real backend (Node.js + Express + Prisma + PostgreSQL) with JWT authentication, role-based access control, S3 document storage, and multi-tenancy support.

## Glossary

- **Platform**: The Sonno Homes investor portal web application (frontend SPA + backend API)
- **API**: The Node.js + Express REST backend serving JSON responses at `/api/v1`
- **Admin**: A user with the `admin` role who manages properties, investors, reports, and distributions
- **Investor**: A user with the `investor` role who views their own investments, distributions, reports, and documents
- **Organization**: The top-level tenant entity (e.g., Sonno Homes Ltd) that scopes all data for multi-tenancy
- **Property**: A short-term rental property managed by the Organization (e.g., Villa Serena, Palazzo Azzurro)
- **Investment**: A financial relationship linking an Investor to a Property, carrying amount, equity share, and contract dates
- **Distribution**: A periodic payment from a Property's returns to an Investor, linked through an Investment
- **Performance_Report**: A monthly financial report created by an Admin for a Property, containing revenue, expenses, and profit calculations
- **Report_Expense**: A line item on a Performance_Report representing a cost category (rent, cleaning, utilities, etc.)
- **Document**: A file (contract, statement, report PDF, etc.) stored in S3 and shared with specific Investors
- **Management_Fee**: The Organization's percentage cut of gross profit (default 20%), applied to Performance_Reports
- **Audit_Log**: An immutable record of significant actions performed by users on the Platform
- **Access_Token**: A short-lived JWT (15 minutes) used to authenticate API requests
- **Refresh_Token**: A long-lived token stored in the database, used to obtain new Access_Tokens
- **Prisma**: The TypeScript ORM used for database access, migrations, and schema management
- **Zod**: The runtime schema validation library used for all API input validation
- **S3**: AWS S3-compatible object storage used for document file storage
- **Pre-signed_URL**: A time-limited URL granting temporary access to upload or download a file from S3

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user (Admin or Investor), I want to securely log in to the Platform with email and password, so that I can access my role-appropriate dashboard and data.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE API SHALL return an Access_Token (JWT, 15-minute expiry) and a Refresh_Token (stored as a hash in the database).
2. WHEN a user submits invalid credentials, THE API SHALL return a 401 status code with an error message that does not reveal whether the email or password was incorrect.
3. WHEN a valid Refresh_Token is submitted to the refresh endpoint, THE API SHALL return a new Access_Token and a new Refresh_Token, and revoke the old Refresh_Token.
4. WHEN a user calls the logout endpoint, THE API SHALL revoke the associated Refresh_Token by setting its `revoked_at` timestamp.
5. IF an expired or revoked Refresh_Token is submitted, THEN THE API SHALL return a 401 status code and require re-authentication.
6. WHEN a user calls the `/auth/me` endpoint with a valid Access_Token, THE API SHALL return the current user's profile including id, email, role, first_name, last_name, and org_id.
7. THE API SHALL hash all passwords using bcrypt (via pgcrypto) before storing them in the database.
8. WHEN a user requests a password reset, THE API SHALL generate a time-limited reset token and send it to the user's registered email address.
9. WHEN a valid password reset token is submitted with a new password, THE API SHALL update the user's password_hash and invalidate the reset token.

### Requirement 2: Role-Based Access Control

**User Story:** As the Platform, I want to enforce role-based permissions on all API endpoints, so that Admins can manage all data while Investors can only access their own.

#### Acceptance Criteria

1. THE API SHALL enforce authentication on all endpoints except `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, and `/auth/reset-password`.
2. WHEN an Investor calls an Admin-only endpoint (marked 🔒), THE API SHALL return a 403 status code.
3. WHEN an Investor requests properties via GET `/properties`, THE API SHALL return only properties linked to that Investor through active Investments.
4. WHEN an Investor requests distributions via GET `/distributions`, THE API SHALL return only distributions belonging to that Investor's Investments.
5. WHEN an Investor requests reports via GET `/reports`, THE API SHALL return only published Performance_Reports for properties linked to that Investor.
6. WHEN an Investor requests documents via GET `/documents`, THE API SHALL return only documents where the Investor is listed in document_recipients.
7. THE API SHALL scope all data queries by org_id extracted from the authenticated user's JWT to enforce multi-tenancy isolation.

### Requirement 3: Organization Management

**User Story:** As an Admin, I want to view and update my Organization's settings (company name, contact info, management fee percentage), so that the Platform reflects current business details.

#### Acceptance Criteria

1. WHEN an Admin calls GET `/organization`, THE API SHALL return the Organization's name, registration_no, email, phone, address, country, logo_url, and management_fee.
2. WHEN an Admin submits a PATCH to `/organization` with updated fields, THE API SHALL update only the provided fields and return the updated Organization.
3. THE API SHALL validate that management_fee is a numeric value between 0 and 1 (representing 0% to 100%).
4. WHEN an Admin calls GET `/organization/team`, THE API SHALL return all active users within the Organization.
5. WHEN an Admin calls POST `/organization/team` with a valid email and role, THE API SHALL create a new user account within the Organization.
6. WHEN an Admin calls DELETE `/organization/team/:userId`, THE API SHALL soft-delete the specified user by setting deleted_at.

### Requirement 4: User and Investor Profile Management

**User Story:** As an Admin, I want to manage investor accounts and profiles, so that I can onboard new investors and maintain accurate records.

#### Acceptance Criteria

1. WHEN an Admin calls POST `/auth/register` with valid user data (email, password, role, first_name, last_name, org_id), THE API SHALL create a new user and return the user record without the password_hash.
2. WHEN an Admin calls GET `/users`, THE API SHALL return a paginated list of all non-deleted users in the Organization.
3. WHEN an Admin calls GET `/users/:id`, THE API SHALL return the user's details including their investor_profile if the role is `investor`.
4. WHEN an Admin calls PATCH `/users/:id` with updated fields, THE API SHALL update only the provided fields on the user record.
5. WHEN an Admin calls DELETE `/users/:id`, THE API SHALL soft-delete the user by setting deleted_at, and the user SHALL no longer appear in default queries.
6. WHEN a user calls GET `/users/:id/profile`, THE API SHALL return the investor_profile (occupation, city, country, notes, future_commitment, accredited) for the specified user.
7. WHEN a user calls PATCH `/users/:id/profile` with updated fields, THE API SHALL update only the provided fields on the investor_profile record.
8. THE API SHALL enforce that an Investor can only view and update their own profile (matching the authenticated user's id).
9. THE API SHALL validate that email addresses are unique within an Organization (enforced by the uq_users_email_org constraint).

### Requirement 5: Property Management

**User Story:** As an Admin, I want to create, update, and manage rental properties, so that I can track the portfolio and link investors to properties.

#### Acceptance Criteria

1. WHEN an Admin calls POST `/properties` with valid property data (name, property_type, location, bedrooms, contract_years, status, org_id), THE API SHALL create a new property and return the property record.
2. WHEN an Admin calls GET `/properties`, THE API SHALL return all non-deleted properties in the Organization with their current status.
3. WHEN any authenticated user calls GET `/properties/:id`, THE API SHALL return the full property details including name, property_type, location, region, bedrooms, bathrooms, square_meters, property_value, acquisition_date, contract_years, monthly_yield, occupancy_rate, noi, irr, status, and image_url.
4. WHEN an Admin calls PATCH `/properties/:id` with updated fields, THE API SHALL update only the provided fields on the property record.
5. WHEN an Admin calls DELETE `/properties/:id`, THE API SHALL soft-delete the property by setting deleted_at.
6. WHEN an Admin calls GET `/properties/:id/investors`, THE API SHALL return all investors linked to the property through active Investments.
7. WHEN a user calls GET `/properties/:id/reports`, THE API SHALL return all Performance_Reports for the property (Admin: all statuses; Investor: published only).
8. WHEN a user calls GET `/properties/:id/documents`, THE API SHALL return all documents associated with the property (Admin: all; Investor: only those shared with the Investor).
9. WHEN an Admin calls GET `/properties/:id/distributions`, THE API SHALL return all distributions for all Investments linked to the property.
10. THE API SHALL validate that property status is one of: `active`, `lease_renewal`, `inactive`, `sold`.

### Requirement 6: Investment Management

**User Story:** As an Admin, I want to create and manage investment records linking investors to properties, so that I can track equity ownership and financial relationships.

#### Acceptance Criteria

1. WHEN an Admin calls POST `/investments` with valid data (investor_id, property_id, amount, equity_share, start_date), THE API SHALL create a new Investment record and return it.
2. WHEN a user calls GET `/investments`, THE API SHALL return investments scoped by role (Admin: all in Organization; Investor: only their own).
3. WHEN a user calls GET `/investments/:id`, THE API SHALL return the full investment details including amount, equity_share, start_date, end_date, and status.
4. WHEN an Admin calls PATCH `/investments/:id` with updated fields (amount, equity_share, status, end_date), THE API SHALL update only the provided fields.
5. WHEN an Admin calls DELETE `/investments/:id`, THE API SHALL soft-delete the investment by setting deleted_at.
6. THE API SHALL enforce the unique constraint on (investor_id, property_id) — one investment per investor per property.
7. THE API SHALL validate that investment status is one of: `active`, `matured`, `exited`, `pending`.
8. THE API SHALL compute end_date as start_date plus the property's contract_years when end_date is not explicitly provided.

### Requirement 7: Distribution Management

**User Story:** As an Admin, I want to record and manage distribution payments to investors, so that I can track all payouts and their statuses.

#### Acceptance Criteria

1. WHEN an Admin calls POST `/distributions` with valid data (investment_id, period_start, period_end, amount, dist_type), THE API SHALL create a new distribution record with status `pending`.
2. WHEN an Admin calls POST `/distributions/batch` with a period and list of investment IDs, THE API SHALL create distribution records for all specified investments in a single transaction.
3. WHEN a user calls GET `/distributions`, THE API SHALL return distributions scoped by role (Admin: all in Organization; Investor: only distributions for their Investments).
4. WHEN a user calls GET `/distributions/:id`, THE API SHALL return the full distribution details including investment_id, period_start, period_end, amount, dist_type, status, and paid_at.
5. WHEN an Admin calls PATCH `/distributions/:id` with status `paid`, THE API SHALL update the status to `paid` and set paid_at to the current timestamp.
6. WHEN a user calls GET `/distributions/summary`, THE API SHALL return aggregated distribution statistics (total distributed, count by status, total by period) scoped by role.
7. THE API SHALL validate that dist_type is one of: `monthly`, `quarterly`, `annual`, `special`.
8. THE API SHALL validate that distribution status is one of: `pending`, `paid`, `failed`, `cancelled`.
9. THE API SHALL validate that period_end is after period_start.

### Requirement 8: Performance Report Creation Workflow

**User Story:** As an Admin, I want to create monthly performance reports for properties with revenue, dynamic expense line items, and automatic profit calculations, so that I can track property financial performance and share results with investors.

#### Acceptance Criteria

1. WHEN an Admin calls POST `/reports` with property_id, period_start, period_end, nights_booked, nights_available, and gross_revenue, THE API SHALL create a new Performance_Report with status `draft`.
2. WHEN an Admin calls POST `/reports/:id/expenses` with category, description, amount, and sort_order, THE API SHALL add a Report_Expense line item to the specified draft report.
3. WHEN a Report_Expense is added, updated, or deleted, THE API SHALL recalculate the parent Performance_Report's total_expenses field as the sum of all its Report_Expense amounts.
4. THE Database SHALL compute gross_profit as a generated column: gross_revenue minus total_expenses.
5. THE Database SHALL compute net_profit as a generated column: gross_revenue minus total_expenses minus management_fee.
6. WHEN an Admin calls PATCH `/reports/:id` on a draft report, THE API SHALL update the provided fields (nights_booked, nights_available, gross_revenue, management_fee, notes).
7. THE API SHALL calculate management_fee as the Organization's management_fee percentage multiplied by gross_profit, unless the Admin provides an explicit override.
8. WHEN an Admin calls PATCH `/reports/:id/expenses/:expenseId`, THE API SHALL update the specified expense line item and recalculate total_expenses on the parent report.
9. WHEN an Admin calls DELETE `/reports/:id/expenses/:expenseId`, THE API SHALL remove the expense line item (hard delete via CASCADE) and recalculate total_expenses.
10. THE API SHALL enforce the unique constraint on (property_id, period_start, period_end) — one report per property per period.
11. WHEN an Admin calls DELETE `/reports/:id` on a draft report, THE API SHALL soft-delete the report. IF the report status is `published`, THEN THE API SHALL return a 400 error preventing deletion.
12. WHEN an Admin calls GET `/reports/:id/expenses`, THE API SHALL return all expense line items for the report ordered by sort_order.

### Requirement 9: Performance Report Publishing

**User Story:** As an Admin, I want to publish a completed performance report so that it becomes visible to all investors linked to the property, with an auto-generated document record.

#### Acceptance Criteria

1. WHEN an Admin calls POST `/reports/:id/publish` on a draft report, THE API SHALL update the report status to `published` and set published_at to the current timestamp.
2. WHEN a report is published, THE API SHALL create a Document record with doc_type `performance_report`, linking it to the report via report_id and to the property via property_id.
3. WHEN a report is published, THE API SHALL create document_recipients rows for every Investor who has an active Investment in the report's property.
4. IF a report has zero expense line items, THEN THE API SHALL return a 400 error preventing publication.
5. IF a report's gross_revenue is zero, THEN THE API SHALL return a 400 error preventing publication.
6. WHEN an Investor calls GET `/reports`, THE API SHALL return only published Performance_Reports for properties linked to the Investor's active Investments.
7. WHEN any user calls GET `/reports/:id` for a published report, THE API SHALL return the full report including all expense line items, computed gross_profit, management_fee, and net_profit.

### Requirement 10: Document Management

**User Story:** As an Admin, I want to upload, manage, and share documents with investors using secure S3 storage, so that investors can access contracts, statements, and reports.

#### Acceptance Criteria

1. WHEN an Admin calls POST `/documents` with title, doc_type, property_id (optional), and file metadata, THE API SHALL create a Document record and return a Pre-signed_URL for uploading the file to S3.
2. WHEN a user calls GET `/documents/:id/download`, THE API SHALL return a Pre-signed_URL for downloading the file from S3 (valid for a limited time).
3. WHEN an Admin calls POST `/documents/:id/share` with a list of investor_ids, THE API SHALL create document_recipients rows for each specified Investor.
4. WHEN an Investor calls GET `/documents`, THE API SHALL return only documents where the Investor has a document_recipients row.
5. WHEN an Investor calls POST `/documents/:id/track-view`, THE API SHALL update the document_recipients row with viewed_at or downloaded_at timestamps.
6. WHEN an Admin calls PATCH `/documents/:id` with updated metadata (title, doc_type, description), THE API SHALL update only the provided fields.
7. WHEN an Admin calls DELETE `/documents/:id`, THE API SHALL soft-delete the document by setting deleted_at.
8. THE API SHALL validate that doc_type is one of: `contract`, `tax_k1`, `operating_agreement`, `statement`, `performance_report`, `schedule`, `policy`, `other`.
9. THE API SHALL store file_size_bytes and mime_type metadata when a document upload is confirmed.

### Requirement 11: Admin Dashboard Aggregations

**User Story:** As an Admin, I want to see portfolio-wide KPIs on my dashboard (total properties, active investors, AUM, average occupancy, total distributions, future commitments), so that I can monitor business health at a glance.

#### Acceptance Criteria

1. WHEN an Admin calls GET `/dashboard/admin`, THE API SHALL return: total property count, active investor count, total assets under management (sum of all investment amounts), average occupancy rate across active properties, and total distributions paid.
2. WHEN an Admin calls GET `/dashboard/admin/commitment-summary`, THE API SHALL return the count of investors with future_commitment set to true versus total investors.
3. WHEN an Admin calls GET `/dashboard/admin/contract-expiry`, THE API SHALL return a list of investments with their months_active, months_remaining (computed from start_date and contract_years), and investor details, sorted by nearest expiry.
4. THE API SHALL compute all dashboard values from live database queries scoped to the Admin's Organization.
5. THE API SHALL return the properties grouped by status (active, lease_renewal, inactive, sold) with counts for each.

### Requirement 12: Investor Dashboard Aggregations

**User Story:** As an Investor, I want to see my personal investment KPIs (total invested, total received, ROI, allocation breakdown, time to recoup), so that I can track my portfolio performance.

#### Acceptance Criteria

1. WHEN an Investor calls GET `/dashboard/investor`, THE API SHALL return: total invested (sum of investment amounts), total received (sum of distribution amounts), overall ROI percentage (total_received / total_invested * 100), and count of active investments.
2. WHEN an Investor calls GET `/dashboard/investor/allocation`, THE API SHALL return per-property investment amounts and percentages for rendering a pie chart.
3. WHEN an Investor calls GET `/dashboard/investor/roi`, THE API SHALL return per-property ROI data including invested amount, total distributed, and ROI percentage for each property.
4. WHEN an Investor calls GET `/dashboard/investor/recoup-estimate`, THE API SHALL return the estimated months to recoup the investment, computed as (total_invested - total_received) / average_monthly_distribution.
5. IF the Investor's total_received exceeds total_invested, THEN THE API SHALL return a recoup status of "recouped" with the month number at which breakeven was reached.
6. THE API SHALL compute all investor dashboard values from live database queries scoped to the authenticated Investor's investments.

### Requirement 13: CSV and PDF Export

**User Story:** As an Admin, I want to export investor lists, distribution histories, property summaries, and performance reports as CSV or PDF files, so that I can share data offline and generate printable reports.

#### Acceptance Criteria

1. WHEN an Admin calls GET `/export/investors`, THE API SHALL return a CSV file containing all investors with columns: name, email, phone, occupation, city, invested, total_distributed, ROI%, future_commitment, months_active, months_remaining, notes.
2. WHEN an Admin calls GET `/export/distributions`, THE API SHALL return a CSV file containing all distributions with columns: investor_name, property_name, period, amount, status, paid_at.
3. WHEN an Admin calls GET `/export/properties`, THE API SHALL return a CSV file containing all properties with columns: name, location, type, bedrooms, monthly_yield, occupancy_rate, status, investor_count.
4. WHEN an Admin calls GET `/export/reports/:id`, THE API SHALL return the specified Performance_Report as a downloadable PDF or CSV including revenue, all expense line items, gross_profit, management_fee, and net_profit.
5. WHEN an Investor calls GET `/export/investor/:id/distributions`, THE API SHALL return a CSV file containing only that Investor's distributions (the Investor can only export their own).
6. THE API SHALL set appropriate Content-Type and Content-Disposition headers for file downloads.

### Requirement 14: Audit Logging

**User Story:** As an Admin, I want all significant actions to be recorded in an immutable audit log, so that I can review who did what and when for compliance and troubleshooting.

#### Acceptance Criteria

1. THE API SHALL create an audit_log entry for each of the following actions: user login, user creation, investment creation/update, distribution creation/payment, report creation/publish/update, document upload/share, organization settings update, and user deletion.
2. THE audit_log entry SHALL include: org_id, user_id (who performed the action), action (e.g., `report.published`), entity_type, entity_id, metadata (JSONB with old/new values or context), ip_address, and created_at.
3. WHEN an Admin calls GET `/audit-log` with optional filters (entity_type, user_id, date_start, date_end, action), THE API SHALL return matching audit_log entries sorted by created_at descending.
4. THE API SHALL treat audit_log records as immutable — no update or delete operations are permitted on audit_log entries.
5. THE API SHALL paginate audit_log results with a default page size of 50 entries.

### Requirement 15: Database Schema and Migrations

**User Story:** As a developer, I want the PostgreSQL database schema managed through Prisma migrations, so that the schema is version-controlled and reproducible across environments.

#### Acceptance Criteria

1. THE Prisma schema SHALL define models for all 12 tables: organizations, users, investor_profiles, properties, investments, distributions, performance_reports, report_expenses, documents, document_recipients, audit_log, and refresh_tokens.
2. THE Prisma schema SHALL define enums for: user_role (admin, investor), property_status (active, lease_renewal, inactive, sold), investment_status (active, matured, exited, pending), distribution_type (monthly, quarterly, annual, special), distribution_status (pending, paid, failed, cancelled), report_status (draft, published, archived), and document_type (contract, tax_k1, operating_agreement, statement, performance_report, schedule, policy, other).
3. THE Prisma schema SHALL configure soft-delete filtering via middleware that adds `WHERE deleted_at IS NULL` to all default queries on soft-deletable models.
4. THE Database SHALL use UUID primary keys generated by the `uuid-ossp` extension for all tables.
5. THE Database SHALL include all indexes defined in the schema: foreign key indexes, composite indexes on distributions(period_start, period_end), audit_log(entity_type, entity_id), and audit_log(created_at).
6. THE Database SHALL enforce the unique constraints: uq_users_email_org(org_id, email), uq_investment(investor_id, property_id), uq_report_property_period(property_id, period_start, period_end), and uq_doc_recipient(document_id, investor_id).

### Requirement 16: API Input Validation

**User Story:** As a developer, I want all API inputs validated using Zod schemas, so that invalid data is rejected before reaching the database.

#### Acceptance Criteria

1. THE API SHALL validate all request bodies, query parameters, and URL parameters using Zod schemas before processing.
2. WHEN validation fails, THE API SHALL return a 400 status code with a structured error response containing the field name and validation message for each failing field.
3. THE API SHALL validate email fields as valid email format.
4. THE API SHALL validate date fields as valid ISO 8601 date strings.
5. THE API SHALL validate numeric fields (amounts, percentages, counts) as non-negative numbers with appropriate precision.
6. THE API SHALL validate UUID fields as valid UUID v4 format.
7. THE API SHALL validate enum fields against their allowed values and return a descriptive error listing valid options when an invalid value is provided.

### Requirement 17: Multi-Tenancy Isolation

**User Story:** As the Platform, I want all data queries scoped by organization, so that tenants cannot access each other's data.

#### Acceptance Criteria

1. THE API SHALL extract org_id from the authenticated user's JWT on every request.
2. THE API SHALL include `org_id = <authenticated_org_id>` in all database queries for organizations, users, properties, documents, and audit_log.
3. IF a user attempts to access an entity belonging to a different Organization, THEN THE API SHALL return a 404 status code (not 403, to avoid leaking existence information).
4. THE API SHALL validate that referenced entities (e.g., property_id in a report, investor_id in an investment) belong to the same Organization as the authenticated user.

### Requirement 18: Database Seeding

**User Story:** As a developer, I want a seed script that populates the database with the existing hardcoded data from the frontend, so that the application works immediately after setup.

#### Acceptance Criteria

1. THE Seed_Script SHALL create the default Organization (Sonno Homes Ltd, registration IT-2021-SH-4892, management_fee 0.20).
2. THE Seed_Script SHALL create an Admin user (admin@sonnohomes.com) and all 12 demo Investor users with their investor_profiles (occupation, city, country, future_commitment).
3. THE Seed_Script SHALL create all 10 properties (Villa Serena, Casa del Sole, Palazzo Azzurro, Trullo Bianco, Residenza Colosseo, Dimora sul Mare, Cascina Verde, Loft Navigli, Masseria Antica, Attico Duomo) with their attributes.
4. THE Seed_Script SHALL create Investment records linking each Investor to their properties with the correct amounts and equity shares.
5. THE Seed_Script SHALL create Distribution records matching the generated distribution history from the frontend (monthly distributions based on investment amounts).
6. THE Seed_Script SHALL create the 6 initial Performance_Reports with their Report_Expense line items matching the INITIAL_REPORTS data.
7. THE Seed_Script SHALL be idempotent — running it multiple times SHALL not create duplicate records.

### Requirement 19: Frontend API Integration

**User Story:** As a developer, I want to replace all hardcoded data in the React frontend with API calls, so that the application displays real data from the database.

#### Acceptance Criteria

1. THE Platform SHALL store the Access_Token in memory (not localStorage) and the Refresh_Token in an httpOnly cookie for security.
2. THE Platform SHALL implement an HTTP client (e.g., Axios interceptor) that automatically attaches the Access_Token to all API requests and refreshes it when a 401 response is received.
3. THE Platform SHALL replace the hardcoded INVESTORS array with data fetched from GET `/users` and GET `/users/:id/profile`.
4. THE Platform SHALL replace the hardcoded PROPERTIES array with data fetched from GET `/properties`.
5. THE Platform SHALL replace the generated distributions with data fetched from GET `/distributions`.
6. THE Platform SHALL replace the hardcoded INITIAL_REPORTS with data fetched from GET `/reports` and GET `/reports/:id`.
7. THE Platform SHALL implement a login page that authenticates via POST `/auth/login` and redirects to the appropriate dashboard based on user role.
8. THE Platform SHALL show loading states while API requests are in progress and error states when requests fail.
9. WHEN the Admin creates a report via the Create Report form, THE Platform SHALL call POST `/reports`, POST `/reports/:id/expenses` for each line item, and POST `/reports/:id/publish` in sequence.
10. WHEN the Admin clicks Export CSV, THE Platform SHALL call the appropriate `/export/*` endpoint and trigger a file download.

### Requirement 20: Admin Investor Management UI

**User Story:** As an Admin, I want to view a sortable list of all investors with key metrics, drill into individual investor profiles, and export data as CSV, so that I can manage the investor base efficiently.

#### Acceptance Criteria

1. THE Platform SHALL display an investor list table with columns: name, occupation, location, invested amount, total distributed, ROI %, contract time remaining, and future commitment status.
2. THE Platform SHALL support sorting by any column in the investor table (ascending and descending).
3. WHEN an Admin clicks an investor row, THE Platform SHALL navigate to a detail view showing: contact info (email, phone, occupation, city), investment summary (total invested, total distributed, ROI, months active/remaining, property count), last 12 months distribution bar chart, and linked properties.
4. WHEN an Admin clicks "Export CSV" on the investor list, THE Platform SHALL download a CSV file containing all investor data.
5. WHEN an Admin clicks "+ Add Investor", THE Platform SHALL display a form to create a new investor user via POST `/auth/register`.

### Requirement 21: Admin Property Management UI

**User Story:** As an Admin, I want to view all properties as cards with key details and investor counts, so that I can monitor the property portfolio.

#### Acceptance Criteria

1. THE Platform SHALL display properties as a grid of cards, each showing: property name, location, type, bedrooms, monthly yield, contract length, status badge, investor count, and acquisition date.
2. THE Platform SHALL display a status badge on each property card colored green for "Active" and orange for "Lease Renewal".
3. WHEN an Admin clicks "+ Add Property", THE Platform SHALL display a form to create a new property via POST `/properties`.

### Requirement 22: Admin Distribution Tracking UI

**User Story:** As an Admin, I want to view distribution KPIs and a recent distributions table, so that I can track all payouts across investors.

#### Acceptance Criteria

1. THE Platform SHALL display three KPI cards: total distributed (all time), latest month total, and average monthly per investor.
2. THE Platform SHALL display a sortable table of recent distributions with columns: investor name, period, amount, and status badge (green for Paid, orange for Pending).
3. WHEN an Admin clicks "Export CSV" on the distributions table, THE Platform SHALL download a CSV file of the displayed distributions.

### Requirement 23: Admin Create Report UI

**User Story:** As an Admin, I want a form to create performance reports by selecting a property, entering revenue and expenses, seeing live profit calculations, and publishing the report, so that I can generate and share monthly financial reports.

#### Acceptance Criteria

1. THE Platform SHALL display a property selector dropdown populated from GET `/properties`.
2. THE Platform SHALL display a month picker for selecting the report period.
3. THE Platform SHALL display input fields for nights booked, nights available, and gross revenue.
4. THE Platform SHALL display a dynamic expense section where the Admin can add, remove, and edit expense line items (each with category name and amount).
5. THE Platform SHALL display a live calculation sidebar showing: gross revenue, total expenses, gross profit (revenue minus expenses), Sonno Homes management fee (20% of gross profit), and net profit to investors.
6. WHEN a property is selected, THE Platform SHALL display a "Will Be Shared With" panel listing all investors linked to that property.
7. WHEN the Admin clicks "Generate Report", THE Platform SHALL create the report via the API and display a success confirmation with key metrics (nights, occupancy, revenue, fee, net to investors).
8. THE Platform SHALL display a "Generated Reports" table below the form showing all existing reports with columns: property, period, occupancy, revenue, net to investors, status, and created date.
9. WHEN the Admin clicks a row in the Generated Reports table, THE Platform SHALL navigate to a report detail view showing full financial breakdown, expense list, and the list of investors the report was shared with.

### Requirement 24: Admin Reports and Export UI

**User Story:** As an Admin, I want a reports page with pre-built export options, so that I can quickly generate common CSV reports.

#### Acceptance Criteria

1. THE Platform SHALL display report cards for: Full Investor Report, Distribution History, Property Summary, Future Commitments Report, ROI Breakdown, and Contract Expiry Report.
2. WHEN an Admin clicks a report card, THE Platform SHALL trigger a CSV download via the appropriate `/export/*` endpoint.
3. THE Platform SHALL display a description on each report card explaining what data it contains.

### Requirement 25: Admin Settings UI

**User Story:** As an Admin, I want a settings page to view and edit company details, investment terms, and team access, so that I can manage organizational configuration.

#### Acceptance Criteria

1. THE Platform SHALL display editable fields for company details: name, registration number, email, phone, address, and country, populated from GET `/organization`.
2. WHEN an Admin clicks "Save Changes", THE Platform SHALL submit the updated fields via PATCH `/organization`.
3. THE Platform SHALL display investment terms as read-only information: standard contract length, target breakeven period, lease extension policy, and termination terms.
4. THE Platform SHALL display a team access section listing all team members with their name, email, and role badge, populated from GET `/organization/team`.

### Requirement 26: Investor Overview Dashboard UI

**User Story:** As an Investor, I want a personalized dashboard showing my investment KPIs, distribution history chart, investment allocation pie chart, per-property ROI tracker, and property cards, so that I can monitor my portfolio at a glance.

#### Acceptance Criteria

1. THE Platform SHALL display a welcome message with the Investor's first name.
2. THE Platform SHALL display four KPI cards: total investment amount, total received (with ROI percentage), best month (highest single distribution), and time to recoup estimate.
3. THE Platform SHALL display a bar chart of the last 12 months of distributions, populated from GET `/distributions`.
4. THE Platform SHALL display a progress ring showing overall ROI percentage with breakeven status messaging.
5. THE Platform SHALL display an SVG pie chart showing investment allocation across properties, with a legend listing each property's name, amount, and percentage, populated from GET `/dashboard/investor/allocation`.
6. THE Platform SHALL display a per-property ROI tracker with progress bars and ROI percentages, populated from GET `/dashboard/investor/roi`.
7. THE Platform SHALL display clickable property cards that navigate to the property detail view.

### Requirement 27: Investor Distributions UI

**User Story:** As an Investor, I want to view my complete distribution history with cumulative tracking and percentage returned, so that I can see how my investment is performing over time.

#### Acceptance Criteria

1. THE Platform SHALL display three KPI cards: total distributions received, investment returned percentage, and average monthly distribution.
2. THE Platform SHALL display a sortable table with columns: row number, period, amount, cumulative total, percentage returned (with progress bar), and status badge.
3. THE Platform SHALL compute cumulative totals and percentage returned client-side from the distribution data.
4. WHEN an Investor clicks "Export CSV", THE Platform SHALL download a CSV of their distribution history via GET `/export/investor/:id/distributions`.

### Requirement 28: Investor Property Detail UI

**User Story:** As an Investor, I want to click into a property to see my investment KPIs, published performance reports with expandable expense breakdowns, and a distribution history chart, so that I can understand each property's financial performance.

#### Acceptance Criteria

1. THE Platform SHALL display property header information: name, location, type, bedrooms, and status badge.
2. THE Platform SHALL display four KPI cards for the property: my investment amount, total distributed for this property, occupancy rate, and monthly yield.
3. THE Platform SHALL display published Performance_Reports for the property, each showing: period, creation date, status badge, nights booked/available, occupancy, revenue, expenses, and net to investors.
4. WHEN an Investor clicks "View Expense Breakdown" on a report, THE Platform SHALL expand to show all expense line items with category and amount, plus totals for gross profit, management fee, and net profit.
5. WHEN an Investor clicks "Download" on a report, THE Platform SHALL trigger a file download via GET `/documents/:id/download`.

### Requirement 29: Investor Documents UI

**User Story:** As an Investor, I want to view and download all documents shared with me, including auto-generated performance report documents, so that I can access my contracts, statements, and reports.

#### Acceptance Criteria

1. THE Platform SHALL display a list of all documents accessible to the Investor, populated from GET `/documents`.
2. THE Platform SHALL auto-include published Performance_Report documents for properties the Investor is linked to.
3. THE Platform SHALL display each document with: title, document type badge, date, and file size.
4. WHEN an Investor clicks "Download" on a document, THE Platform SHALL fetch a Pre-signed_URL via GET `/documents/:id/download` and trigger a file download.
5. WHEN an Investor views or downloads a document, THE Platform SHALL call POST `/documents/:id/track-view` to record the interaction.

### Requirement 30: Investor Profile UI

**User Story:** As an Investor, I want to view my profile information and investment terms, so that I can review my account details and contract conditions.

#### Acceptance Criteria

1. THE Platform SHALL display the Investor's profile fields (name, email, phone, occupation, city, member since) as read-only inputs, populated from GET `/auth/me` and GET `/users/:id/profile`.
2. THE Platform SHALL display investment terms: contract duration, monthly distribution policy, target breakeven, lease extension policy, termination terms, and current status (months active / months remaining).

### Requirement 31: Application Layout and Navigation

**User Story:** As a user, I want a responsive sidebar navigation with role-based menu items, a collapsible sidebar, a top bar with notifications, and smooth page transitions, so that I can navigate the Platform efficiently.

#### Acceptance Criteria

1. THE Platform SHALL display a sidebar with navigation items based on the user's role: Admin sees Dashboard, Investors, Properties, Distributions, Create Report, Reports & Export, Settings; Investor sees My Overview, My Distributions, My Properties, Documents, My Profile.
2. THE Platform SHALL highlight the active navigation item with an accent indicator.
3. WHEN a user clicks the collapse button, THE Platform SHALL toggle the sidebar between full width (256px) and collapsed width (68px), showing only icons in collapsed mode.
4. THE Platform SHALL display a top bar with the current page title, a notification bell with unread indicator, and the current user's avatar and name.
5. THE Platform SHALL apply a fade-in transition when navigating between pages.
6. THE Platform SHALL render the login page (without sidebar) when no valid Access_Token is present, and redirect to the appropriate dashboard after successful login.

### Requirement 32: Error Handling and API Response Format

**User Story:** As a developer, I want consistent error handling and response formats across all API endpoints, so that the frontend can reliably parse responses and display appropriate messages.

#### Acceptance Criteria

1. THE API SHALL return all successful responses in the format: `{ "success": true, "data": <payload> }`.
2. THE API SHALL return all error responses in the format: `{ "success": false, "error": { "code": "<ERROR_CODE>", "message": "<human-readable message>", "details": <optional field-level errors> } }`.
3. IF an unhandled exception occurs, THEN THE API SHALL return a 500 status code with a generic error message and log the full error details server-side.
4. THE API SHALL use appropriate HTTP status codes: 200 for success, 201 for creation, 400 for validation errors, 401 for authentication failures, 403 for authorization failures, 404 for not found, and 500 for server errors.
5. THE API SHALL implement a global error handling middleware that catches all errors and formats them consistently.
