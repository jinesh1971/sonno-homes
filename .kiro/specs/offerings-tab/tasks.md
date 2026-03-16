# Implementation Plan: Offerings Tab

## Overview

Incremental implementation of the Offerings Tab feature: starting with database models, then backend API routes with validation, email service, and finally frontend components wired into the existing SPA. Each step builds on the previous one, with property-based and unit tests validating correctness along the way.

## Tasks

- [x] 1. Add Prisma models and run migration
  - [x] 1.1 Add `OfferingStatus` and `LOIStatus` enums, `Offering` and `LetterOfIntent` models to `server/prisma/schema.prisma`
    - Add relation fields to existing `Organization`, `Property`, and `User` models
    - Include all indexes defined in the design
    - Run `npx prisma migrate dev` to generate and apply the migration
    - _Requirements: 1.1, 1.5, 4.5_

- [ ] 2. Add Zod validation schemas
  - [x] 2.1 Add `createOfferingSchema`, `updateOfferingSchema`, `createLOISchema`, and `updateLOISchema` to `server/src/lib/validation.ts`
    - Follow the exact schema definitions from the design document
    - Add a `.refine()` on `createOfferingSchema` to enforce `minimumInvestment <= targetRaise`
    - _Requirements: 1.2, 1.3, 1.4, 4.1, 4.6_

