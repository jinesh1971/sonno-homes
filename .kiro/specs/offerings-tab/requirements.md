# Requirements Document

## Introduction

The Offerings Tab feature adds a new section to the Sonno Homes investment management platform where administrators can publish investment packages (offerings) for properties seeking investor capital. Investors browse available offerings, express interest by submitting a Letter of Intent (LOI) via an "Invest Now" flow, and administrators receive email notifications upon LOI submission. Administrators can track LOI submissions and manually mark offerings as fully funded.

## Glossary

- **Offering**: An investment package published by an administrator, representing a property available for investor capital. Contains details such as target raise amount, minimum investment, description, and images.
- **LOI (Letter of Intent)**: A formal submission by an investor expressing intent to invest in a specific offering, including the investor's name, email, phone, intended investment amount, and electronic signature acknowledgment.
- **Offering_Status**: The lifecycle state of an offering: `open` (accepting investments), `funded` (fully funded and closed by admin), or `draft` (not yet visible to investors).
- **LOI_Status**: The state of a Letter of Intent submission: `submitted` (newly created), `reviewed` (admin has seen it), or `withdrawn` (investor or admin cancelled it).
- **Admin**: A user with the `admin` role who creates and manages offerings and reviews LOI submissions.
- **Investor**: A user with the `investor` role who browses offerings and submits LOIs.
- **Offerings_API**: The backend REST API endpoints that handle CRUD operations for offerings and LOI submissions.
- **Offerings_UI**: The frontend React components that render the offerings tab, offering cards, offering detail views, and the LOI submission form.
- **Email_Service**: The server-side service responsible for sending email notifications to administrators.

## Requirements

### Requirement 1: Create Offering

**User Story:** As an admin, I want to create a new investment offering for a property, so that investors can see it and express interest.

#### Acceptance Criteria

1. WHEN an admin submits a valid offering creation form, THE Offerings_API SHALL create a new offering record and return the created offering with a unique identifier.
2. THE Offerings_API SHALL require the following fields for offering creation: property reference, title, description, minimum investment amount, and target raise amount.
3. WHEN an admin provides a minimum investment amount greater than the target raise amount, THE Offerings_API SHALL reject the request with a validation error.
4. THE Offerings_API SHALL accept optional fields for offering creation: image URLs (up to 5), projected annual return percentage, and investment term in months.
5. WHEN an offering is created, THE Offerings_API SHALL set the initial offering status to `draft`.

### Requirement 2: Manage Offering Status

**User Story:** As an admin, I want to update an offering's status, so that I can control its visibility and mark it as funded when complete.

#### Acceptance Criteria

1. WHEN an admin changes an offering status from `draft` to `open`, THE Offerings_API SHALL make the offering visible to investors.
2. WHEN an admin changes an offering status from `open` to `funded`, THE Offerings_API SHALL mark the offering as fully funded and prevent new LOI submissions against the offering.
3. WHEN an admin attempts to change an offering status from `funded` to `open`, THE Offerings_API SHALL reject the request with an error indicating funded offerings cannot be reopened.
4. WHEN an admin updates offering details, THE Offerings_API SHALL persist the changes and return the updated offering.

### Requirement 3: List and View Offerings

**User Story:** As an investor, I want to browse available offerings, so that I can find investment opportunities that match my goals.

#### Acceptance Criteria

1. WHEN an investor requests the offerings list, THE Offerings_API SHALL return only offerings with status `open`.
2. WHEN an admin requests the offerings list, THE Offerings_API SHALL return all offerings regardless of status.
3. THE Offerings_UI SHALL display each offering as a card showing the property name, location, minimum investment, target raise, projected return, and a primary image.
4. WHEN an investor selects an offering card, THE Offerings_UI SHALL display a detail view with the full description, all images, investment terms, and an "Invest Now" button.
5. WHILE an offering has status `funded`, THE Offerings_UI SHALL display a "Fully Funded" badge on the offering card and hide the "Invest Now" button.

### Requirement 4: Submit Letter of Intent

**User Story:** As an investor, I want to submit a Letter of Intent for an offering, so that I can formally express my investment interest.

#### Acceptance Criteria

1. WHEN an investor clicks "Invest Now" on an open offering, THE Offerings_UI SHALL display an LOI form requesting: full name, email address, phone number, intended investment amount, and an electronic signature acknowledgment checkbox.
2. WHEN an investor submits a valid LOI form, THE Offerings_API SHALL create an LOI record linked to the offering and the investor, and return a confirmation.
3. WHEN an investor submits an intended investment amount below the offering's minimum investment, THE Offerings_API SHALL reject the submission with a validation error specifying the minimum amount.
4. WHEN an investor submits an LOI for an offering with status other than `open`, THE Offerings_API SHALL reject the submission with an error indicating the offering is not accepting investments.
5. THE Offerings_API SHALL record the LOI submission timestamp and set the initial LOI status to `submitted`.
6. WHEN an investor submits an LOI without checking the electronic signature acknowledgment, THE Offerings_UI SHALL prevent form submission and display a validation message.

### Requirement 5: Admin LOI Notification

**User Story:** As an admin, I want to receive an email notification when an investor submits an LOI, so that I can promptly review and follow up.

#### Acceptance Criteria

1. WHEN an LOI is successfully created, THE Email_Service SHALL send a notification email to all admin users in the organization.
2. THE Email_Service SHALL include in the notification email: the investor's name, the offering title, the intended investment amount, and the submission timestamp.
3. IF the Email_Service fails to send the notification, THEN THE Offerings_API SHALL log the failure and continue processing the LOI submission without returning an error to the investor.

### Requirement 6: Track LOI Submissions

**User Story:** As an admin, I want to view all LOI submissions for an offering, so that I can track investor interest and manage the funding process.

#### Acceptance Criteria

1. WHEN an admin requests LOI submissions for a specific offering, THE Offerings_API SHALL return all LOI records for that offering, ordered by submission date descending.
2. THE Offerings_API SHALL include in each LOI record: investor name, email, phone, intended amount, submission timestamp, and LOI status.
3. WHEN an admin updates an LOI status to `reviewed`, THE Offerings_API SHALL persist the status change and record the review timestamp.
4. THE Offerings_UI SHALL display a summary count of total LOIs and total intended investment amount on the admin offering detail view.

### Requirement 7: Offerings Tab Navigation

**User Story:** As a user, I want to access offerings through the sidebar navigation, so that I can find the offerings section alongside other platform features.

#### Acceptance Criteria

1. THE Offerings_UI SHALL add an "Offerings" item to the existing sidebar navigation for both admin and investor views.
2. WHEN a user clicks the "Offerings" navigation item, THE Offerings_UI SHALL display the offerings list view as the active content.
3. THE Offerings_UI SHALL highlight the "Offerings" navigation item when the offerings section is active.
