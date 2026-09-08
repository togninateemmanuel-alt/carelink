-- ============================================================================
-- Migration: 20260907000015_marketplace_and_clinical_transactions.sql
-- Description: Advanced ACID procedures, Atomic Checkout, Marketplace Engine, 
--              Dossier & RX Transfers, Doctor/Pharmacy Verification, and RLS Hardening
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS: PRACTITIONER & ENTITY VERIFICATION
-- ----------------------------------------------------------------------------

-- Check if a given profile corresponds to an officially verified doctor
CREATE OR REPLACE FUNCTION is_verified_doctor(p_doctor_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.doctor_profiles
        WHERE profile_id = p_doctor_id
          AND verification_status = 'verified'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if a given pharmacy is verified and active
CREATE OR REPLACE FUNCTION is_verified_pharmacy(p_pharmacy_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pharmacies
        WHERE id = p_pharmacy_id
          AND is_verified = true
          AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2. ADMINISTRATIVE VERIFICATION PROCEDURES (PLATFORM ADMIN ONLY)
-- ----------------------------------------------------------------------------

-- Admin procedure to approve, reject or suspend a medical doctor account
CREATE OR REPLACE FUNCTION verify_doctor_account(
    p_doctor_id UUID,
    p_status doctor_verification_status,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_role app_role;
BEGIN
    -- Verify caller is platform_admin
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
    IF v_admin_role IS DISTINCT FROM 'platform_admin' AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Action interdite : privilèges administrateur plateforme requis.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.doctor_profiles
    SET verification_status = p_status,
        verified_at = CASE WHEN p_status = 'verified' THEN now() ELSE NULL END,
        verified_by = CASE WHEN p_status = 'verified' THEN auth.uid() ELSE NULL END,
        updated_at = now()
    WHERE profile_id = p_doctor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profil médecin introuvable (ID: %)', p_doctor_id USING ERRCODE = 'P0002';
    END IF;

    -- Notification to the doctor
    INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
    VALUES (
        p_doctor_id,
        'Mise à jour du statut d''agrément',
        'Votre compte professionnel CareLink a été mis à jour : statut = ' || p_status::TEXT,
        'system',
        jsonb_build_object('doctor_id', p_doctor_id, 'status', p_status, 'notes', p_notes)
    );

    -- Audit log
    PERFORM record_audit_log(
        auth.uid(),
        'UPDATE_DOCTOR_STATUS',
        'doctor_profiles',
        p_doctor_id::TEXT,
        NULL,
        jsonb_build_object('status', p_status, 'notes', p_notes)
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin procedure to approve or deactivate a pharmacy
CREATE OR REPLACE FUNCTION verify_pharmacy_account(
    p_pharmacy_id UUID,
    p_is_verified BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_role app_role;
    v_staff_id UUID;
BEGIN
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
    IF v_admin_role IS DISTINCT FROM 'platform_admin' AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Action interdite : privilèges administrateur plateforme requis.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.pharmacies
    SET is_verified = p_is_verified,
        updated_at = now()
    WHERE id = p_pharmacy_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pharmacie introuvable (ID: %)', p_pharmacy_id USING ERRCODE = 'P0002';
    END IF;

    -- Notify pharmacy staff members
    FOR v_staff_id IN
        SELECT profile_id FROM public.pharmacy_staff
        WHERE pharmacy_id = p_pharmacy_id AND is_active = true
    LOOP
        INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
        VALUES (
            v_staff_id,
            'Agrément de votre pharmacie',
            CASE WHEN p_is_verified THEN 'Votre officine est officiellement vérifiée et active sur le marketplace.'
                 ELSE 'Le statut de votre officine a été suspendu ou invalidé.' END,
            'system',
            jsonb_build_object('pharmacy_id', p_pharmacy_id, 'is_verified', p_is_verified)
        );
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. MARKETPLACE MULTI-OFFICINAL: MOTEUR DE RECHERCHE GÉODÉSIQUE
-- ----------------------------------------------------------------------------

-- Searches products across multiple pharmacies simultaneously, calculating distance,
-- checking real physical stock, and sorting without exposing confidential pharmacy data.
CREATE OR REPLACE FUNCTION search_marketplace(
    p_query TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL,
    p_max_distance_km NUMERIC DEFAULT NULL,
    p_in_stock_only BOOLEAN DEFAULT true,
    p_sort_by TEXT DEFAULT 'distance', -- 'distance', 'price_asc', 'price_desc', 'name', 'stock_desc'
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    brand TEXT,
    generic_name TEXT,
    form TEXT,
    dosage TEXT,
    description TEXT,
    price NUMERIC,
    currency TEXT,
    image_url TEXT,
    is_prescription_required BOOLEAN,
    category_id UUID,
    category_name TEXT,
    pharmacy_id UUID,
    pharmacy_name TEXT,
    pharmacy_address TEXT,
    pharmacy_district TEXT,
    pharmacy_city TEXT,
    pharmacy_phone TEXT,
    pharmacy_latitude NUMERIC,
    pharmacy_longitude NUMERIC,
    is_duty_pharmacy BOOLEAN,
    current_stock INTEGER,
    distance_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.brand,
        p.generic_name,
        p.form,
        p.dosage,
        p.description,
        p.price,
        p.currency,
        p.image_url,
        p.is_prescription_required,
        p.category_id,
        c.name AS category_name,
        ph.id AS pharmacy_id,
        ph.name AS pharmacy_name,
        ph.address AS pharmacy_address,
        ph.district AS pharmacy_district,
        ph.city AS pharmacy_city,
        ph.phone AS pharmacy_phone,
        ph.latitude AS pharmacy_latitude,
        ph.longitude AS pharmacy_longitude,
        ph.is_duty_pharmacy,
        COALESCE(ps.current_quantity, 0) AS current_stock,
        CASE 
            WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND ph.latitude IS NOT NULL AND ph.longitude IS NOT NULL
            THEN calculate_distance_km(p_latitude, p_longitude, ph.latitude, ph.longitude)
            ELSE NULL
        END AS distance_km
    FROM public.products p
    JOIN public.pharmacies ph ON ph.id = p.pharmacy_id
    LEFT JOIN public.product_stocks ps ON ps.product_id = p.id
    LEFT JOIN public.product_categories c ON c.id = p.category_id
    WHERE p.is_active = true
      AND ph.is_active = true
      AND ph.is_verified = true
      AND (
          p_query IS NULL 
          OR p.name ILIKE '%' || p_query || '%'
          OR p.generic_name ILIKE '%' || p_query || '%'
          OR p.brand ILIKE '%' || p_query || '%'
      )
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (NOT p_in_stock_only OR COALESCE(ps.current_quantity, 0) > 0)
      AND (
          p_max_distance_km IS NULL 
          OR p_latitude IS NULL 
          OR p_longitude IS NULL 
          OR calculate_distance_km(p_latitude, p_longitude, ph.latitude, ph.longitude) <= p_max_distance_km
      )
    ORDER BY
        CASE WHEN p_sort_by = 'distance' AND p_latitude IS NOT NULL AND p_longitude IS NOT NULL 
             THEN calculate_distance_km(p_latitude, p_longitude, ph.latitude, ph.longitude) END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'price_asc' THEN p.price END ASC,
        CASE WHEN p_sort_by = 'price_desc' THEN p.price END DESC,
        CASE WHEN p_sort_by = 'name' THEN p.name END ASC,
        CASE WHEN p_sort_by = 'stock_desc' THEN COALESCE(ps.current_quantity, 0) END DESC,
        p.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 4. PASSAGE DE COMMANDE ATOMIQUE & DÉCOUPAGE MULTI-OFFICINES
-- ----------------------------------------------------------------------------

-- Transactionally converts a patient's cart into a master order, applies strict pessimistic
-- row locks to prevent negative inventory, evaluates health insurance coverage, partitions
-- into pharmacy-specific fulfillments, emits notifications, and empties the cart.
CREATE OR REPLACE FUNCTION checkout_cart_atomic(
    p_patient_id UUID,
    p_delivery_mode delivery_mode_type,
    p_delivery_address TEXT DEFAULT NULL,
    p_delivery_city TEXT DEFAULT NULL,
    p_delivery_latitude NUMERIC DEFAULT NULL,
    p_delivery_longitude NUMERIC DEFAULT NULL,
    p_patient_insurance_id UUID DEFAULT NULL,
    p_patient_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cart_id UUID;
    v_item RECORD;
    v_order_id UUID;
    v_order_number TEXT;
    v_total_amount NUMERIC(12, 2) := 0.00;
    v_insurance_amount NUMERIC(12, 2) := 0.00;
    v_patient_amount NUMERIC(12, 2) := 0.00;
    v_coverage_rate NUMERIC(5, 2) := 0.00;
    v_item_insurance_part NUMERIC(12, 2);
    v_pharmacy_rec RECORD;
    v_fulfillment_id UUID;
    v_fulfillment_number TEXT;
    v_fulfillment_subtotal NUMERIC(12, 2);
    v_cur_stock INTEGER;
    v_prod_name TEXT;
    v_staff_id UUID;
    v_insurance_valid BOOLEAN := false;
BEGIN
    -- 1. Security Check: caller must be the patient or service_role
    IF auth.uid() != p_patient_id AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Action interdite : vous ne pouvez valider que votre propre panier.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Locate Cart
    SELECT id INTO v_cart_id FROM public.carts WHERE patient_id = p_patient_id;
    IF v_cart_id IS NULL THEN
        RAISE EXCEPTION 'Panier introuvable pour ce patient.' USING ERRCODE = 'P0002';
    END IF;

    -- Ensure cart is not empty
    IF NOT EXISTS (SELECT 1 FROM public.cart_items WHERE cart_id = v_cart_id) THEN
        RAISE EXCEPTION 'Le panier est vide. Impossible de passer commande.' USING ERRCODE = '22000';
    END IF;

    -- 3. Insurance Verification (if provided)
    IF p_patient_insurance_id IS NOT NULL THEN
        SELECT coverage_rate_default, 
               (is_verified = true AND valid_from <= CURRENT_DATE AND valid_until >= CURRENT_DATE)
        INTO v_coverage_rate, v_insurance_valid
        FROM public.patient_insurances
        WHERE id = p_patient_insurance_id AND patient_id = p_patient_id;

        IF NOT FOUND OR NOT v_insurance_valid THEN
            v_coverage_rate := 0.00;
            p_patient_insurance_id := NULL; -- Invalid or expired insurance ignored
        END IF;
    END IF;

    -- 4. PESSIMISTIC STOCK LOCKING (FOR UPDATE) in sorted order of product_id to prevent deadlocks
    FOR v_item IN
        SELECT ci.id AS cart_item_id, ci.product_id, ci.quantity, ci.pharmacy_id,
               p.name AS product_name, p.price AS current_price, p.category_id
        FROM public.cart_items ci
        JOIN public.products p ON p.id = ci.product_id
        WHERE ci.cart_id = v_cart_id
        ORDER BY ci.product_id ASC
    LOOP
        -- Lock product_stock row
        SELECT ps.current_quantity, p.name
        INTO v_cur_stock, v_prod_name
        FROM public.product_stocks ps
        JOIN public.products p ON p.id = ps.product_id
        WHERE ps.product_id = v_item.product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Fiche stock introuvable pour le produit "%s".', v_item.product_name
                USING ERRCODE = 'P0002';
        END IF;

        -- Hard assertion: stock must never become negative
        IF v_cur_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Rupture de stock pour "%s" : demandé %s, disponible en officine %s.',
                v_prod_name, v_item.quantity, v_cur_stock
                USING ERRCODE = 'P0001';
        END IF;

        -- Accumulate total using authentic database price (anti-tamper)
        v_total_amount := v_total_amount + (v_item.current_price * v_item.quantity);

        -- Apply insurance coverage logic per product category if insurance active
        IF p_patient_insurance_id IS NOT NULL AND v_coverage_rate > 0 THEN
            v_item_insurance_part := round((v_item.current_price * v_item.quantity * (v_coverage_rate / 100.0)), 2);
            v_insurance_amount := v_insurance_amount + v_item_insurance_part;
        END IF;
    END LOOP;

    v_patient_amount := GREATEST(0.00, v_total_amount - v_insurance_amount);

    -- 5. Insert Master Order
    v_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));

    INSERT INTO public.orders (
        patient_id,
        order_number,
        status,
        total_amount,
        insurance_amount,
        patient_amount,
        currency,
        payment_status,
        delivery_mode,
        delivery_address,
        delivery_city,
        delivery_latitude,
        delivery_longitude,
        patient_notes
    )
    VALUES (
        p_patient_id,
        v_order_number,
        'pending',
        v_total_amount,
        v_insurance_amount,
        v_patient_amount,
        'XOF',
        'pending',
        p_delivery_mode,
        p_delivery_address,
        p_delivery_city,
        p_delivery_latitude,
        p_delivery_longitude,
        p_patient_notes
    )
    RETURNING id INTO v_order_id;

    -- 6. If insurance used, create an insurance_claim record automatically
    IF p_patient_insurance_id IS NOT NULL AND v_insurance_amount > 0 THEN
        INSERT INTO public.insurance_claims (
            patient_insurance_id,
            order_id,
            claimed_amount,
            patient_copay_amount,
            status
        )
        VALUES (
            p_patient_insurance_id,
            v_order_id,
            v_insurance_amount,
            v_patient_amount,
            'submitted'
        );
    END IF;

    -- 7. Partition items into Order Fulfillments by Pharmacy
    FOR v_pharmacy_rec IN
        SELECT DISTINCT pharmacy_id
        FROM public.cart_items
        WHERE cart_id = v_cart_id
    LOOP
        -- Calculate subtotal for this pharmacy
        SELECT SUM(p.price * ci.quantity) INTO v_fulfillment_subtotal
        FROM public.cart_items ci
        JOIN public.products p ON p.id = ci.product_id
        WHERE ci.cart_id = v_cart_id AND ci.pharmacy_id = v_pharmacy_rec.pharmacy_id;

        v_fulfillment_number := 'FUL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(encode(gen_random_bytes(3), 'hex') from 1 for 6));

        INSERT INTO public.order_fulfillments (
            order_id,
            pharmacy_id,
            fulfillment_number,
            subtotal_amount,
            status
        )
        VALUES (
            v_order_id,
            v_pharmacy_rec.pharmacy_id,
            v_fulfillment_number,
            v_fulfillment_subtotal,
            'pending'
        )
        RETURNING id INTO v_fulfillment_id;

        -- Insert order_items and decrement stock with immutable movement audit
        FOR v_item IN
            SELECT ci.product_id, ci.quantity, p.name AS product_name, p.price AS current_price
            FROM public.cart_items ci
            JOIN public.products p ON p.id = ci.product_id
            WHERE ci.cart_id = v_cart_id AND ci.pharmacy_id = v_pharmacy_rec.pharmacy_id
        LOOP
            INSERT INTO public.order_items (
                order_fulfillment_id,
                product_id,
                product_name,
                quantity,
                unit_price,
                total_price
            )
            VALUES (
                v_fulfillment_id,
                v_item.product_id,
                v_item.product_name,
                v_item.quantity,
                v_item.current_price,
                v_item.current_price * v_item.quantity
            );

            -- Stock decrement
            UPDATE public.product_stocks
            SET current_quantity = current_quantity - v_item.quantity,
                updated_at = now()
            WHERE product_id = v_item.product_id;

            -- Immutable stock audit ledger
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
                v_item.product_id,
                v_pharmacy_rec.pharmacy_id,
                'sale',
                -v_item.quantity,
                v_cur_stock,
                v_cur_stock - v_item.quantity,
                'order',
                v_order_id::TEXT,
                'Décrémentation atomique pour commande ' || v_order_number,
                auth.uid()
            );
        END LOOP;

        -- Notify pharmacy staff members
        FOR v_staff_id IN
            SELECT profile_id FROM public.pharmacy_staff
            WHERE pharmacy_id = v_pharmacy_rec.pharmacy_id AND is_active = true
        LOOP
            INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
            VALUES (
                v_staff_id,
                'Nouvelle commande reçue !',
                'Une nouvelle sous-commande (' || v_fulfillment_number || ') d''un montant de ' || v_fulfillment_subtotal::TEXT || ' FCFA est à préparer.',
                'order',
                jsonb_build_object('order_id', v_order_id, 'fulfillment_id', v_fulfillment_id, 'pharmacy_id', v_pharmacy_rec.pharmacy_id)
            );
        END LOOP;
    END LOOP;

    -- 8. Empty the patient's cart
    DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

    -- 9. Notify Patient
    INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
    VALUES (
        p_patient_id,
        'Commande confirmée !',
        'Votre commande n° ' || v_order_number || ' a été enregistrée avec succès. Montant total : ' || v_total_amount::TEXT || ' FCFA.',
        'order',
        jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number)
    );

    -- 10. Record Audit Log
    PERFORM record_audit_log(
        auth.uid(),
        'ORDER_CHECKOUT',
        'orders',
        v_order_id::TEXT,
        NULL,
        jsonb_build_object(
            'order_number', v_order_number,
            'total_amount', v_total_amount,
            'insurance_amount', v_insurance_amount,
            'patient_amount', v_patient_amount
        )
    );

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total_amount,
        'insurance_amount', v_insurance_amount,
        'patient_amount', v_patient_amount,
        'status', 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. ORDONNANCES: TRAITEMENT OFFICINAL DU TRANSFERT VOLONTAIRE
-- ----------------------------------------------------------------------------

-- Enables a pharmacy staff member to accept, dispense, or reject a transferred prescription
CREATE OR REPLACE FUNCTION respond_to_prescription_transfer(
    p_transfer_id UUID,
    p_status transfer_status_type,
    p_response_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_pharmacy_id UUID;
    v_patient_id UUID;
    v_rx_code TEXT;
    v_rx_id UUID;
BEGIN
    SELECT ppt.pharmacy_id, ppt.patient_id, p.prescription_code, p.id
    INTO v_pharmacy_id, v_patient_id, v_rx_code, v_rx_id
    FROM public.prescription_pharmacy_transfers ppt
    JOIN public.prescriptions p ON p.id = ppt.prescription_id
    WHERE ppt.id = p_transfer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Demande de transfert d''ordonnance introuvable.' USING ERRCODE = 'P0002';
    END IF;

    -- Security check: caller must belong to the destination pharmacy staff
    IF NOT is_pharmacy_staff_member(v_pharmacy_id) AND current_user_role() != 'platform_admin' THEN
        RAISE EXCEPTION 'Action interdite : vous ne faites pas partie du personnel de cette pharmacie.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.prescription_pharmacy_transfers
    SET status = p_status,
        pharmacy_response_notes = p_response_notes,
        responded_at = now(),
        responded_by = auth.uid(),
        completed_at = CASE WHEN p_status IN ('completed', 'dispensing') THEN now() ELSE completed_at END,
        updated_at = now()
    WHERE id = p_transfer_id;

    -- If prescription is completely dispensed, update prescriptions.status
    IF p_status = 'completed' THEN
        UPDATE public.prescriptions
        SET status = 'dispensed',
            updated_at = now()
        WHERE id = v_rx_id;
    END IF;

    -- Notify Patient in Real-Time
    INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
    VALUES (
        v_patient_id,
        'Mise à jour pour votre ordonnance ' || v_rx_code,
        CASE 
            WHEN p_status = 'accepted' THEN 'La pharmacie a accepté votre ordonnance et prépare la délivrance.'
            WHEN p_status = 'rejected' THEN 'La pharmacie n''a pas pu accepter votre ordonnance : ' || COALESCE(p_response_notes, 'Indisponibilité.')
            WHEN p_status = 'completed' THEN 'Votre ordonnance a été entièrement délivrée par la pharmacie.'
            ELSE 'Le statut de votre ordonnance est : ' || p_status::TEXT
        END,
        'prescription',
        jsonb_build_object('transfer_id', p_transfer_id, 'prescription_id', v_rx_id, 'status', p_status)
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 6. TRANSFERT CONFRATERNEL DE DOSSIER MÉDICAL (MÉDECIN A -> MÉDECIN B)
-- ----------------------------------------------------------------------------

-- Doctor A initiates a transfer request to Doctor B with clinical motivation
CREATE OR REPLACE FUNCTION initiate_dossier_transfer(
    p_dossier_id UUID,
    p_to_doctor_id UUID,
    p_reason TEXT,
    p_clinical_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_patient_id UUID;
    v_transfer_id UUID;
    v_from_doc_name TEXT;
BEGIN
    -- Check caller is verified doctor
    IF NOT is_verified_doctor(auth.uid()) AND current_user_role() != 'platform_admin' THEN
        RAISE EXCEPTION 'Action interdite : seuls les médecins agréés peuvent initier un transfert de dossier.'
            USING ERRCODE = '42501';
    END IF;

    -- Verify target doctor is also verified
    IF NOT is_verified_doctor(p_to_doctor_id) THEN
        RAISE EXCEPTION 'Le confrère destinataire n''est pas un médecin vérifié sur la plateforme.'
            USING ERRCODE = 'P0003';
    END IF;

    -- Retrieve patient ID
    SELECT patient_id INTO v_patient_id FROM public.medical_dossiers WHERE id = p_dossier_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dossier médical introuvable.' USING ERRCODE = 'P0002';
    END IF;

    -- Verify caller has active access to this patient's dossier
    IF NOT has_active_patient_access(v_patient_id) AND current_user_role() != 'platform_admin' THEN
        RAISE EXCEPTION 'Action interdite : vous n''avez pas d''accès actif sur ce dossier médical.'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.dossier_transfers (
        dossier_id,
        patient_id,
        from_doctor_id,
        to_doctor_id,
        transfer_reason,
        clinical_summary,
        status,
        requested_at
    )
    VALUES (
        p_dossier_id,
        v_patient_id,
        auth.uid(),
        p_to_doctor_id,
        p_reason,
        p_clinical_summary,
        'pending',
        now()
    )
    RETURNING id INTO v_transfer_id;

    -- Get requesting doctor's name
    SELECT 'Dr. ' || first_name || ' ' || last_name INTO v_from_doc_name
    FROM public.profiles WHERE id = auth.uid();

    -- Notify target Doctor B
    INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
    VALUES (
        p_to_doctor_id,
        'Demande de transfert confraternel de dossier',
        COALESCE(v_from_doc_name, 'Un confrère') || ' vous propose le transfert d''un dossier médical pour avis / prise en charge.',
        'access_request',
        jsonb_build_object('transfer_id', v_transfer_id, 'dossier_id', p_dossier_id)
    );

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Doctor B responds to the dossier transfer. Upon acceptance, access is automatically granted
CREATE OR REPLACE FUNCTION respond_to_dossier_transfer(
    p_transfer_id UUID,
    p_accept BOOLEAN,
    p_response_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_transfer RECORD;
BEGIN
    SELECT * INTO v_transfer FROM public.dossier_transfers WHERE id = p_transfer_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Demande de transfert introuvable.' USING ERRCODE = 'P0002';
    END IF;

    -- Security: only Doctor B (recipient) can respond
    IF v_transfer.to_doctor_id != auth.uid() AND current_user_role() != 'platform_admin' THEN
        RAISE EXCEPTION 'Action interdite : seul le confrère destinataire peut répondre à cette demande.'
            USING ERRCODE = '42501';
    END IF;

    IF v_transfer.status != 'pending' THEN
        RAISE EXCEPTION 'Ce transfert a déjà été traité (statut : %)', v_transfer.status USING ERRCODE = 'P0004';
    END IF;

    IF p_accept THEN
        -- Mark as accepted
        UPDATE public.dossier_transfers
        SET status = 'accepted',
            responded_at = now(),
            response_notes = p_response_notes,
            updated_at = now()
        WHERE id = p_transfer_id;

        -- Automatically grant Doctor B active access to the patient's medical dossier
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
            v_transfer.to_doctor_id,
            v_transfer.patient_id,
            v_transfer.patient_id,
            'Transfert confraternel accepté : ' || v_transfer.transfer_reason,
            'read_write',
            'active',
            now() + INTERVAL '90 days'
        )
        ON CONFLICT (doctor_id, patient_id) DO UPDATE
        SET status = 'active',
            expires_at = GREATEST(doctor_patient_access.expires_at, now() + INTERVAL '90 days'),
            revoked_at = NULL;

        -- Notify Doctor A
        INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
        VALUES (
            v_transfer.from_doctor_id,
            'Transfert de dossier accepté',
            'Votre confrère a accepté le transfert de dossier.',
            'access_request',
            jsonb_build_object('transfer_id', p_transfer_id, 'patient_id', v_transfer.patient_id)
        );

        -- Notify Patient
        INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
        VALUES (
            v_transfer.patient_id,
            'Partage de votre dossier médical',
            'Votre dossier médical a été partagé avec un confrère pour le suivi de vos soins.',
            'access_request',
            jsonb_build_object('doctor_id', v_transfer.to_doctor_id)
        );
    ELSE
        -- Mark as rejected
        UPDATE public.dossier_transfers
        SET status = 'rejected',
            responded_at = now(),
            response_notes = p_response_notes,
            updated_at = now()
        WHERE id = p_transfer_id;

        -- Notify Doctor A
        INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
        VALUES (
            v_transfer.from_doctor_id,
            'Transfert de dossier décliné',
            'Votre confrère n''a pas pu accepter le transfert de dossier : ' || COALESCE(p_response_notes, 'Pas de motif spécifié.'),
            'access_request',
            jsonb_build_object('transfer_id', p_transfer_id)
        );
    END IF;

    -- Audit log
    PERFORM record_audit_log(
        auth.uid(),
        CASE WHEN p_accept THEN 'DOSSIER_TRANSFER_ACCEPTED' ELSE 'DOSSIER_TRANSFER_REJECTED' END,
        'dossier_transfers',
        p_transfer_id::TEXT,
        NULL,
        jsonb_build_object('accept', p_accept, 'notes', p_response_notes)
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 7. CLÔTURE DE CONSULTATION & ÉMISSION D'ORDONNANCE ATOMIQUE
-- ----------------------------------------------------------------------------

-- Complete a consultation note and optionally issue a signed digital prescription atomically
CREATE OR REPLACE FUNCTION complete_consultation_and_issue_prescription(
    p_consultation_id UUID,
    p_diagnosis TEXT,
    p_clinical_notes TEXT,
    p_treatment_plan TEXT,
    p_prescription_items JSONB DEFAULT NULL, -- Array of items: [{"medication_name": "...", "dosage": "...", "form": "...", "quantity": 2, "frequency": "...", "duration_days": 7}]
    p_prescription_instructions TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cons RECORD;
    v_rx_id UUID;
    v_item JSONB;
    v_rx_code TEXT;
BEGIN
    SELECT * INTO v_cons FROM public.consultations WHERE id = p_consultation_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consultation introuvable.' USING ERRCODE = 'P0002';
    END IF;

    -- Security: caller must be the doctor of this consultation
    IF v_cons.doctor_id != auth.uid() AND current_user_role() != 'platform_admin' THEN
        RAISE EXCEPTION 'Action interdite : vous n''êtes pas le praticien traitant de cette consultation.'
            USING ERRCODE = '42501';
    END IF;

    -- Assert doctor is verified
    IF NOT is_verified_doctor(auth.uid()) AND current_user_role() != 'platform_admin' THEN
        RAISE EXCEPTION 'Action interdite : votre compte praticien n''est pas encore agréé.'
            USING ERRCODE = '42501';
    END IF;

    -- 1. Complete consultation record
    UPDATE public.consultations
    SET diagnosis = p_diagnosis,
        clinical_notes = p_clinical_notes,
        treatment_plan = p_treatment_plan,
        status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE id = p_consultation_id;

    -- Also update parent appointment if linked
    IF v_cons.appointment_id IS NOT NULL THEN
        UPDATE public.appointments
        SET status = 'completed',
            updated_at = now()
        WHERE id = v_cons.appointment_id;
    END IF;

    -- 2. Insert into medical_record_entries
    INSERT INTO public.medical_record_entries (
        dossier_id,
        doctor_id,
        entry_type,
        title,
        content
    )
    SELECT md.id, auth.uid(), 'consultation_note', 'Compte-rendu de consultation',
           'Diagnostic: ' || COALESCE(p_diagnosis, 'N/A') || E'\n\nObservations: ' || COALESCE(p_clinical_notes, 'N/A') || E'\n\nPlan: ' || COALESCE(p_treatment_plan, 'N/A')
    FROM public.medical_dossiers md
    WHERE md.patient_id = v_cons.patient_id;

    -- 3. Optionally create prescription
    IF p_prescription_items IS NOT NULL AND jsonb_array_length(p_prescription_items) > 0 THEN
        v_rx_code := 'RX-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));

        INSERT INTO public.prescriptions (
            consultation_id,
            doctor_id,
            patient_id,
            prescription_code,
            status,
            general_instructions,
            is_digitally_signed,
            signed_at,
            valid_until
        )
        VALUES (
            p_consultation_id,
            auth.uid(),
            v_cons.patient_id,
            v_rx_code,
            'active',
            p_prescription_instructions,
            true,
            now(),
            now() + INTERVAL '3 months'
        )
        RETURNING id INTO v_rx_id;

        -- Insert line items
        FOR v_item IN SELECT value FROM jsonb_array_elements(p_prescription_items)
        LOOP
            INSERT INTO public.prescription_items (
                prescription_id,
                medication_name,
                dosage,
                form,
                quantity,
                frequency,
                duration_days,
                instructions
            )
            VALUES (
                v_rx_id,
                v_item->>'medication_name',
                COALESCE(v_item->>'dosage', 'Standard'),
                COALESCE(v_item->>'form', 'Comprimé'),
                COALESCE((v_item->>'quantity')::INTEGER, 1),
                COALESCE(v_item->>'frequency', 'Selon avis médical'),
                COALESCE((v_item->>'duration_days')::INTEGER, 7),
                v_item->>'instructions'
            );
        END LOOP;

        -- Notify Patient
        INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
        VALUES (
            v_cons.patient_id,
            'Nouvelle ordonnance disponible',
            'Votre praticien a émis une ordonnance électronique (Code : ' || v_rx_code || '). Vous pouvez la transférer vers l''officine de votre choix.',
            'prescription',
            jsonb_build_object('prescription_id', v_rx_id, 'prescription_code', v_rx_code)
        );
    END IF;

    -- Audit log
    PERFORM record_audit_log(
        auth.uid(),
        'COMPLETE_CONSULTATION',
        'consultations',
        p_consultation_id::TEXT,
        NULL,
        jsonb_build_object('prescription_id', v_rx_id, 'status', 'completed')
    );

    RETURN jsonb_build_object(
        'consultation_id', p_consultation_id,
        'prescription_id', v_rx_id,
        'prescription_code', v_rx_code,
        'status', 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 8. DURCISSEMENT DES POLITIQUES RLS
-- ----------------------------------------------------------------------------

-- Drop previously loose policies on doctor slots and prescriptions
DROP POLICY IF EXISTS "Doctors manage own slots" ON doctor_slots;
DROP POLICY IF EXISTS "Doctors create prescriptions" ON prescriptions;

-- New hardened policies checking verified doctor status
CREATE POLICY "Verified doctors manage own slots"
ON doctor_slots FOR ALL TO authenticated
USING (
    (doctor_id = auth.uid() AND is_verified_doctor(auth.uid())) 
    OR current_user_role() = 'platform_admin'
)
WITH CHECK (
    (doctor_id = auth.uid() AND is_verified_doctor(auth.uid())) 
    OR current_user_role() = 'platform_admin'
);

CREATE POLICY "Verified doctors create prescriptions"
ON prescriptions FOR INSERT TO authenticated
WITH CHECK (
    doctor_id = auth.uid() 
    AND is_verified_doctor(auth.uid())
    AND has_active_patient_access(patient_id)
);

-- Pharmacy Staff can view insurance claims linked to their orders
CREATE POLICY "Pharmacy staff view related claims"
ON insurance_claims FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM order_fulfillments ofl
        WHERE ofl.order_id = insurance_claims.order_id
          AND is_pharmacy_staff_member(ofl.pharmacy_id)
    )
);

-- Pharmacy Staff can view payments linked to their fulfillments
CREATE POLICY "Pharmacy staff view related payments"
ON payments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM order_fulfillments ofl
        WHERE ofl.order_id = payments.order_id
          AND is_pharmacy_staff_member(ofl.pharmacy_id)
    )
);
