-- ============================================================================
-- Migration: 20260907000014_seed_data.sql
-- Description: Standard reference data (Categories, insurance providers, initial taxonomy)
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. REFERENCE PRODUCT CATEGORIES
INSERT INTO public.product_categories (id, name, slug, description)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Antalgiques & Antipyrétiques', 'antalgiques-antipyretiques', 'Traitements de la douleur et de la fièvre (Paracétamol, Ibuprofène, etc.)'),
    ('c2222222-2222-2222-2222-222222222222', 'Antibiotiques & Antibactériens', 'antibiotiques', 'Médicaments antibactériens sous ordonnance'),
    ('c3333333-3333-3333-3333-333333333333', 'Anti-inflammatoires', 'anti-inflammatoires', 'Anti-inflammatoires stéroïdiens et non stéroïdiens'),
    ('c4444444-4444-4444-4444-444444444444', 'Cardiologie & Hypertension', 'cardiologie-hypertension', 'Traitements de l''hypertension artérielle et pathologies cardiaques'),
    ('c5555555-5555-5555-5555-555555555555', 'Gastro-entérologie', 'gastro-enterologie', 'Pansements gastriques, antidiarrhéiques, antispasmodiques'),
    ('c6666666-6666-6666-6666-666666666666', 'Vitamines & Compléments', 'vitamines-complements', 'Minéraux, compléments alimentaires, oligo-éléments'),
    ('c7777777-7777-7777-7777-777777777777', 'Premiers secours & Soins', 'premiers-secours', 'Pansements, désinfectants, compresses stériles'),
    ('c8888888-8888-8888-8888-888888888888', 'Mère & Enfant', 'mere-enfant', 'Pédiatrie, laits infantiles, soins pour bébés et mamans')
ON CONFLICT (slug) DO NOTHING;

-- 2. REFERENCE INSURANCE PROVIDERS (Tiers-Payant Afrique de l'Ouest)
INSERT INTO public.insurance_providers (id, name, code, contact_phone, contact_email)
VALUES
    ('i1111111-1111-1111-1111-111111111111', 'SUNU Assurances', 'SUNU', '+228 22 21 10 33', 'contact.togo@sunu-group.com'),
    ('i2222222-2222-2222-2222-222222222222', 'NSIA Assurances', 'NSIA', '+228 22 23 20 00', 'contact@groupensia.com'),
    ('i3333333-3333-3333-3333-333333333333', 'ASCOMA Courtage', 'ASCOMA', '+228 22 21 34 50', 'info.togo@ascoma.com'),
    ('i4444444-4444-4444-4444-444444444444', 'SANLAM Assurance', 'SANLAM', '+228 22 53 45 00', 'contact@sanlam.tg'),
    ('i5555555-5555-5555-5555-555555555555', 'OGAR Assurances', 'OGAR', '+228 22 21 68 00', 'contact@ogar.tg')
ON CONFLICT (code) DO NOTHING;
