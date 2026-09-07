-- ============================================================================
-- Migration: 20260907000008_insurance_and_claims.sql
-- Description: Health insurance providers, patient policies, coverages & tiers-payant claims
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. INSURANCE PROVIDERS (Compagnies d'assurance)
CREATE TABLE IF NOT EXISTS insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- E.g. 'SUNU', 'ASCOMA', 'NSIA', 'SANLAM', 'OGAR'
    contact_phone TEXT,
    contact_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PATIENT INSURANCES (Police et carte d'assuré du patient)
CREATE TABLE IF NOT EXISTS patient_insurances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES insurance_providers(id) ON DELETE RESTRICT,
    policy_number TEXT NOT NULL,
    member_id TEXT NOT NULL,
    coverage_rate_default NUMERIC(5, 2) NOT NULL DEFAULT 80.00, -- En %
    is_verified BOOLEAN NOT NULL DEFAULT false,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    card_document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_coverage_rate CHECK (coverage_rate_default >= 0 AND coverage_rate_default <= 100),
    CONSTRAINT chk_valid_period CHECK (valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_patient_insurances_patient ON patient_insurances(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurances_provider ON patient_insurances(provider_id);

CREATE TRIGGER trg_patient_insurances_updated_at
BEFORE UPDATE ON patient_insurances
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. INSURANCE COVERAGES (Règles spécifiques par catégorie médicale / pharmaceutique)
CREATE TABLE IF NOT EXISTS insurance_coverages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    coverage_percentage NUMERIC(5, 2) NOT NULL,
    ceiling_amount NUMERIC(12, 2), -- Plafond max en FCFA
    requires_preauth BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coverages_provider ON insurance_coverages(provider_id);

-- 4. INSURANCE CLAIMS (Feuilles de soins et réclamations de tiers-payant)
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_reference TEXT NOT NULL UNIQUE,
    patient_insurance_id UUID NOT NULL REFERENCES patient_insurances(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    claimed_amount NUMERIC(12, 2) NOT NULL,
    approved_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    patient_copay_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status claim_status_type NOT NULL DEFAULT 'submitted',
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_insurance ON insurance_claims(patient_insurance_id);
CREATE INDEX IF NOT EXISTS idx_claims_order ON insurance_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_claims_consultation ON insurance_claims(consultation_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);

CREATE TRIGGER trg_insurance_claims_updated_at
BEFORE UPDATE ON insurance_claims
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-generate claim reference
CREATE OR REPLACE FUNCTION generate_claim_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.claim_reference IS NULL OR NEW.claim_reference = '' THEN
        NEW.claim_reference := 'CLM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_claim_reference
BEFORE INSERT ON insurance_claims
FOR EACH ROW EXECUTE FUNCTION generate_claim_reference();
