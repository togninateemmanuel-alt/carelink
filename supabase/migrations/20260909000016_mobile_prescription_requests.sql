-- ============================================================================
-- Migration: 20260909000016_mobile_prescription_requests.sql
-- Description: Mobile prescription request workflow (hospital queue, triage,
--              secure access token). Extends CareLink — does NOT replace existing
--              prescriptions / appointments / pharmacies.
-- ============================================================================

-- 1. HOSPITALS (facility layer — distinct from doctor_profiles.office_*)
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Lomé',
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    consultation_price NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    currency TEXT NOT NULL DEFAULT 'XOF',
    avg_consultation_minutes INTEGER NOT NULL DEFAULT 15 CHECK (avg_consultation_minutes > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status);

CREATE TRIGGER trg_hospitals_updated_at
BEFORE UPDATE ON hospitals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. HOSPITAL STAFF
CREATE TABLE IF NOT EXISTS hospital_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    staff_role TEXT NOT NULL DEFAULT 'receptionist' CHECK (staff_role IN ('admin', 'receptionist', 'nurse', 'triage')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_hospital_staff UNIQUE (hospital_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_hospital_staff_profile ON hospital_staff(profile_id);

-- Optional: link doctor to a hospital
ALTER TABLE doctor_profiles
    ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;

-- 3. PRESCRIPTION REQUEST STATUSES
DO $$ BEGIN
    CREATE TYPE prescription_request_status AS ENUM (
        'draft',
        'payment_pending',
        'payment_confirmed',
        'submitted',
        'hospital_pending',
        'hospital_validated',
        'rejected',
        'waiting',
        'with_doctor',
        'consultation_completed',
        'prescription_pending',
        'prescription_ready',
        'completed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE triage_priority_level AS ENUM ('level_1', 'level_2', 'level_3');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. PRESCRIPTION REQUESTS (patient → hospital intake)
CREATE TABLE IF NOT EXISTS prescription_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
    consultation_type TEXT NOT NULL DEFAULT 'general',
    symptoms TEXT NOT NULL,
    patient_insurance_id UUID REFERENCES patient_insurances(id) ON DELETE SET NULL,
    consultation_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    insurance_coverage NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_status payment_status_type NOT NULL DEFAULT 'pending',
    request_status prescription_request_status NOT NULL DEFAULT 'draft',
    automatic_priority triage_priority_level NOT NULL DEFAULT 'level_3',
    final_priority triage_priority_level NOT NULL DEFAULT 'level_3',
    priority_override_reason TEXT,
    priority_updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    queue_number INTEGER,
    queue_status TEXT CHECK (queue_status IS NULL OR queue_status IN ('waiting', 'called', 'in_consultation', 'done', 'cancelled')),
    rejection_reason TEXT,
    validated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    validated_at TIMESTAMPTZ,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rx_req_patient ON prescription_requests(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rx_req_hospital ON prescription_requests(hospital_id, request_status);
CREATE INDEX IF NOT EXISTS idx_rx_req_queue ON prescription_requests(hospital_id, final_priority, queue_number)
    WHERE queue_status = 'waiting';

CREATE UNIQUE INDEX IF NOT EXISTS uq_rx_req_hospital_queue
    ON prescription_requests(hospital_id, queue_number)
    WHERE queue_number IS NOT NULL AND request_status NOT IN ('cancelled', 'rejected');

CREATE TRIGGER trg_prescription_requests_updated_at
BEFORE UPDATE ON prescription_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. SECURE PRESCRIPTION ACCESS (hashed PIN + verification token — never plaintext in frontend)
CREATE TABLE IF NOT EXISTS prescription_access_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL UNIQUE REFERENCES prescriptions(id) ON DELETE CASCADE,
    pin_hash TEXT, -- bcrypt/argon hash; NULL if auth-only unlock
    verification_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rx_access_token ON prescription_access_secrets(verification_token);

-- 6. SYSTEM SETTINGS (queue avg time, etc.)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    value_type TEXT NOT NULL DEFAULT 'json',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO system_settings (key, value, description)
VALUES (
    'queue.avg_consultation_minutes',
    '15'::jsonb,
    'Durée moyenne de consultation utilisée pour estimer le temps d''attente'
)
ON CONFLICT (key) DO NOTHING;

-- 7. HELPERS
CREATE OR REPLACE FUNCTION is_hospital_staff_member(p_hospital_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.hospital_staff
        WHERE hospital_id = p_hospital_id
          AND profile_id = auth.uid()
          AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Administrative triage aid (NOT a medical diagnosis)
CREATE OR REPLACE FUNCTION compute_automatic_priority(p_symptoms TEXT)
RETURNS triage_priority_level AS $$
DECLARE
    s TEXT := lower(coalesce(p_symptoms, ''));
BEGIN
    IF s ~ '(douleur thoracique|essoufflement sévère|inconscient|hémorragie|convulsion|avc|crise cardiaque)' THEN
        RETURN 'level_1';
    ELSIF s ~ '(fièvre élevée|vomissement|douleur intense|asthmatique|infection)' THEN
        RETURN 'level_2';
    END IF;
    RETURN 'level_3';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. RPC: patient submits prescription request (after client collected form; payment is NOT auto-success)
CREATE OR REPLACE FUNCTION create_prescription_request(
    p_hospital_id UUID,
    p_consultation_type TEXT,
    p_symptoms TEXT,
    p_patient_insurance_id UUID DEFAULT NULL,
    p_mark_payment_demo BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    v_price NUMERIC(12, 2);
    v_coverage NUMERIC(12, 2) := 0;
    v_remaining NUMERIC(12, 2);
    v_priority triage_priority_level;
    v_id UUID;
    v_pay_status payment_status_type := 'pending';
    v_req_status prescription_request_status := 'payment_pending';
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.' USING ERRCODE = '42501';
    END IF;

    SELECT consultation_price INTO v_price
    FROM public.hospitals
    WHERE id = p_hospital_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hôpital indisponible.' USING ERRCODE = 'P0002';
    END IF;

    IF p_patient_insurance_id IS NOT NULL THEN
        -- Only own insurance; coverage % from patient_insurances if column exists pattern
        IF NOT EXISTS (
            SELECT 1 FROM public.patient_insurances
            WHERE id = p_patient_insurance_id AND patient_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Assurance invalide.' USING ERRCODE = '42501';
        END IF;
        -- Conservative default: no automatic full coverage without claim engine
        v_coverage := 0;
    END IF;

    v_remaining := GREATEST(0, v_price - v_coverage);
    v_priority := compute_automatic_priority(p_symptoms);

    -- Demo payment flag is EXPLICIT and does not claim a real provider success
    IF p_mark_payment_demo AND v_remaining = 0 THEN
        v_pay_status := 'succeeded';
        v_req_status := 'submitted';
    ELSIF p_mark_payment_demo THEN
        -- Still pending real provider; demo only records intent
        v_pay_status := 'pending';
        v_req_status := 'payment_pending';
    END IF;

    IF v_remaining = 0 THEN
        v_pay_status := 'succeeded';
        v_req_status := 'submitted';
    END IF;

    INSERT INTO public.prescription_requests (
        patient_id, hospital_id, consultation_type, symptoms,
        patient_insurance_id, consultation_price, insurance_coverage, remaining_amount,
        payment_status, request_status, automatic_priority, final_priority
    )
    VALUES (
        auth.uid(), p_hospital_id, coalesce(nullif(p_consultation_type, ''), 'general'), p_symptoms,
        p_patient_insurance_id, v_price, v_coverage, v_remaining,
        v_pay_status,
        CASE WHEN v_pay_status = 'succeeded' THEN 'hospital_pending'::prescription_request_status ELSE v_req_status END,
        v_priority, v_priority
    )
    RETURNING id INTO v_id;

    INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
    VALUES (
        auth.uid(),
        'Demande d''ordonnance enregistrée',
        'Votre demande a été créée. Statut: ' || CASE WHEN v_pay_status = 'succeeded' THEN 'envoyée à l''hôpital' ELSE 'paiement en attente' END,
        'system',
        jsonb_build_object('prescription_request_id', v_id)
    );

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. RPC: hospital validate + assign queue (server-side queue number)
CREATE OR REPLACE FUNCTION hospital_validate_prescription_request(
    p_request_id UUID,
    p_approve BOOLEAN,
    p_rejection_reason TEXT DEFAULT NULL,
    p_priority_override triage_priority_level DEFAULT NULL,
    p_priority_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_req prescription_requests%ROWTYPE;
    v_next_q INTEGER;
BEGIN
    SELECT * INTO v_req FROM public.prescription_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Demande introuvable.' USING ERRCODE = 'P0002';
    END IF;

    IF NOT is_hospital_staff_member(v_req.hospital_id) THEN
        SELECT role INTO v_next_q FROM profiles WHERE id = auth.uid();
        -- allow platform_admin
        IF (SELECT role FROM profiles WHERE id = auth.uid()) IS DISTINCT FROM 'platform_admin' THEN
            RAISE EXCEPTION 'Action interdite: personnel de cet hôpital uniquement.' USING ERRCODE = '42501';
        END IF;
    END IF;

    IF v_req.request_status NOT IN ('submitted', 'hospital_pending', 'payment_confirmed') THEN
        RAISE EXCEPTION 'Statut incompatible pour validation: %', v_req.request_status USING ERRCODE = 'P0004';
    END IF;

    IF NOT p_approve THEN
        UPDATE public.prescription_requests
        SET request_status = 'rejected',
            rejection_reason = coalesce(p_rejection_reason, 'Non précisé'),
            validated_by = auth.uid(),
            validated_at = now()
        WHERE id = p_request_id;

        INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
        VALUES (v_req.patient_id, 'Demande refusée', coalesce(p_rejection_reason, 'Votre demande a été refusée par l''hôpital.'), 'system',
                jsonb_build_object('prescription_request_id', p_request_id));

        RETURN jsonb_build_object('status', 'rejected');
    END IF;

    -- Next queue number for hospital (atomic)
    SELECT coalesce(max(queue_number), 0) + 1 INTO v_next_q
    FROM public.prescription_requests
    WHERE hospital_id = v_req.hospital_id
      AND queue_number IS NOT NULL;

    UPDATE public.prescription_requests
    SET request_status = 'waiting',
        queue_number = v_next_q,
        queue_status = 'waiting',
        final_priority = coalesce(p_priority_override, final_priority),
        priority_override_reason = CASE WHEN p_priority_override IS NOT NULL THEN p_priority_reason ELSE priority_override_reason END,
        priority_updated_by = CASE WHEN p_priority_override IS NOT NULL THEN auth.uid() ELSE priority_updated_by END,
        validated_by = auth.uid(),
        validated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
    VALUES (
        v_req.patient_id,
        'Vous êtes en file d''attente',
        'Numéro de file: ' || v_next_q::text || '. Ceci est un temps d''attente estimé, non une garantie.',
        'system',
        jsonb_build_object('prescription_request_id', p_request_id, 'queue_number', v_next_q)
    );

    RETURN jsonb_build_object('status', 'waiting', 'queue_number', v_next_q);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Public verification (limited data — token only, no full clinical content)
CREATE OR REPLACE FUNCTION verify_prescription_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_rx RECORD;
BEGIN
    SELECT p.id, p.prescription_code, p.status, p.created_at, p.is_digitally_signed,
           pr.first_name AS doc_first, pr.last_name AS doc_last
    INTO v_rx
    FROM public.prescription_access_secrets s
    JOIN public.prescriptions p ON p.id = s.prescription_id
    JOIN public.profiles pr ON pr.id = p.doctor_id
    WHERE s.verification_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'prescription_code', v_rx.prescription_code,
        'status', v_rx.status,
        'date', v_rx.created_at,
        'doctor', left(coalesce(v_rx.doc_first, ''), 1) || '. ' || coalesce(v_rx.doc_last, ''),
        'signed', v_rx.is_digitally_signed
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Auto-create access secret when prescription is inserted
CREATE OR REPLACE FUNCTION ensure_prescription_access_secret()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.prescription_access_secrets (prescription_id)
    VALUES (NEW.id)
    ON CONFLICT (prescription_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prescription_access_secret ON prescriptions;
CREATE TRIGGER trg_prescription_access_secret
AFTER INSERT ON prescriptions
FOR EACH ROW EXECUTE FUNCTION ensure_prescription_access_secret();

-- 11. RLS
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_access_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hospitals_read_active ON hospitals;
CREATE POLICY hospitals_read_active ON hospitals FOR SELECT TO authenticated
USING (status = 'active' OR EXISTS (SELECT 1 FROM hospital_staff hs WHERE hs.hospital_id = hospitals.id AND hs.profile_id = auth.uid()));

DROP POLICY IF EXISTS hospital_staff_self ON hospital_staff;
CREATE POLICY hospital_staff_self ON hospital_staff FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR is_hospital_staff_member(hospital_id));

DROP POLICY IF EXISTS rx_req_patient ON prescription_requests;
CREATE POLICY rx_req_patient ON prescription_requests FOR SELECT TO authenticated
USING (patient_id = auth.uid() OR is_hospital_staff_member(hospital_id));

DROP POLICY IF EXISTS rx_req_patient_insert ON prescription_requests;
CREATE POLICY rx_req_patient_insert ON prescription_requests FOR INSERT TO authenticated
WITH CHECK (patient_id = auth.uid());

-- Secrets: no direct client read of pin_hash; token verify via RPC only
DROP POLICY IF EXISTS rx_access_deny_select ON prescription_access_secrets;
CREATE POLICY rx_access_deny_select ON prescription_access_secrets FOR SELECT TO authenticated
USING (false);

DROP POLICY IF EXISTS system_settings_read ON system_settings;
CREATE POLICY system_settings_read ON system_settings FOR SELECT TO authenticated
USING (is_active = true);
