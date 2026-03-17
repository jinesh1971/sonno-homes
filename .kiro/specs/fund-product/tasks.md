# Implementation Plan: Fund Product

## Overview

Incremental implementation of the Fund Product feature: starting with Prisma schema changes (new models + extended models), then Zod validation schemas, backend routes, email service extension, frontend components, and finally integration/testing. Each step builds on the previous one. The pattern follows the same approach used for the Offerings Tab feature.

## Tasks

- [x] 1. Add Prisma models and run migration
  - [x] 1.1 Add `FundStatus` enum and new models (`Fund`, `FundProperty`, `FundInvestment`, `FundReport`) to `server/prisma/schema.prisma`
    - Add `FundStatus` enum with values `draft`, `open`, `closed`
    - Add `Fund` model with all fields, indexes, and `@@map("funds")`
    - Add `FundProperty` join table with unique constraint `@@unique([fundId, propertyId])` and `@@map("fund_properties")`
    - Add `FundInvestment` model with unique constraint `@@unique([fundId, investorId])` and `@@map("fund_investments")`
    - Add `FundReport` model with unique constraint `@@unique([fundId, quarterYear, quarterNumber])` and `@@map("fund_reports")`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 4.1, 8.4_

  - [x] 1.2 Extend existing models (`Offering`, `Distribution`, `Organization`, `Property`, `User`) with fund relations
    - Make `Offering.propertyId` optional (nullable for fund offerings) and add optional `fundId` field with `Fund` relation and index
    - Add optional `fundInvestmentId` field to `Distribution` with `FundInvestment` relation and index
    - Add `funds Fund[]` relation to `Organization`
    - Add `fundProperties FundProperty[]` relation to `Property`
    - Add `fundInvestments FundInvestment[]` and `createdFundReports FundReport[] @relation("FundReportCreator")` to `User`
    - Run `npx prisma migrate dev` to generate and apply the migration
    - _Requirements: 2.5, 3.5, 5.1, 5.5, 8.1_

- [x] 2. Add Zod validation schemas
  - [x] 2.1 Add fund validation schemas to `server/src/lib/validation.ts`
    - Add `createFundSchema` (name, description, quarterYear, quarterNumber required; targetRaise, minimumInvestment, projectedReturn, imageUrls optional)
    - Add `updateFundSchema` (all fields optional, includes status enum)
    - Add `addFundPropertiesSchema` (propertyIds array of UUIDs, min 1)
    - Add `createFundInvestmentSchema` (investorId, amount, startDate required)
    - Add `createFundReportSchema` (quarterYear, quarterNumber required)
    - Add `createFundDistributionSchema` (quarterYear, quarterNumber required)
    - _Requirements: 1.2, 1.3, 1.7, 1.5, 3.2, 4.1, 5.1_

- [x] 3. Implement fund CRUD API routes
  - [x] 3.1 Create `server/src/routes/funds.ts` with fund CRUD endpoints
    - `POST /api/v1/funds` — admin creates fund, defaults status to `draft`
    - `GET /api/v1/funds` — admin lists all funds for the org
    - `GET /api/v1/funds/:id` — any authenticated user gets fund detail with constituent properties
    - `PATCH /api/v1/funds/:id` — admin updates fund details or status; enforce status transitions (block closed→open, closed→draft)
    - `DELETE /api/v1/funds/:id` — admin soft-deletes fund; block if active investments exist
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, 1.10, 8.3_

  - [x] 3.2 Add fund property management endpoints to `server/src/routes/funds.ts`
    - `POST /api/v1/funds/:id/properties` — admin assigns properties to fund; validate property not already in another active fund
    - `DELETE /api/v1/funds/:id/properties/:propertyId` — admin removes property from fund (sets `removedAt`)
    - _Requirements: 1.5, 1.6, 8.1, 8.4_

  - [x] 3.3 Register the funds router in `server/src/index.ts`
    - Import and mount the router at the appropriate path
    - _Requirements: 1.1_

