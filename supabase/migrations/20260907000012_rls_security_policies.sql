-- ============================================================================
-- Migration: 20260907000012_rls_security_policies.sql
-- Description: Complete Row Level Security (RLS) policies for medical & commercial privacy
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS app_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_pharmacy_staff_member(p_pharmacy_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pharmacy_staff
        WHERE pharmacy_id = p_pharmacy_id
          AND profile_id = auth.uid()
          AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_active_patient_access(p_patient_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.doctor_patient_access
        WHERE doctor_id = auth.uid()
          AND patient_id = p_patient_id
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > now())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. ENABLE ROW LEVEL SECURITY ON ALL 28 TABLES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patient_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_pharmacy_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_coverages ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. PROFILES POLICIES
-- ============================================================================
CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own basic profile"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- 4. PATIENT PROFILES POLICIES
-- ============================================================================
CREATE POLICY "Patients view own profile"
ON patient_profiles FOR SELECT TO authenticated
USING (
    profile_id = auth.uid() OR
    has_active_patient_access(profile_id) OR
    current_user_role() = 'platform_admin'
);

CREATE POLICY "Patients update own profile"
ON patient_profiles FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Patients insert own profile"
ON patient_profiles FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

-- ============================================================================
-- 5. DOCTOR PROFILES POLICIES
-- ============================================================================
CREATE POLICY "Doctor profiles viewable by all authenticated"
ON doctor_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Doctors manage own profile"
ON doctor_profiles FOR ALL TO authenticated
USING (profile_id = auth.uid() OR current_user_role() = 'platform_admin')
WITH CHECK (profile_id = auth.uid() OR current_user_role() = 'platform_admin');

-- ============================================================================
-- 6. PHARMACIES & STAFF POLICIES
-- ============================================================================
CREATE POLICY "Active pharmacies are public to view"
ON pharmacies FOR SELECT TO authenticated
USING (is_active = true OR is_pharmacy_staff_member(id) OR current_user_role() = 'platform_admin');

CREATE POLICY "Pharmacy staff can update own pharmacy"
ON pharmacies FOR UPDATE TO authenticated
USING (is_pharmacy_staff_member(id) OR current_user_role() = 'platform_admin');

CREATE POLICY "Staff list viewable by affiliated staff and admin"
ON pharmacy_staff FOR SELECT TO authenticated
USING (is_pharmacy_staff_member(pharmacy_id) OR profile_id = auth.uid() OR current_user_role() = 'platform_admin');

-- ============================================================================
-- 7. MEDICAL DOSSIERS & ENTRIES (STRICT HEALTH PRIVACY)
-- ============================================================================
CREATE POLICY "Patient views own medical dossier"
ON medical_dossiers FOR SELECT TO authenticated
USING (
    patient_id = auth.uid() OR
    has_active_patient_access(patient_id) OR
    current_user_role() = 'platform_admin'
);

CREATE POLICY "Patient or authorized doctor updates dossier"
ON medical_dossiers FOR UPDATE TO authenticated
USING (
    patient_id = auth.uid() OR
    has_active_patient_access(patient_id) OR
    current_user_role() = 'platform_admin'
);

CREATE POLICY "View medical record entries"
ON medical_record_entries FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM medical_dossiers md
        WHERE md.id = medical_record_entries.dossier_id
          AND (md.patient_id = auth.uid() OR has_active_patient_access(md.patient_id))
    ) OR current_user_role() = 'platform_admin'
);

CREATE POLICY "Authorized doctor inserts medical record entries"
ON medical_record_entries FOR INSERT TO authenticated
WITH CHECK (
    doctor_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM medical_dossiers md
        WHERE md.id = medical_record_entries.dossier_id
          AND has_active_patient_access(md.patient_id)
    )
);

-- Access delegation table policies
CREATE POLICY "View doctor patient access"
ON doctor_patient_access FOR SELECT TO authenticated
USING (doctor_id = auth.uid() OR patient_id = auth.uid() OR current_user_role() = 'platform_admin');

