# Requirements Document

## Introduction

The Fund Product feature introduces a new investment product type to the Sonno Homes platform. Currently, investors invest in individual property packages. The Fund groups multiple properties into a single investment vehicle with quarterly reporting cycles. Fund reporting aggregates metrics across all constituent properties (average occupancy, total expenses, total revenue) rather than showing per-property breakdowns. The Fund appears as an additional product alongside existing individual property offerings, giving investors a diversified option and giving Sonno Homes a new quarterly investment vehicle.

## Glossary

- **Fund**: A pooled investment product that groups multiple properties together into a single investment vehicle, with quarterly reporting cycles and aggregate performance metrics.
- **Fund_Product**: The data entity representing a fund, including its name, description, constituent properties, quarterly period, and status.
- **Fund_Offering**: An offering record associated with a fund (rather than a single property), allowing investors to express interest and submit LOIs for fund participation.
- **Fund_Report**: A quarterly performance report that aggregates metrics across all properties in a fund, including average occupancy, total revenue, total expenses, and net returns.
- **Fund_Investment**: An investment record linking an investor to a fund, tracking the invested amount and equity share at the fund level.
- **Constituent_Property**: A property that is included in a fund. A property may belong to zero or one fund at a time.
- **Fund_API**: The backend REST API endpoints that handle CRUD operations for funds, fund reporting, and fund investments.
- **Fund_UI**: The frontend React components that render fund product cards, fund detail views, fund reporting, and fund-specific dashboard data.
- **Admin**: A user with the `admin` role who creates and manages funds.
- **Investor**: A user with the `investor` role who browses fund offerings and invests in funds.
- **Quarterly_Period**: A three-month reporting window (Q1: Jan–Mar, Q2: Apr–Jun, Q3: Jul–Sep, Q4: Oct–Dec) used for fund performance reporting.

## Requirements

### Requirement 1: Create and Manage Fund Products

**User Story:** As an admin, I want to create a fund that groups multiple properties together, so that I can offer investors a diversified investment product.

#### Acceptance Criteria

1. WHEN an admin submits a valid fund creation request, THE Fund_API SHALL create a new Fund_Product record and return the created fund with a unique identifier.
2. THE Fund_API SHALL require the following fields for fund creation: fund name, description, and quarterly period (year and quarter number).
3. THE Fund_API SHALL accept optional fields for fund creation: target raise amount, minimum investment amount, projected return percentage, and image URLs.
4. WHEN a fund is created, THE Fund_API SHALL set the initial fund status to `draft`.
5. WHEN an admin assigns properties to a fund, THE Fund_API SHALL link each Constituent_Property to the Fund_Product.
6. WHEN an admin attempts to assign a property that already belongs to another active fund, THE Fund_API SHALL reject the request with a validation error identifying the conflicting fund.
7. WHEN an admin updates fund details, THE Fund_API SHALL persist the changes and return the updated fund.
8. WHEN an admin changes a fund status from `draft` to `open`, THE Fund_API SHALL make the fund visible to investors as an available product.
9. WHEN an admin changes a fund status from `open` to `closed`, THE Fund_API SHALL prevent new investments and LOI submissions against the fund.
10. WHEN an admin attempts to reopen a `closed` fund, THE Fund_API SHALL reject the request with a validation error.

### Requirement 2: Fund Offering and LOI Submission

**User Story:** As an investor, I want to browse fund offerings alongside individual property offerings, so that I can choose between diversified and single-property investments.

#### Acceptance Criteria

1. WHEN an investor requests the offerings list, THE Fund_UI SHALL display fund offerings alongside individual property offerings, each clearly labeled with its product type.
2. THE Fund_UI SHALL display each fund offering card showing the fund name, number of constituent properties, minimum investment, target raise, projected return, and a primary image.
3. WHEN an investor selects a fund offering card, THE Fund_UI SHALL display a detail view with the full description, list of constituent properties with summary details, investment terms, and an "Invest Now" button.
4. WHEN an investor clicks "Invest Now" on an open fund offering, THE Fund_UI SHALL display the same LOI form used for individual offerings (full name, email, phone, intended amount, signature acknowledgment).
5. WHEN an investor submits an LOI for a fund offering, THE Fund_API SHALL create an LOI record linked to the fund offering and the investor.
6. WHEN an investor submits an intended amount below the fund's minimum investment, THE Fund_API SHALL reject the submission with a validation error specifying the minimum amount.
7. WHILE a fund has status `closed`, THE Fund_UI SHALL display a "Closed" badge on the fund card and hide the "Invest Now" button.

### Requirement 3: Fund Investment Tracking

**User Story:** As an admin, I want to record investments in a fund, so that I can track investor participation and equity shares at the fund level.

#### Acceptance Criteria

