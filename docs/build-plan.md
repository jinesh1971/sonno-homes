# Sonno Homes — Backend Build Plan

## Tech Stack
- Database: Railway (PostgreSQL, ~$5/mo)
- Auth: Clerk (free tier, <100 users)
- Backend: Node.js + Express + TypeScript + Prisma + Zod
- Frontend: existing React 19 / Vite SPA
- File Storage: S3-compatible (for documents)

## Build Steps

### 1. Project Setup & Prisma Schema ✅ DONE
- Create `server/` directory with Express + TypeScript project
- Install dependencies (express, prisma, @clerk/express, zod, cors, etc.)
- Define full Prisma schema (all tables, adapted for Clerk — clerk_id instead of password_hash, no refresh_tokens table)
- Configure environment variables (.env template)
- Tests: Prisma schema validation, connection test

### 2. Clerk Auth Integration & Middleware ✅ DONE
- Set up Clerk middleware for Express (verify JWT, extract user)
- Build role-based authorization middleware (admin vs investor)
- Build org-scoping middleware (multi-tenancy isolation)
- Webhook endpoint to sync Clerk user creation with users table
- Tests: Auth middleware unit tests (valid token, invalid token, role checks, org isolation)

### 3. Core CRUD — Properties, Investments, Users ✅ DONE
- Properties routes: GET (list/detail), POST, PATCH, DELETE
- Investments routes: GET (list/detail), POST, PATCH, DELETE
- Users/Profiles routes: GET (list/detail), PATCH, DELETE, profile endpoints
- Zod validation schemas for all inputs
- Tests: Route-level integration tests for each endpoint (happy path + error cases + role enforcement)

### 4. Distributions ✅ DONE
- Distributions routes: GET (list/detail/summary), POST, POST batch, PATCH
- Tests: CRUD tests, batch creation, summary aggregation, investor-scoped access

### 5. Performance Reports & Expenses ✅ DONE
- Reports routes: GET (list/detail), POST, PATCH, DELETE
- Expenses routes: GET, POST, PATCH, DELETE (with auto-recalculation of total_expenses)
- Publish endpoint: status change, auto-create document record, auto-create document_recipients
- Tests: Full report lifecycle (create draft → add expenses → publish → verify investor access), expense recalculation, publish validation rules

### 6. Documents & S3 Integration ✅ DONE
- Documents routes: GET (list/detail), POST (pre-signed upload URL), PATCH, DELETE
- Download endpoint (pre-signed download URL)
- Share endpoint, track-view endpoint
- S3 client setup (can use local MinIO for dev)
- Tests: Document CRUD, sharing, access control, pre-signed URL generation

### 7. Dashboard Aggregation Endpoints ✅ DONE
- Admin dashboard: portfolio KPIs, commitment summary, contract expiry
- Investor dashboard: personal KPIs, allocation pie chart data, per-property ROI, recoup estimate
- Tests: Aggregation accuracy with known seed data

### 8. CSV/PDF Export ✅ DONE
- Export routes: investors CSV, distributions CSV, properties CSV, report PDF/CSV, investor-specific distributions
- Tests: Export format validation, correct data scoping

### 9. Audit Logging ✅ DONE
- Audit log middleware/service that hooks into key actions
- GET /audit-log with filters
- Tests: Verify log entries created for key actions, filter queries

### 10. Database Seeding & Error Handling ✅ DONE
- Seed script mapping existing frontend dummy data into the DB
- Global error handling middleware (consistent response format)
- Tests: Seed idempotency, error response format validation

### 11. Frontend API Integration
- Install Clerk React SDK, add ClerkProvider, build login page
- Create API client with auth headers
- Replace hardcoded data with API calls (one page at a time)
- Tests: Component-level tests for API integration, loading/error states

### 12. End-to-End Testing & Deployment Prep
- E2E test suite covering main flows
- Railway deployment config
- Environment variable setup for production
- CI pipeline basics (run tests on push)