CREATE POLICY "Patient manages doctor access"
ON doctor_patient_access FOR ALL TO authenticated
USING (patient_id = auth.uid() OR current_user_role() = 'platform_admin');

-- Dossier transfers policies
CREATE POLICY "View dossier transfers"
ON dossier_transfers FOR SELECT TO authenticated
USING (from_doctor_id = auth.uid() OR to_doctor_id = auth.uid() OR patient_id = auth.uid());

CREATE POLICY "Doctors manage dossier transfers"
ON dossier_transfers FOR ALL TO authenticated
USING (from_doctor_id = auth.uid() OR to_doctor_id = auth.uid());

-- ============================================================================
-- 8. SLOTS, APPOINTMENTS & CONSULTATIONS
-- ============================================================================
CREATE POLICY "Slots are viewable by all authenticated users"
ON doctor_slots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Doctors manage own slots"
ON doctor_slots FOR ALL TO authenticated
USING (doctor_id = auth.uid() OR current_user_role() = 'platform_admin');

CREATE POLICY "View appointments"
ON appointments FOR SELECT TO authenticated
USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR current_user_role() = 'platform_admin');

CREATE POLICY "Patients create appointments"
ON appointments FOR INSERT TO authenticated
WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Participants update appointments"
ON appointments FOR UPDATE TO authenticated
USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR current_user_role() = 'platform_admin');

CREATE POLICY "View consultations"
ON consultations FOR SELECT TO authenticated
USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR current_user_role() = 'platform_admin');

CREATE POLICY "Doctors manage consultations"
ON consultations FOR ALL TO authenticated
USING (doctor_id = auth.uid() OR current_user_role() = 'platform_admin');

-- ============================================================================
-- 9. PRESCRIPTIONS & TRANSFERS
-- ============================================================================
CREATE POLICY "View prescriptions"
ON prescriptions FOR SELECT TO authenticated
USING (
    patient_id = auth.uid() OR
    doctor_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM prescription_pharmacy_transfers ppt
        WHERE ppt.prescription_id = prescriptions.id
          AND is_pharmacy_staff_member(ppt.pharmacy_id)
    ) OR
    current_user_role() = 'platform_admin'
);

CREATE POLICY "Doctors create prescriptions"
ON prescriptions FOR INSERT TO authenticated
WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors update prescriptions"
ON prescriptions FOR UPDATE TO authenticated
USING (doctor_id = auth.uid() OR current_user_role() = 'platform_admin');

CREATE POLICY "View prescription items"
ON prescription_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM prescriptions p
        WHERE p.id = prescription_items.prescription_id
          AND (
            p.patient_id = auth.uid() OR
            p.doctor_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM prescription_pharmacy_transfers ppt
                WHERE ppt.prescription_id = p.id
                  AND is_pharmacy_staff_member(ppt.pharmacy_id)
            )
          )
    ) OR current_user_role() = 'platform_admin'
);

CREATE POLICY "Doctors manage prescription items"
ON prescription_items FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM prescriptions p
        WHERE p.id = prescription_items.prescription_id
          AND p.doctor_id = auth.uid()
    )
);

CREATE POLICY "View prescription transfers"
ON prescription_pharmacy_transfers FOR SELECT TO authenticated
USING (
    patient_id = auth.uid() OR
    is_pharmacy_staff_member(pharmacy_id) OR
    current_user_role() = 'platform_admin'
);

CREATE POLICY "Patients create prescription transfers"
ON prescription_pharmacy_transfers FOR INSERT TO authenticated
WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Pharmacies update prescription transfers"
ON prescription_pharmacy_transfers FOR UPDATE TO authenticated
USING (is_pharmacy_staff_member(pharmacy_id) OR current_user_role() = 'platform_admin');