- [ ] 3. Implement offerings API routes
  - [x] 3.1 Create `server/src/routes/offerings.ts` with offering CRUD endpoints
    - `POST /api/v1/offerings` — admin creates offering, defaults status to `draft`
    - `GET /api/v1/offerings` — investors see only `open`, admins see all
    - `GET /api/v1/offerings/:id` — get offering detail with property info
    - `PATCH /api/v1/offerings/:id` — update offering fields/status with transition validation (block `funded` → `open`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

  - [x] 3.2 Add LOI endpoints to `server/src/routes/offerings.ts`
    - `POST /api/v1/offerings/:id/lois` — investor submits LOI; validate offering is `open`, intendedAmount ≥ minimumInvestment
    - `GET /api/v1/offerings/:id/lois` — admin lists LOIs ordered by `submittedAt` desc
    - `PATCH /api/v1/offerings/:id/lois/:loiId` — admin updates LOI status; set `reviewedAt` when status becomes `reviewed`
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3_

  - [x] 3.3 Register the offerings router in `server/src/index.ts`
    - Import and mount the router at the appropriate path
    - _Requirements: 1.1, 3.1_

- [ ] 4. Implement email notification service
  - [x] 4.1 Create `server/src/lib/emailService.ts` with `sendLOINotification` function
    - Accept `LOINotificationPayload` (investorName, offeringTitle, intendedAmount, submittedAt, adminEmails)
    - In dev mode (`DEV_BYPASS_AUTH=true` or no SMTP config), log to console instead of sending
    - Use `nodemailer` for production transport
    - _Requirements: 5.1, 5.2_

  - [x] 4.2 Integrate email service into LOI creation endpoint
    - Call `sendLOINotification` after LOI is created, wrapped in try/catch
    - Log failures with `console.error`, do not propagate error to investor
    - Fetch admin emails from the organization's users
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 5. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Backend property-based tests
  - [ ]* 6.1 Write property test: Offering creation produces a draft record
    - **Property 1: Offering creation produces a draft record**
    - Generate random valid offering data → verify creation returns `draft` status and a UUID id
    - **Validates: Requirements 1.1, 1.5**

  - [ ]* 6.2 Write property test: Required fields are enforced on offering creation
    - **Property 2: Required fields are enforced on offering creation**
    - Generate random subsets of required fields with at least one missing → verify Zod rejection
    - **Validates: Requirements 1.2**

  - [ ]* 6.3 Write property test: Minimum investment cannot exceed target raise
    - **Property 3: Minimum investment cannot exceed target raise**
    - Generate random (min, target) pairs where min > target → verify rejection
    - **Validates: Requirements 1.3**

  - [ ]* 6.4 Write property test: Role-based offering visibility
    - **Property 5: Role-based offering visibility**
    - Generate random offerings with mixed statuses → verify investor sees only `open`, admin sees all
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 6.5 Write property test: Non-open offerings reject LOI submissions
    - **Property 7: Non-open offerings reject LOI submissions**
    - Generate random LOI data for `draft` or `funded` offerings → verify rejection
    - **Validates: Requirements 2.2, 4.4**

  - [ ]* 6.6 Write property test: Funded offerings cannot be reopened
    - **Property 8: Funded offerings cannot be reopened**
    - Generate random funded offerings → verify `funded` → `open` transition rejected
    - **Validates: Requirements 2.3**

  - [ ]* 6.7 Write property test: Offering update round-trip
    - **Property 9: Offering update round-trip**
    - Generate random offerings and partial updates → verify round-trip consistency
    - **Validates: Requirements 2.4**

  - [ ]* 6.8 Write property test: Valid LOI creation
    - **Property 10: Valid LOI creation**
    - Generate random valid LOI data for open offerings → verify creation with `submitted` status and `submittedAt`
    - **Validates: Requirements 4.2, 4.5**

  - [ ]* 6.9 Write property test: LOI amount below minimum is rejected
    - **Property 11: LOI amount below minimum is rejected**
    - Generate random (offeringMin, loiAmount) pairs where loiAmount < offeringMin → verify rejection
    - **Validates: Requirements 4.3**

  - [ ]* 6.10 Write property test: LOI notification email content and recipients
    - **Property 13: LOI notification email content and recipients**
    - Generate random LOI data → verify email service called with correct payload and admin emails
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 6.11 Write property test: Email failure does not block LOI creation
    - **Property 14: Email failure does not block LOI creation**
    - Generate random LOI data with email service mocked to throw → verify LOI still created
    - **Validates: Requirements 5.3**

  - [ ]* 6.12 Write property test: LOI listing is ordered by submission date descending
    - **Property 15: LOI listing is ordered by submission date descending**
    - Generate random sets of LOIs → verify descending order by `submittedAt`
    - **Validates: Requirements 6.1**

  - [ ]* 6.13 Write property test: Marking LOI as reviewed sets review timestamp
    - **Property 17: Marking LOI as reviewed sets review timestamp**
    - Generate random submitted LOIs → verify `reviewed` status sets `reviewedAt` to non-null
    - **Validates: Requirements 6.3**

- [ ] 7. Add API client functions and data context
  - [x] 7.1 Add offering and LOI API functions to `src/api.js`
    - `fetchOfferings`, `fetchOffering`, `createOffering`, `updateOffering`, `fetchOfferingLOIs`, `submitLOI`, `updateLOIStatus`
    - Follow existing `request()` helper pattern
    - _Requirements: 3.1, 3.2, 4.2, 6.1_

  - [x] 7.2 Add offerings state and fetch logic to `src/DataContext.jsx`
    - Add `offerings` state, `fetchOfferings` effect, and expose via context
    - _Requirements: 3.1, 3.2_

- [ ] 8. Implement frontend components
  - [x] 8.1 Add sidebar navigation entry for Offerings in `src/App.jsx`
    - Add `{ id: "offerings", label: "Offerings", icon: "📋" }` to both `adminNav` and `investorNav` arrays
    - Wire `activeView === "offerings"` to render `OfferingsListView`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 8.2 Implement `OfferingCard` component in `src/App.jsx`
    - Display property name, location, minimum investment, target raise, projected return, primary image
    - Show "Fully Funded" badge when status is `funded`
    - Use inline styles following existing codebase patterns
    - _Requirements: 3.3, 3.5_

  - [x] 8.3 Implement `OfferingsListView` component in `src/App.jsx`
    - Render grid of `OfferingCard` components
    - Admin sees a "Create Offering" button
    - Handle loading and error states
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 8.4 Implement `OfferingDetailView` component in `src/App.jsx`
    - Full description, image gallery, investment terms
    - Investor sees "Invest Now" button (hidden if `funded`)
    - Admin sees LOI summary (total count, total intended amount) and `AdminLOITable`
    - _Requirements: 3.4, 3.5, 6.4_

  - [x] 8.5 Implement `LOIFormModal` component in `src/App.jsx`
    - Form fields: full name, email, phone, intended investment amount, signature acknowledgment checkbox
    - Client-side validation: prevent submission if signature not checked, validate required fields
    - Submit via `submitLOI` API function, show success/error feedback
    - _Requirements: 4.1, 4.6_

  - [x] 8.6 Implement `AdminLOITable` component in `src/App.jsx`
    - Table showing investor name, email, phone, amount, date, status for each LOI
    - Summary row at top with total LOI count and total intended investment amount
    - Allow admin to mark LOI as `reviewed`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Checkpoint — Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Frontend property-based tests
  - [ ]* 10.1 Write property test: Offering card displays required information
    - **Property 18: Offering card displays required information**
    - Generate random offering data → verify card renders property name, location, min investment, target raise, projected return, primary image
    - **Validates: Requirements 3.3**

  - [ ]* 10.2 Write property test: Funded offering card shows badge and hides Invest Now
    - **Property 19: Funded offering card shows badge and hides Invest Now**
    - Generate random funded offerings → verify "Fully Funded" badge shown and "Invest Now" button absent
    - **Validates: Requirements 3.5**

  - [ ]* 10.3 Write property test: Admin LOI summary aggregation
    - **Property 20: Admin LOI summary aggregation**
    - Generate random LOI sets → verify total count and sum of intended amounts match
    - **Validates: Requirements 6.4**

- [x] 11. Final checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` as the PBT library
- Backend tests go in `server/src/__tests__/offerings.property.test.ts`
- Frontend tests go in `src/__tests__/offerings.property.test.jsx`
- Checkpoints ensure incremental validation between backend and frontend phases
