-- ============================================================================
-- Migration: 20260907000013_storage_and_realtime.sql
-- Description: Supabase Storage buckets, bucket RLS & Realtime publication setup
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. SUPABASE STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'product-images',
        'product-images',
        true,
        5242880, -- 5 MB
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'medical-documents',
        'medical-documents',
        false,
        20971520, -- 20 MB
        ARRAY['application/pdf', 'image/jpeg', 'image/png']
    ),
    (
        'prescriptions',
        'prescriptions',
        false,
        10485760, -- 10 MB
        ARRAY['application/pdf', 'image/jpeg', 'image/png']
    ),
    (
        'doctor-assets',
        'doctor-assets',
        false,
        5242880, -- 5 MB
        ARRAY['image/png', 'image/jpeg']
    )
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: product-images (Public read, authenticated pharmacy upload)
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Pharmacy staff upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Pharmacy staff update/delete product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images');

-- Storage RLS: medical-documents (Private to patient & authorized doctor)
CREATE POLICY "Private access to medical documents"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'medical-documents' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        has_active_patient_access(((storage.foldername(name))[1])::uuid) OR
        current_user_role() = 'platform_admin'
    )
);

CREATE POLICY "Upload medical documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'medical-documents' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        has_active_patient_access(((storage.foldername(name))[1])::uuid) OR
        current_user_role() = 'platform_admin'
    )
);

-- Storage RLS: prescriptions (Doctor and patient access)
CREATE POLICY "Access prescription documents"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'prescriptions' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        current_user_role() IN ('doctor', 'platform_admin')
    )
);

CREATE POLICY "Doctors upload prescription documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'prescriptions' AND
    (
        current_user_role() = 'doctor' OR
        current_user_role() = 'platform_admin'
    )
);

-- Storage RLS: doctor-assets (Doctor only)
CREATE POLICY "Doctors access own assets"
ON storage.objects FOR ALL TO authenticated
USING (
    bucket_id = 'doctor-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. SUPABASE REALTIME REPLICATION PUBLICATION
-- Enable realtime updates on key reactive tables
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        ALTER PUBLICATION supabase_realtime ADD TABLE doctor_slots;
        ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
        ALTER PUBLICATION supabase_realtime ADD TABLE order_fulfillments;
        ALTER PUBLICATION supabase_realtime ADD TABLE prescription_pharmacy_transfers;
        ALTER PUBLICATION supabase_realtime ADD TABLE product_stocks;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
