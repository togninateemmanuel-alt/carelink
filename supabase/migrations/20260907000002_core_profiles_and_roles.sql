-- ============================================================================
-- Migration: 20260907000002_core_profiles_and_roles.sql
-- Description: Profiles, role safeguards, patient/doctor/pharmacy entities
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. BASE USER PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'patient',
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on email & role for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 2. TRIGGER: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. TRIGGER: Prevent unauthorized role escalation
-- Only platform_admin or service_role can elevate a user's role
CREATE OR REPLACE FUNCTION prevent_unauthorized_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_role app_role;
BEGIN
    -- If role is not changing, allow update
    IF OLD.role = NEW.role THEN
        RETURN NEW;
    END IF;

    -- If executing via service_role or background superuser
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Check if current authenticated user has platform_admin role
    SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'platform_admin' THEN
        RAISE EXCEPTION 'Action interdite : vous ne pouvez pas modifier votre propre rôle ou attribuer des privilèges supérieurs.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE OF role ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_unauthorized_role_escalation();

-- 4. PATIENT PROFILES
CREATE TABLE IF NOT EXISTS patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender gender_type NOT NULL DEFAULT 'unspecified',
    blood_group blood_group_type NOT NULL DEFAULT 'unknown',
    allergies TEXT[] NOT NULL DEFAULT '{}',
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    address TEXT,
    city TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_user ON patient_profiles(profile_id);

CREATE TRIGGER trg_patient_profiles_updated_at
BEFORE UPDATE ON patient_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. DOCTOR PROFILES
CREATE TABLE IF NOT EXISTS doctor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    license_number TEXT NOT NULL UNIQUE,
    specialty TEXT NOT NULL,
    sub_specialties TEXT[] NOT NULL DEFAULT '{}',
    bio TEXT,
    consultation_fee NUMERIC(12, 2) NOT NULL DEFAULT 10000.00, -- FCFA
    currency TEXT NOT NULL DEFAULT 'XOF',
    verification_status doctor_verification_status NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    signature_url TEXT,
    stamp_url TEXT,
    office_address TEXT,
    office_city TEXT,
    office_latitude NUMERIC(10, 7),
    office_longitude NUMERIC(10, 7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_specialty ON doctor_profiles(specialty);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_status ON doctor_profiles(verification_status);

CREATE TRIGGER trg_doctor_profiles_updated_at
BEFORE UPDATE ON doctor_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. PHARMACIES
CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    license_number TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    district TEXT, -- Quartier
    city TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_duty_pharmacy BOOLEAN NOT NULL DEFAULT false, -- Pharmacie de garde
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_city ON pharmacies(city);
CREATE INDEX IF NOT EXISTS idx_pharmacies_coords ON pharmacies(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pharmacies_verified ON pharmacies(is_verified, is_active);

CREATE TRIGGER trg_pharmacies_updated_at
BEFORE UPDATE ON pharmacies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. PHARMACY STAFF (Affiliation of pharmacists/staff to a pharmacy)
CREATE TABLE IF NOT EXISTS pharmacy_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    staff_role TEXT NOT NULL DEFAULT 'pharmacist', -- 'admin', 'pharmacist', 'assistant'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_pharmacy_staff_profile UNIQUE (pharmacy_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_user ON pharmacy_staff(profile_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_pharmacy ON pharmacy_staff(pharmacy_id);

CREATE TRIGGER trg_pharmacy_staff_updated_at
BEFORE UPDATE ON pharmacy_staff
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. TRIGGER: Auto-create Profile & Patient Profile on auth.users Signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role app_role := 'patient';
    v_first_name TEXT := '';
    v_last_name TEXT := '';
    v_meta_role TEXT;
BEGIN
    -- Extract optional role from raw_user_meta_data if passed during signup
    v_meta_role := NEW.raw_user_meta_data->>'role';
    IF v_meta_role IN ('patient', 'doctor', 'pharmacy_admin') THEN
        v_role := v_meta_role::app_role;
    END IF;

    v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur');
    v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'CareLink');

    INSERT INTO public.profiles (id, email, role, first_name, last_name, phone)
    VALUES (
        NEW.id,
        NEW.email,
        v_role,
        v_first_name,
        v_last_name,
        NEW.raw_user_meta_data->>'phone'
    );

    -- If registered as a patient, auto-create patient_profile
    IF v_role = 'patient' THEN
        INSERT INTO public.patient_profiles (profile_id)
        VALUES (NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connect trigger to auth.users if available
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    END IF;
END $$;