1. WHEN an admin creates a fund investment, THE Fund_API SHALL create a Fund_Investment record linking the investor to the fund with the invested amount and equity share.
2. THE Fund_API SHALL require the following fields for fund investment creation: investor reference, fund reference, investment amount, and start date.
3. WHEN an admin creates a fund investment for a fund with status other than `open`, THE Fund_API SHALL reject the request with a validation error.
4. THE Fund_API SHALL compute each fund investor's equity share as the investor's fund investment amount divided by the total fund investment amount.
5. WHEN an investor requests their investments list, THE Fund_API SHALL return fund investments alongside individual property investments, each labeled with the product type.

### Requirement 4: Quarterly Fund Performance Reporting

**User Story:** As an admin, I want to generate quarterly performance reports for a fund that aggregate metrics across all constituent properties, so that fund investors see portfolio-level performance.

#### Acceptance Criteria

1. WHEN an admin creates a fund report for a Quarterly_Period, THE Fund_API SHALL aggregate performance data from all published property-level reports for the constituent properties within that quarter.
2. THE Fund_Report SHALL include the following aggregate metrics: total gross revenue (sum across all constituent properties), total expenses (sum across all constituent properties), average occupancy rate (mean of occupancy rates across constituent properties), total nights booked, and total nights available.
3. THE Fund_Report SHALL compute the fund-level management fee using the organization's management fee rate applied to the fund's gross profit.
4. WHEN an admin creates a fund report and one or more constituent properties lack a published report for the specified quarter, THE Fund_API SHALL return a warning listing the properties with missing reports and proceed with available data.
5. WHEN an admin publishes a fund report, THE Fund_API SHALL change the report status to `published`, record the publication timestamp, and share the report with all fund investors.
6. THE Fund_Report SHALL include a per-property breakdown section showing each constituent property's individual revenue, expenses, and occupancy for the quarter.
7. WHEN an investor views a published fund report, THE Fund_UI SHALL display both the aggregate fund metrics and the per-property breakdown.

### Requirement 5: Fund Distributions

**User Story:** As an admin, I want to create distributions for fund investors based on quarterly fund performance, so that fund investors receive returns proportional to their equity share.

#### Acceptance Criteria

1. WHEN an admin creates a fund distribution for a Quarterly_Period, THE Fund_API SHALL create distribution records for each active fund investor.
2. THE Fund_API SHALL calculate each fund investor's distribution amount as the fund's net profit for the quarter multiplied by the investor's equity share.
3. THE Fund_API SHALL set the distribution type to `quarterly` for fund distributions.
4. WHEN an admin creates a fund distribution for a quarter without a published fund report, THE Fund_API SHALL reject the request with a validation error.
5. WHEN an investor views their distributions, THE Fund_API SHALL return fund distributions alongside property distributions, each labeled with the source product type and fund name.

### Requirement 6: Fund Dashboard Metrics

**User Story:** As an admin, I want to see fund-level KPIs on the dashboard, so that I can monitor fund performance alongside individual property metrics.

#### Acceptance Criteria

1. THE Fund_UI SHALL display fund-level metrics on the admin dashboard: total fund AUM (sum of all fund investments), number of active funds, and number of fund investors.
2. WHEN an admin views the dashboard, THE Fund_API SHALL return aggregate fund metrics separately from individual property metrics.
3. WHEN an investor with fund investments views their dashboard, THE Fund_UI SHALL display fund investment summary alongside individual property investments, showing total fund invested amount, total fund distributions received, and fund-level ROI.
4. THE Fund_UI SHALL clearly distinguish between fund metrics and individual property metrics using visual labels or separate sections.

### Requirement 7: Fund Product Display and Navigation

**User Story:** As a user, I want to see funds as a distinct product type in the platform, so that I can clearly differentiate between fund investments and individual property investments.

#### Acceptance Criteria

1. THE Fund_UI SHALL display a "Fund" product type label on all fund-related cards, detail views, and list items to distinguish funds from individual property offerings.
2. WHEN a user navigates to the Offerings tab, THE Fund_UI SHALL display fund offerings in the same list as individual property offerings, with a filter option to show only funds or only individual properties.
3. THE Fund_UI SHALL display the fund detail view with a list of constituent properties, showing each property's name, location, and property type.
4. WHEN an admin navigates to a fund detail view, THE Fund_UI SHALL display fund management controls: edit fund details, manage constituent properties, view fund reports, and view fund investments.

### Requirement 8: Fund Data Integrity

**User Story:** As an admin, I want the platform to maintain data consistency for fund operations, so that fund reporting and distributions are accurate.

#### Acceptance Criteria

1. WHEN a property is removed from a fund, THE Fund_API SHALL exclude the property from future fund reports while retaining the property's data in previously published fund reports.
2. WHEN a property included in a fund is soft-deleted, THE Fund_API SHALL flag the property as inactive within the fund and exclude the property from future fund report aggregations.
3. IF a fund has active investments, THEN THE Fund_API SHALL prevent deletion of the fund and return an error indicating active investments exist.
4. THE Fund_API SHALL enforce that each property belongs to at most one active fund at any given time.
5. WHEN an admin requests fund report data, THE Fund_API SHALL compute aggregate metrics at query time from the underlying property reports rather than storing pre-computed aggregates, ensuring data consistency.