- [x] 4. Implement fund investment endpoints
  - [x] 4.1 Add fund investment endpoints to `server/src/routes/funds.ts`
    - `POST /api/v1/funds/:id/investments` — admin creates fund investment; validate fund status is `open`
    - `GET /api/v1/funds/:id/investments` — admin lists fund investments with computed equity shares (investorAmount / totalFundAmount)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Implement fund report endpoints
  - [x] 5.1 Add fund report endpoints to `server/src/routes/funds.ts`
    - `POST /api/v1/funds/:id/reports` — admin creates fund report for a quarter; aggregate metrics at query time from constituent property reports; return warnings for properties missing published reports
    - `GET /api/v1/funds/:id/reports` — list fund reports
    - `GET /api/v1/funds/:id/reports/:reportId` — get fund report detail with aggregate metrics (totalGrossRevenue, totalExpenses, averageOccupancy, totalNightsBooked, totalNightsAvailable) and per-property breakdown; compute management fee using org fee rate
    - `POST /api/v1/funds/:id/reports/:reportId/publish` — publish fund report, set `publishedAt`, share with all active fund investors
    - Exclude removed properties (`removedAt` set) and soft-deleted properties from future aggregations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.2, 8.5_

- [x] 6. Implement fund distribution endpoints and email service extension
  - [x] 6.1 Add fund distribution endpoints to `server/src/routes/funds.ts`
    - `POST /api/v1/funds/:id/distributions` — admin creates quarterly distributions for all active fund investors; validate published fund report exists for the quarter; compute each investor's amount as netProfit * equityShare; set `distType` to `quarterly`
    - `GET /api/v1/funds/:id/distributions` — list fund distributions
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 Add `sendFundReportNotification` to `server/src/lib/emailService.ts`
    - Accept `FundReportNotificationPayload` (fundName, quarterLabel, investorEmails)
    - Follow same fire-and-forget pattern as `sendLOINotification`
    - Integrate into fund report publish endpoint, wrapped in try/catch
    - _Requirements: 4.5_

- [x] 7. Extend offerings and dashboard routes for fund support
  - [x] 7.1 Update offerings list endpoint to include fund offerings with `productType` computed field
    - Fund offerings have `fundId` set and `propertyId` null; property offerings have `propertyId` set and `fundId` null
    - Add query parameter support for filtering by product type (all, funds, properties)
    - _Requirements: 2.1, 7.2_

  - [x] 7.2 Update offerings LOI submission to validate fund minimum investment
    - When LOI is for a fund offering, validate `intendedAmount >= fund.minimumInvestment`
    - _Requirements: 2.6_

  - [x] 7.3 Extend dashboard route to return fund-level metrics
    - Admin: totalFundAUM, activeFundCount, fundInvestorCount
    - Investor: totalFundInvested, totalFundDistributions, fundROI
    - Return fund metrics separately from property metrics
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.4 Extend investor investments list to include fund investments with `productType` label
    - _Requirements: 3.5_

  - [x] 7.5 Extend investor distributions list to include fund distributions with product type and fund name labels
    - _Requirements: 5.5_

