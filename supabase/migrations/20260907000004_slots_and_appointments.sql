-- ============================================================================
-- Migration: 20260907000004_slots_and_appointments.sql
-- Description: Real doctor availability slots, appointment bookings & consultations
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. DOCTOR AVAILABILITY SLOTS
CREATE TABLE IF NOT EXISTS doctor_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status slot_status_type NOT NULL DEFAULT 'available',
    consultation_mode consultation_mode_type NOT NULL DEFAULT 'in_person',
    capacity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_slot_time CHECK (end_time > start_time),
    CONSTRAINT chk_slot_capacity CHECK (capacity >= 1)
);

CREATE INDEX IF NOT EXISTS idx_slots_doctor_time ON doctor_slots(doctor_id, start_time);
CREATE INDEX IF NOT EXISTS idx_slots_status ON doctor_slots(doctor_id, status);

CREATE TRIGGER trg_doctor_slots_updated_at
BEFORE UPDATE ON doctor_slots
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES doctor_slots(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status appointment_status_type NOT NULL DEFAULT 'requested',
    consultation_mode consultation_mode_type NOT NULL DEFAULT 'in_person',
    reason_for_visit TEXT NOT NULL,
    patient_notes TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(slot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. MEDICAL CONSULTATIONS
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status consultation_status_type NOT NULL DEFAULT 'in_progress',
    symptoms TEXT,
    vital_signs JSONB NOT NULL DEFAULT '{}'::jsonb, -- blood_pressure, temperature, heart_rate, weight_kg, height_cm, bmi
    physical_examination TEXT,
    diagnosis TEXT,
    clinical_notes TEXT,
    treatment_plan TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id, started_at);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id, started_at);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment ON consultations(appointment_id);

CREATE TRIGGER trg_consultations_updated_at
BEFORE UPDATE ON consultations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Automatically grant doctor-patient access when an appointment is confirmed
CREATE OR REPLACE FUNCTION handle_appointment_access_grant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
        INSERT INTO public.doctor_patient_access (
            doctor_id,
            patient_id,
            granted_by,
            reason,
            access_level,
            status,
            expires_at
        )
        VALUES (
            NEW.doctor_id,
            NEW.patient_id,
            NEW.patient_id,
            'Rendez-vous médical confirmé',
            'read_write',
            'active',
            NEW.scheduled_at + INTERVAL '30 days' -- Accès valide jusqu'à 30 jours après le rendez-vous
        )
        ON CONFLICT (doctor_id, patient_id) DO UPDATE
        SET status = 'active',
            expires_at = GREATEST(doctor_patient_access.expires_at, NEW.scheduled_at + INTERVAL '30 days'),
            revoked_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_appointment_confirmed_grant_access
AFTER UPDATE OF status ON appointments
FOR EACH ROW EXECUTE FUNCTION handle_appointment_access_grant();