-- ============================================================================
-- 10. PRODUCTS, STOCKS & MOVEMENTS (MARKETPLACE PRIVACY)
-- ============================================================================
CREATE POLICY "Active products are visible to marketplace"
ON products FOR SELECT TO authenticated
USING (is_active = true OR is_pharmacy_staff_member(pharmacy_id) OR current_user_role() = 'platform_admin');

CREATE POLICY "Pharmacies manage own products"
ON products FOR ALL TO authenticated
USING (is_pharmacy_staff_member(pharmacy_id) OR current_user_role() = 'platform_admin')
WITH CHECK (is_pharmacy_staff_member(pharmacy_id) OR current_user_role() = 'platform_admin');

-- Product categories are public in read
CREATE POLICY "Product categories are public"
ON product_categories FOR SELECT TO authenticated USING (true);

-- Product stocks: Public can see quantity for marketplace, pharmacy can manage
CREATE POLICY "Stocks viewable for availability check"
ON product_stocks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Pharmacies manage own stocks"
ON product_stocks FOR ALL TO authenticated
USING (is_pharmacy_staff_member(pharmacy_id) OR current_user_role() = 'platform_admin');

-- Stock movements: Strictly private to each pharmacy
CREATE POLICY "Stock movements strictly private to pharmacy"
ON stock_movements FOR SELECT TO authenticated
USING (is_pharmacy_staff_member(pharmacy_id) OR current_user_role() = 'platform_admin');

-- ============================================================================
-- 11. CARTS & ORDERS
-- ============================================================================
CREATE POLICY "Patients manage own cart"
ON carts FOR ALL TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients manage own cart items"
ON cart_items FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.patient_id = auth.uid())
);

CREATE POLICY "View orders"
ON orders FOR SELECT TO authenticated
USING (patient_id = auth.uid() OR current_user_role() = 'platform_admin');

CREATE POLICY "Patients create orders"
ON orders FOR INSERT TO authenticated
WITH CHECK (patient_id = auth.uid());

-- Order fulfillments: Partitioned by pharmacy
CREATE POLICY "View order fulfillments"
ON order_fulfillments FOR SELECT TO authenticated
USING (
    is_pharmacy_staff_member(pharmacy_id) OR
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_fulfillments.order_id AND orders.patient_id = auth.uid()) OR
    current_user_role() = 'platform_admin'
);

CREATE POLICY "Pharmacies update own fulfillments"
ON order_fulfillments FOR UPDATE TO authenticated
USING (is_pharmacy_staff_member(pharmacy_id) OR current_user_role() = 'platform_admin');

CREATE POLICY "View order items"
ON order_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM order_fulfillments ofl
        WHERE ofl.id = order_items.order_fulfillment_id
          AND (
            is_pharmacy_staff_member(ofl.pharmacy_id) OR
            EXISTS (SELECT 1 FROM orders o WHERE o.id = ofl.order_id AND o.patient_id = auth.uid())
          )
    ) OR current_user_role() = 'platform_admin'
);

-- ============================================================================
-- 12. INSURANCE, PAYMENTS & NOTIFICATIONS
-- ============================================================================
CREATE POLICY "Insurance providers are public"
ON insurance_providers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Patients manage own insurances"
ON patient_insurances FOR ALL TO authenticated
USING (patient_id = auth.uid() OR current_user_role() = 'platform_admin');

CREATE POLICY "Insurance coverages are public"
ON insurance_coverages FOR SELECT TO authenticated USING (true);

CREATE POLICY "View insurance claims"
ON insurance_claims FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM patient_insurances pi
        WHERE pi.id = insurance_claims.patient_insurance_id
          AND pi.patient_id = auth.uid()
    ) OR current_user_role() = 'platform_admin'
);

CREATE POLICY "View payments"
ON payments FOR SELECT TO authenticated
USING (patient_id = auth.uid() OR current_user_role() = 'platform_admin');

CREATE POLICY "Users view and manage own notifications"
ON notifications FOR ALL TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Audit logs viewable only by platform admin"
ON audit_logs FOR SELECT TO authenticated
USING (current_user_role() = 'platform_admin');
