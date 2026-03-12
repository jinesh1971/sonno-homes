# Sonno Homes — API Endpoint Outline

Base URL: `/api/v1`

All protected routes require `Authorization: Bearer <jwt>`. Admin-only routes are marked with 🔒.

---

## Authentication

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/register` | Register new user (admin-initiated for investors) 🔒 |
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token using refresh token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| GET | `/auth/me` | Get current user profile |

---

## Users & Profiles

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/users` | List all users (admin) 🔒 |
| GET | `/users/:id` | Get user details 🔒 |
| PATCH | `/users/:id` | Update user 🔒 |
| DELETE | `/users/:id` | Soft-delete user 🔒 |
| GET | `/users/:id/profile` | Get investor profile |
| PATCH | `/users/:id/profile` | Update investor profile |

---

## Properties

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/properties` | List all properties (admin: all, investor: their linked ones) |
| GET | `/properties/:id` | Get property details |
| POST | `/properties` | Create property 🔒 |
| PATCH | `/properties/:id` | Update property 🔒 |
| DELETE | `/properties/:id` | Soft-delete property 🔒 |
| GET | `/properties/:id/investors` | List investors in a property 🔒 |
| GET | `/properties/:id/reports` | List performance reports for a property |
| GET | `/properties/:id/documents` | List documents for a property |
| GET | `/properties/:id/distributions` | List all distributions for a property 🔒 |

---

## Investments

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/investments` | List investments (admin: all, investor: own) |
| GET | `/investments/:id` | Get investment details |
| POST | `/investments` | Create investment (link investor to property) 🔒 |
| PATCH | `/investments/:id` | Update investment (amount, status, equity) 🔒 |
| DELETE | `/investments/:id` | Soft-delete investment 🔒 |

---

## Distributions

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/distributions` | List distributions (admin: all, investor: own) |
| GET | `/distributions/:id` | Get distribution details |
| POST | `/distributions` | Create distribution record 🔒 |
| POST | `/distributions/batch` | Batch-create distributions for a period 🔒 |
| PATCH | `/distributions/:id` | Update distribution (mark paid, etc.) 🔒 |
| GET | `/distributions/summary` | Aggregated distribution stats (for dashboards) |

---

## Performance Reports (New Feature)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/reports` | List all reports (admin: all, investor: for their properties) |
| GET | `/reports/:id` | Get full report with expense line items |
| POST | `/reports` | Create report — admin selects property, period, inputs revenue + expenses 🔒 |
| PATCH | `/reports/:id` | Update draft report 🔒 |
| POST | `/reports/:id/publish` | Publish report — generates document, notifies investors 🔒 |
| DELETE | `/reports/:id` | Soft-delete report (draft only) 🔒 |
| GET | `/reports/:id/expenses` | List expense line items for a report |
| POST | `/reports/:id/expenses` | Add expense line item 🔒 |
| PATCH | `/reports/:id/expenses/:expenseId` | Update expense line item 🔒 |
| DELETE | `/reports/:id/expenses/:expenseId` | Remove expense line item 🔒 |

---

## Documents

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/documents` | List documents (admin: all, investor: their accessible docs) |
| GET | `/documents/:id` | Get document metadata |
| GET | `/documents/:id/download` | Get pre-signed S3 download URL |
| POST | `/documents` | Upload document (returns pre-signed upload URL) 🔒 |
| PATCH | `/documents/:id` | Update document metadata 🔒 |
| DELETE | `/documents/:id` | Soft-delete document 🔒 |
| POST | `/documents/:id/share` | Share document with specific investors 🔒 |
| POST | `/documents/:id/track-view` | Record that investor viewed/downloaded |

---

## Dashboard Aggregations

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/dashboard/admin` | Admin KPIs: total properties, investors, AUM, avg occupancy, total distributions 🔒 |
| GET | `/dashboard/admin/commitment-summary` | Future commitment breakdown 🔒 |
| GET | `/dashboard/admin/contract-expiry` | Upcoming contract expirations 🔒 |
| GET | `/dashboard/investor` | Investor KPIs: total invested, total received, ROI, active investments |
| GET | `/dashboard/investor/allocation` | Pie chart data — investment allocation across properties |
| GET | `/dashboard/investor/roi` | Per-property and overall ROI tracker |
| GET | `/dashboard/investor/recoup-estimate` | Estimated time to recoup investment |

---

## CSV / Export

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/export/investors` | Export all investors as CSV 🔒 |
| GET | `/export/distributions` | Export distribution history as CSV 🔒 |
| GET | `/export/properties` | Export property summary as CSV 🔒 |
| GET | `/export/reports/:id` | Export a performance report as PDF/CSV 🔒 |
| GET | `/export/investor/:id/distributions` | Export single investor's distributions |

---

## Audit Log

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/audit-log` | Query audit log with filters (entity, user, date range) 🔒 |

---

## Organization Settings

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/organization` | Get org details 🔒 |
| PATCH | `/organization` | Update org settings (name, fee %, contact info) 🔒 |
| GET | `/organization/team` | List team members 🔒 |
| POST | `/organization/team` | Invite team member 🔒 |
| DELETE | `/organization/team/:userId` | Remove team member 🔒 |