- [x] 8. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Backend property-based tests
  - [ ]* 9.1 Write property test: Fund creation produces a draft record
    - **Property 1: Fund creation produces a draft record**
    - Generate random valid fund data → verify creation returns `draft` status with UUID id
    - **Validates: Requirements 1.1, 1.4**

  - [ ]* 9.2 Write property test: Required fields are enforced on fund creation
    - **Property 2: Required fields are enforced on fund creation**
    - Generate random subsets of required fields with at least one missing → verify Zod rejection
    - **Validates: Requirements 1.2**

  - [ ]* 9.3 Write property test: Property uniqueness across active funds
    - **Property 5: Property uniqueness across active funds**
    - Generate two funds and a property → assign to first, attempt assign to second → verify rejection with conflicting fund name
    - **Validates: Requirements 1.6, 8.4**

  - [ ]* 9.4 Write property test: Fund update round-trip
    - **Property 6: Fund update round-trip**
    - Generate random fund and partial updates → verify round-trip consistency
    - **Validates: Requirements 1.7**

  - [ ]* 9.5 Write property test: Closed fund reopen rejected
    - **Property 8: Closed fund reopen rejected**
    - Generate random closed funds → verify status change to `open` or `draft` is rejected
    - **Validates: Requirements 1.10**

  - [ ]* 9.6 Write property test: Fund investment creation on open fund
    - **Property 13: Fund investment creation on open fund**
    - Generate random fund investment data for open vs non-open funds → verify acceptance/rejection
    - **Validates: Requirements 3.1, 3.3**

  - [ ]* 9.7 Write property test: Equity share computation
    - **Property 15: Equity share computation**
    - Generate random sets of fund investments → verify equity shares sum to 1.0 within floating-point tolerance
    - **Validates: Requirements 3.4**

  - [ ]* 9.8 Write property test: Fund report aggregation correctness
    - **Property 17: Fund report aggregation correctness**
    - Generate random property reports for fund constituents → verify totalGrossRevenue, totalExpenses, averageOccupancy, totalNightsBooked, totalNightsAvailable match expected sums/means
    - **Validates: Requirements 4.1, 4.2, 8.5**

  - [ ]* 9.9 Write property test: Fund management fee computation
    - **Property 18: Fund management fee computation**
    - Generate random revenue, expenses, fee rate → verify managementFee = (totalGrossRevenue - totalExpenses) * feeRate
    - **Validates: Requirements 4.3**

  - [ ]* 9.10 Write property test: Missing property reports produce warnings
    - **Property 19: Missing property reports produce warnings**
    - Generate funds with partial property report coverage → verify warnings array lists properties with missing reports
    - **Validates: Requirements 4.4**

  - [ ]* 9.11 Write property test: Fund report publish shares with investors
    - **Property 20: Fund report publish shares with investors**
    - Generate draft fund reports → verify publish sets status to `published`, `publishedAt` to non-null, and creates recipient records for all active fund investors
    - **Validates: Requirements 4.5**

  - [ ]* 9.12 Write property test: Fund distribution creates records for all active investors
    - **Property 22: Fund distribution creates records for all active investors**
    - Generate funds with N investors and published report → verify exactly N distribution records with `distType` = `quarterly`
    - **Validates: Requirements 5.1, 5.3**

  - [ ]* 9.13 Write property test: Fund distribution amount computation
    - **Property 23: Fund distribution amount computation**
    - Generate random net profit and investor amounts → verify each distribution = netProfit * (investorAmount / totalFundAmount)
    - **Validates: Requirements 5.2**

  - [ ]* 9.14 Write property test: Fund distribution requires published report
    - **Property 24: Fund distribution requires published report**
    - Generate funds without published reports for the quarter → verify distribution creation rejected
    - **Validates: Requirements 5.4**

  - [ ]* 9.15 Write property test: Fund dashboard metrics correctness
    - **Property 26: Fund dashboard metrics correctness**
    - Generate random fund data → verify totalFundAUM, activeFundCount, fundInvestorCount match expected values
    - **Validates: Requirements 6.1**

  - [ ]* 9.16 Write property test: Removed properties excluded from future aggregations
    - **Property 31: Removed properties excluded from future aggregations**
    - Generate funds, remove a property → verify future aggregation excludes it while past published reports unchanged
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 9.17 Write property test: Fund with active investments cannot be deleted
    - **Property 32: Fund with active investments cannot be deleted**
    - Generate funds with active investments → verify deletion rejected with error
    - **Validates: Requirements 8.3**

- [ ] 10. Add API client functions and data context
  - [x] 10.1 Add fund API functions to `src/api.js`
    - Add all fund API functions: `fetchFunds`, `fetchFund`, `createFund`, `updateFund`, `addFundProperties`, `removeFundProperty`, `fetchFundInvestments`, `createFundInvestment`, `fetchFundReports`, `fetchFundReport`, `createFundReport`, `publishFundReport`, `createFundDistributions`, `fetchFundDistributions`
    - Follow existing `request()` helper pattern
    - _Requirements: 2.1, 2.3, 3.5, 4.7, 7.2_

  - [x] 10.2 Add funds state and fetch logic to `src/DataContext.jsx`
    - Add `funds` state, `fetchFunds` effect, and expose via context
    - _Requirements: 2.1, 7.2_

