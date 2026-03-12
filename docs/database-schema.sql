-- ============================================================================
-- SONNO HOMES — Production Database Schema (PostgreSQL)
-- ============================================================================
-- Designed to replace all hardcoded frontend data with a proper relational
-- backend. Supports multi-tenancy, audit trails, soft deletes, and the new
-- report-generation workflow.
-- ============================================================================

-- ── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ORGANIZATIONS (multi-tenancy)
-- ============================================================================
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    registration_no VARCHAR(100),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    country         VARCHAR(100),
    logo_url        TEXT,
    management_fee  NUMERIC(5,4) NOT NULL DEFAULT 0.20, -- 20% default
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- ============================================================================
-- 2. USERS (authentication + roles)
-- ============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'investor');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    email           VARCHAR(255) NOT NULL,
    password_hash   TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'investor',
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(50),
    avatar_url      TEXT,
    last_login_at   TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_users_email_org UNIQUE (org_id, email)
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- 3. INVESTOR PROFILES (extended info beyond the user record)
-- ============================================================================
CREATE TABLE investor_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id),
    occupation          VARCHAR(150),
    city                VARCHAR(150),
    country             VARCHAR(100),
    notes               TEXT,
    future_commitment   BOOLEAN NOT NULL DEFAULT FALSE,
    accredited          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investor_profiles_user ON investor_profiles(user_id);

-- ============================================================================
-- 4. PROPERTIES
-- ============================================================================
CREATE TYPE property_status AS ENUM ('active', 'lease_renewal', 'inactive', 'sold');

CREATE TABLE properties (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    name            VARCHAR(255) NOT NULL,
    property_type   VARCHAR(100) NOT NULL,       -- Villa, Apartment, Loft, etc.
    location        VARCHAR(255) NOT NULL,
    region          VARCHAR(150),
    bedrooms        SMALLINT NOT NULL DEFAULT 0,
    bathrooms       SMALLINT,
    square_meters   NUMERIC(10,2),
    property_value  NUMERIC(14,2),               -- current estimated value
    acquisition_date DATE,
    contract_years  SMALLINT NOT NULL DEFAULT 5,
    monthly_yield   NUMERIC(5,3),                -- target monthly yield %
    occupancy_rate  NUMERIC(5,2),                -- current occupancy %
    noi             NUMERIC(14,2),               -- net operating income
    irr             NUMERIC(6,3),                -- internal rate of return %
    status          property_status NOT NULL DEFAULT 'active',
    image_url       TEXT,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_properties_org ON properties(org_id);
CREATE INDEX idx_properties_status ON properties(status);

-- ============================================================================
-- 5. INVESTMENTS (investor ↔ property junction with financial details)
-- ============================================================================
CREATE TYPE investment_status AS ENUM ('active', 'matured', 'exited', 'pending');

CREATE TABLE investments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id     UUID NOT NULL REFERENCES users(id),
    property_id     UUID NOT NULL REFERENCES properties(id),
    amount          NUMERIC(14,2) NOT NULL,
    equity_share    NUMERIC(7,4),                -- percentage of property owned
    start_date      DATE NOT NULL,
    end_date        DATE,                        -- computed or manual
    status          investment_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_investment UNIQUE (investor_id, property_id)
);

CREATE INDEX idx_investments_investor ON investments(investor_id);
CREATE INDEX idx_investments_property ON investments(property_id);
CREATE INDEX idx_investments_status ON investments(status);

-- ============================================================================
-- 6. DISTRIBUTIONS
-- ============================================================================
CREATE TYPE distribution_type   AS ENUM ('monthly', 'quarterly', 'annual', 'special');
CREATE TYPE distribution_status AS ENUM ('pending', 'paid', 'failed', 'cancelled');

CREATE TABLE distributions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investment_id   UUID NOT NULL REFERENCES investments(id),
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    amount          NUMERIC(14,2) NOT NULL,
    dist_type       distribution_type NOT NULL DEFAULT 'monthly',
    status          distribution_status NOT NULL DEFAULT 'pending',
    paid_at         TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_distributions_investment ON distributions(investment_id);
