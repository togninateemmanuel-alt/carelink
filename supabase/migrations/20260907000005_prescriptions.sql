-- ============================================================================
-- Migration: 20260907000005_prescriptions.sql
-- Description: Digital prescriptions, line items & patient-initiated pharmacy transfers
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. DIGITAL PRESCRIPTIONS (Ordonnances électroniques)
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    prescription_code TEXT NOT NULL UNIQUE, -- E.g. 'RX-202609-AB12CD'
    status prescription_status_type NOT NULL DEFAULT 'active',
    general_instructions TEXT,
    doctor_signature_url TEXT,
    doctor_stamp_url TEXT,
    is_digitally_signed BOOLEAN NOT NULL DEFAULT false,
    signed_at TIMESTAMPTZ,
    valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '3 months'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_code ON prescriptions(prescription_code);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

CREATE TRIGGER trg_prescriptions_updated_at
BEFORE UPDATE ON prescriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. PRESCRIPTION ITEMS (Médicaments prescrits)
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    brand TEXT,
    form TEXT NOT NULL, -- comprimé, gélule, sirop, injectable, pommade, collyre
    dosage TEXT NOT NULL, -- 500 mg, 1 g, 100 mg/ml
    quantity INTEGER NOT NULL DEFAULT 1,
    frequency TEXT NOT NULL, -- ex: "1 comprimé matin et soir après le repas"
    duration_days INTEGER NOT NULL DEFAULT 7,
    instructions TEXT,
    is_renewable BOOLEAN NOT NULL DEFAULT false,
    renewals_allowed INTEGER NOT NULL DEFAULT 0,
    renewals_remaining INTEGER NOT NULL DEFAULT 0,
    is_dispensed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON prescription_items(prescription_id);

-- 3. PATIENT-INITIATED PHARMACY TRANSFERS (Transfert volontaire vers une officine choisie)
CREATE TABLE IF NOT EXISTS prescription_pharmacy_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    status transfer_status_type NOT NULL DEFAULT 'pending',
    patient_notes TEXT,
    pharmacy_response_notes TEXT,
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rx_transfers_rx ON prescription_pharmacy_transfers(prescription_id);
CREATE INDEX IF NOT EXISTS idx_rx_transfers_pharmacy ON prescription_pharmacy_transfers(pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_rx_transfers_patient ON prescription_pharmacy_transfers(patient_id);

CREATE TRIGGER trg_rx_transfers_updated_at
BEFORE UPDATE ON prescription_pharmacy_transfers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-generate readable unique prescription code
CREATE OR REPLACE FUNCTION generate_prescription_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.prescription_code IS NULL OR NEW.prescription_code = '' THEN
        NEW.prescription_code := 'RX-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prescription_code
BEFORE INSERT ON prescriptions
FOR EACH ROW EXECUTE FUNCTION generate_prescription_code();