- [ ] 11. Implement frontend components
  - [x] 11.1 Implement `FundCard` component in `src/App.jsx`
    - Display fund name, number of constituent properties, minimum investment, target raise, projected return, primary image, and "Fund" badge
    - Show "Closed" badge when status is `closed` and hide "Invest Now" button
    - Use inline styles following existing codebase patterns
    - _Requirements: 2.2, 2.7, 7.1_

  - [x] 11.2 Implement `FundFilterToggle` component in `src/App.jsx`
    - Toggle/dropdown in `OfferingsListView` to filter by product type: All, Funds Only, Properties Only
    - _Requirements: 7.2_

  - [x] 11.3 Update `OfferingsListView` to render fund offerings alongside property offerings
    - Integrate `FundCard` for fund offerings and `FundFilterToggle` for filtering
    - _Requirements: 2.1, 7.2_

  - [x] 11.4 Implement `FundDetailView` component in `src/App.jsx`
    - Full description, constituent properties list (name, location, property type), investment terms, "Invest Now" button (hidden if closed)
    - Admin sees management controls: edit fund details, manage constituent properties, view fund reports, view fund investments
    - Reuse existing `LOIFormModal` for fund offering LOI submission
    - _Requirements: 2.3, 2.4, 2.7, 7.3, 7.4_

  - [x] 11.5 Implement `FundReportView` component in `src/App.jsx`
    - Display aggregate fund metrics: total revenue, total expenses, average occupancy, nights booked, nights available
    - Display per-property breakdown table with individual revenue, expenses, and occupancy
    - Display management fee and net returns
    - _Requirements: 4.6, 4.7_

  - [x] 11.6 Implement `FundDashboardSection` component in `src/App.jsx`
    - Admin view: total fund AUM, active fund count, fund investor count
    - Investor view: total fund invested, total fund distributions received, fund ROI
    - Clearly distinguish fund metrics from property metrics with visual labels
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 11.7 Wire fund components into navigation and views in `src/App.jsx`
    - Clicking a fund card navigates to `FundDetailView`
    - Add `FundDashboardSection` to admin and investor dashboards
    - Display fund investments and fund distributions in investor portfolio views with product type labels
    - _Requirements: 3.5, 5.5, 6.4, 7.1_

- [x] 12. Checkpoint — Frontend complete
  - All tests pass (79/79), frontend builds clean.

- [ ] 13. Frontend property-based tests
  - [ ]* 13.1 Write property test: Fund card displays required information
    - **Property 9: Fund card displays required information**
    - Generate random fund data → verify card renders fund name, property count, min investment, target raise, projected return, primary image
    - **Validates: Requirements 2.2**

  - [ ]* 13.2 Write property test: Closed fund card shows badge and hides Invest Now
    - **Property 10: Closed fund card shows badge and hides Invest Now**
    - Generate random closed funds → verify "Closed" badge shown and "Invest Now" button absent
    - **Validates: Requirements 2.7**

  - [ ]* 13.3 Write property test: Fund product type label on all fund components
    - **Property 28: Fund product type label on all fund components**
    - Generate random fund data → verify "Fund" label present on card, detail view, and list items
    - **Validates: Requirements 7.1**

  - [ ]* 13.4 Write property test: Offering filter by product type
    - **Property 29: Offering filter by product type**
    - Generate mixed fund and property offerings → verify filter returns correct subset
    - **Validates: Requirements 7.2**

  - [ ]* 13.5 Write property test: Fund detail view shows constituent properties
    - **Property 30: Fund detail view shows constituent properties**
    - Generate funds with properties → verify detail view lists each property with name, location, and property type
    - **Validates: Requirements 7.3**

- [ ] 14. Add seed data for fund testing
  - [x] 14.1 Add fund seed data to the existing seed script
    - Create sample fund with constituent properties, fund investments, fund reports, and fund distributions
    - Create a fund offering linked to the sample fund
    - _Requirements: 1.1, 1.5, 2.1, 3.1, 4.1, 5.1_

- [x] 15. Final checkpoint — All tests pass
  - 79/79 backend tests pass, frontend builds clean, seed runs successfully with fund data.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` as the PBT library
- Backend tests go in `server/src/__tests__/funds.property.test.ts`
- Frontend tests go in `src/__tests__/funds.property.test.jsx`
- Checkpoints ensure incremental validation between backend and frontend phases
- Fund offerings reuse the existing `Offering` model and LOI flow — no parallel offering system needed
- Fund report aggregates are computed at query time, not stored as pre-computed columns
