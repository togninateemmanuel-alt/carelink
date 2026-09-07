-- ============================================================================
-- Migration: 20260907000011_transactional_functions.sql
-- Description: Server-side ACID transactions (Pessimistic stock locking, slot booking, Haversine)
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. HAVERSINE GEOLOCATION DISTANCE (Pure SQL, no external PostGIS dependency required)
CREATE OR REPLACE FUNCTION calculate_distance_km(
    p_lat1 NUMERIC,
    p_lon1 NUMERIC,
    p_lat2 NUMERIC,
    p_lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_r CONSTANT NUMERIC := 6371.0; -- Rayon terrestre moyen en kilomètres
    v_dlat NUMERIC;
    v_dlon NUMERIC;
    v_a NUMERIC;
    v_c NUMERIC;
BEGIN
    IF p_lat1 IS NULL OR p_lon1 IS NULL OR p_lat2 IS NULL OR p_lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    v_dlat := radians(p_lat2 - p_lat1);
    v_dlon := radians(p_lon2 - p_lon1);

    v_a := sin(v_dlat / 2.0) * sin(v_dlat / 2.0) +
           cos(radians(p_lat1)) * cos(radians(p_lat2)) *
           sin(v_dlon / 2.0) * sin(v_dlon / 2.0);

    v_c := 2.0 * asin(sqrt(v_a));

    RETURN round((v_r * v_c)::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

-- 2. TRANSACTIONAL STOCK DECREMENT WITH PESSIMISTIC ROW LOCKING (Anti Race-Condition)
-- Prevents two concurrent users from taking the last unit, forbidding negative stock
CREATE OR REPLACE FUNCTION reserve_and_decrement_stock(
    p_order_id UUID,
    p_items JSONB -- Array of {"product_id": "...", "quantity": 1}
)
RETURNS BOOLEAN AS $$
DECLARE
    v_item JSONB;
    v_prod_id UUID;
    v_req_qty INTEGER;
    v_cur_qty INTEGER;
    v_pharmacy_id UUID;
    v_prod_name TEXT;
BEGIN
    -- Verification: items array must not be empty
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Le panier d''articles est vide.' USING ERRCODE = '22000';
    END IF;

    -- Iterate in sorted order of product_id to completely avoid SQL deadlocks
    FOR v_item IN 
        SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'product_id'
    LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_req_qty := (v_item->>'quantity')::INTEGER;

        IF v_req_qty <= 0 THEN
            RAISE EXCEPTION 'Quantité invalide (%s) pour le produit %s', v_req_qty, v_prod_id
                USING ERRCODE = '22003';
        END IF;

        -- 1. PESSIMISTIC LOCK: Lock the stock row FOR UPDATE
        SELECT ps.current_quantity, ps.pharmacy_id, p.name
        INTO v_cur_qty, v_pharmacy_id, v_prod_name
        FROM public.product_stocks ps
        JOIN public.products p ON p.id = ps.product_id
        WHERE ps.product_id = v_prod_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produit introuvable ou stock non initialisé (ID: %s)', v_prod_id
                USING ERRCODE = 'P0002';
        END IF;

        -- 2. HARD GUARANTEE: Never allow current_quantity < requested_quantity
        IF v_cur_qty < v_req_qty THEN
            RAISE EXCEPTION 'Rupture de stock pour "%s" : demandé %s, disponible en officine %s.',
                v_prod_name, v_req_qty, v_cur_qty
                USING ERRCODE = 'P0001';
        END IF;

        -- 3. APPLY DECREMENT
        UPDATE public.product_stocks
        SET current_quantity = current_quantity - v_req_qty,
            updated_at = now()
        WHERE product_id = v_prod_id;

        -- 4. INSERT IMMUTABLE AUDIT MOVEMENT
        INSERT INTO public.stock_movements (
            product_id,
            pharmacy_id,
            movement_type,
            quantity_change,
            quantity_before,
            quantity_after,
            reference_type,
            reference_id,
            notes,
            performed_by
        )
        VALUES (
            v_prod_id,
            v_pharmacy_id,
            'sale',
            -v_req_qty,
            v_cur_qty,
            v_cur_qty - v_req_qty,
            'order',
            p_order_id::TEXT,
            'Décrémentation transactionnelle pour commande ' || p_order_id::TEXT,
            auth.uid()
        );
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRANSACTIONAL CONCURRENCY-SAFE APPOINTMENT BOOKING
CREATE OR REPLACE FUNCTION book_appointment_slot(
    p_patient_id UUID,
    p_slot_id UUID,
    p_reason TEXT,
    p_mode consultation_mode_type DEFAULT 'in_person'
)
RETURNS UUID AS $$
DECLARE
    v_doctor_id UUID;
    v_start_time TIMESTAMPTZ;
    v_slot_status slot_status_type;
    v_appointment_id UUID;
BEGIN
    -- 1. PESSIMISTIC LOCK: Lock slot row FOR UPDATE
    SELECT doctor_id, start_time, status
    INTO v_doctor_id, v_start_time, v_slot_status
    FROM public.doctor_slots
    WHERE id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Le créneau demandé n''existe pas.' USING ERRCODE = 'P0002';
    END IF;

    -- 2. VERIFY AVAILABILITY
    IF v_slot_status != 'available' THEN
        RAISE EXCEPTION 'Ce créneau horaire a déjà été réservé par un autre patient.'
            USING ERRCODE = 'P0003';
    END IF;

    -- 3. MARK SLOT AS BOOKED
    UPDATE public.doctor_slots
    SET status = 'booked',
        updated_at = now()
    WHERE id = p_slot_id;

    -- 4. CREATE APPOINTMENT
    INSERT INTO public.appointments (
        patient_id,
        doctor_id,
        slot_id,
        scheduled_at,
        status,
        consultation_mode,
        reason_for_visit
    )
    VALUES (
        p_patient_id,
        v_doctor_id,
        p_slot_id,
        v_start_time,
        'confirmed',
        p_mode,
        p_reason
    )
    RETURNING id INTO v_appointment_id;

    -- 5. NOTIFY DOCTOR
    INSERT INTO public.notifications (
        recipient_id,
        title,
        message,
        notification_type,
        data
    )
    VALUES (
        v_doctor_id,
        'Nouveau rendez-vous réservé',
        'Un patient a réservé le créneau du ' || to_char(v_start_time, 'DD/MM/YYYY à HH24:MI'),
        'appointment',
        jsonb_build_object('appointment_id', v_appointment_id, 'slot_id', p_slot_id)
    );

    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PATIENT-INITIATED PRESCRIPTION TRANSFER TO SPECIFIC PHARMACY
CREATE OR REPLACE FUNCTION transfer_prescription_to_pharmacy(
    p_prescription_id UUID,
    p_pharmacy_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_rx_patient_id UUID;
    v_rx_status prescription_status_type;
    v_transfer_id UUID;
BEGIN
    -- Verify prescription ownership
    SELECT patient_id, status
    INTO v_rx_patient_id, v_rx_status
    FROM public.prescriptions
    WHERE id = p_prescription_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ordonnance introuvable.' USING ERRCODE = 'P0002';
    END IF;

    IF v_rx_patient_id != auth.uid() THEN
        RAISE EXCEPTION 'Action interdite : vous ne pouvez transférer que vos propres ordonnances.'
            USING ERRCODE = '42501';
    END IF;

    IF v_rx_status IN ('cancelled', 'expired') THEN
        RAISE EXCEPTION 'Impossible de transférer une ordonnance annulée ou expirée.'
            USING ERRCODE = 'P0004';
    END IF;

    -- Record transfer
    INSERT INTO public.prescription_pharmacy_transfers (
        prescription_id,
        patient_id,
        pharmacy_id,
        status,
        patient_notes,
        transferred_at
    )
    VALUES (
        p_prescription_id,
        auth.uid(),
        p_pharmacy_id,
        'pending',
        p_notes,
        now()
    )
    RETURNING id INTO v_transfer_id;

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