CREATE INDEX idx_distributions_period ON distributions(period_start, period_end);
CREATE INDEX idx_distributions_status ON distributions(status);

-- ============================================================================
-- 7. PERFORMANCE REPORTS (admin-generated per property per period)
-- ============================================================================
CREATE TYPE report_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE performance_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     UUID NOT NULL REFERENCES properties(id),
    created_by      UUID NOT NULL REFERENCES users(id),  -- admin who created it
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    nights_booked   SMALLINT NOT NULL DEFAULT 0,
    nights_available SMALLINT,                           -- total nights in period
    gross_revenue   NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_expenses  NUMERIC(14,2) NOT NULL DEFAULT 0,    -- sum of line items
    gross_profit    NUMERIC(14,2) GENERATED ALWAYS AS (gross_revenue - total_expenses) STORED,
    management_fee  NUMERIC(14,2) NOT NULL DEFAULT 0,    -- Sonno's 20% cut
    net_profit      NUMERIC(14,2) GENERATED ALWAYS AS (gross_revenue - total_expenses - management_fee) STORED,
    status          report_status NOT NULL DEFAULT 'draft',
    published_at    TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_report_property_period UNIQUE (property_id, period_start, period_end)
);

CREATE INDEX idx_reports_property ON performance_reports(property_id);
CREATE INDEX idx_reports_created_by ON performance_reports(created_by);
CREATE INDEX idx_reports_period ON performance_reports(period_start, period_end);

-- ============================================================================
-- 8. REPORT EXPENSE LINE ITEMS (flexible, any number per report)
-- ============================================================================
CREATE TABLE report_expenses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id       UUID NOT NULL REFERENCES performance_reports(id) ON DELETE CASCADE,
    category        VARCHAR(150) NOT NULL,       -- rent, cleaning, utilities, maintenance, etc.
    description     TEXT,
    amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_expenses_report ON report_expenses(report_id);

-- ============================================================================
-- 9. DOCUMENTS
-- ============================================================================
CREATE TYPE document_type AS ENUM (
    'contract', 'tax_k1', 'operating_agreement', 'statement',
    'performance_report', 'schedule', 'policy', 'other'
);

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    uploaded_by     UUID REFERENCES users(id),
    property_id     UUID REFERENCES properties(id),       -- NULL = org-level doc
    report_id       UUID REFERENCES performance_reports(id), -- links to generated report
    title           VARCHAR(255) NOT NULL,
    doc_type        document_type NOT NULL DEFAULT 'other',
    file_url        TEXT NOT NULL,                         -- S3 URL / path
    file_size_bytes BIGINT,
    mime_type       VARCHAR(100),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_property ON documents(property_id);
CREATE INDEX idx_documents_report ON documents(report_id);

-- ============================================================================
-- 10. DOCUMENT ↔ INVESTOR (which investors can see which documents)
-- ============================================================================
CREATE TABLE document_recipients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    investor_id     UUID NOT NULL REFERENCES users(id),
    viewed_at       TIMESTAMPTZ,
    downloaded_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doc_recipient UNIQUE (document_id, investor_id)
);

CREATE INDEX idx_doc_recipients_investor ON document_recipients(investor_id);
CREATE INDEX idx_doc_recipients_document ON document_recipients(document_id);

-- ============================================================================
-- 11. AUDIT LOG
-- ============================================================================
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,        -- e.g. 'report.created', 'distribution.paid'
    entity_type     VARCHAR(100),                 -- e.g. 'performance_report', 'distribution'
    entity_id       UUID,
    metadata        JSONB,                        -- flexible payload for details
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_log(org_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================================
-- 12. REFRESH TOKENS (for JWT auth)
-- ============================================================================
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================================
-- SEED: Default organization
-- ============================================================================
INSERT INTO organizations (name, registration_no, email, phone, address, country, management_fee)
VALUES ('Sonno Homes Ltd', 'IT-2021-SH-4892', 'admin@sonnohomes.com', '+39 06 1234 5678', 'Via Roma 42, Milan', 'Italy', 0.20);
