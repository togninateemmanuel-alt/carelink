-- ============================================================================
-- Migration: 20260907000003_medical_records.sql
-- Description: Medical dossiers, timeline entries, access delegation & transfers
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. MEDICAL DOSSIER (Root health record for a patient)
CREATE TABLE IF NOT EXISTS medical_dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    blood_group blood_group_type NOT NULL DEFAULT 'unknown',
    allergies TEXT[] NOT NULL DEFAULT '{}',
    chronic_conditions TEXT[] NOT NULL DEFAULT '{}',
    past_medical_history TEXT,
    surgical_history TEXT,
    family_history TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_dossiers_patient ON medical_dossiers(patient_id);

CREATE TRIGGER trg_medical_dossiers_updated_at
BEFORE UPDATE ON medical_dossiers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. MEDICAL RECORD ENTRIES (Observations, diagnoses, exams, consultation notes)
CREATE TABLE IF NOT EXISTS medical_record_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID NOT NULL REFERENCES medical_dossiers(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL, -- 'consultation_note', 'diagnosis', 'observation', 'treatment_plan', 'lab_result', 'document'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of storage document paths / metadata
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_record_entries_dossier ON medical_record_entries(dossier_id);
CREATE INDEX IF NOT EXISTS idx_record_entries_doctor ON medical_record_entries(doctor_id);
CREATE INDEX IF NOT EXISTS idx_record_entries_type ON medical_record_entries(entry_type);

CREATE TRIGGER trg_medical_record_entries_updated_at
BEFORE UPDATE ON medical_record_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. DOCTOR-PATIENT ACCESS CONTROL (Strict access delegation)
CREATE TABLE IF NOT EXISTS doctor_patient_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    access_level access_level_type NOT NULL DEFAULT 'read_write',
    status access_status_type NOT NULL DEFAULT 'active',
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    CONSTRAINT uq_doctor_patient_access UNIQUE(doctor_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_dp_access_doctor ON doctor_patient_access(doctor_id);
CREATE INDEX IF NOT EXISTS idx_dp_access_patient ON doctor_patient_access(patient_id);
CREATE INDEX IF NOT EXISTS idx_dp_access_active ON doctor_patient_access(doctor_id, patient_id, status);

-- 4. DOSSIER TRANSFERS (Transfer of a patient record between Doctor A and Doctor B)
CREATE TABLE IF NOT EXISTS dossier_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID NOT NULL REFERENCES medical_dossiers(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    transfer_reason TEXT NOT NULL,
    clinical_summary TEXT,
    status transfer_status_type NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    response_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossier_transfers_from ON dossier_transfers(from_doctor_id);
CREATE INDEX IF NOT EXISTS idx_dossier_transfers_to ON dossier_transfers(to_doctor_id);
CREATE INDEX IF NOT EXISTS idx_dossier_transfers_patient ON dossier_transfers(patient_id);

CREATE TRIGGER trg_dossier_transfers_updated_at
BEFORE UPDATE ON dossier_transfers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create medical_dossier when patient_profile is created
CREATE OR REPLACE FUNCTION auto_create_medical_dossier()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.medical_dossiers (patient_id, blood_group, allergies)
    VALUES (NEW.profile_id, NEW.blood_group, NEW.allergies)
    ON CONFLICT (patient_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_create_medical_dossier
AFTER INSERT ON patient_profiles
FOR EACH ROW EXECUTE FUNCTION auto_create_medical_dossier();
