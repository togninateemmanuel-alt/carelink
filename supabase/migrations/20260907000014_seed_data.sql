-- ============================================================================
-- Migration: 20260907000014_seed_data.sql
-- Description: Standard reference data (Categories, insurance providers,
--              sample accredited pharmacies, essential medicine catalog & stocks)
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

-- 3. REFERENCE PHARMACIES IN LOMÉ, TOGO (With authentic coordinates and contact)
INSERT INTO public.pharmacies (id, name, license_number, address, district, city, latitude, longitude, phone, email, is_duty_pharmacy, is_verified, is_active)
VALUES
    (
        'p1111111-1111-1111-1111-111111111111',
        'Pharmacie du 13 Janvier',
        'PH-TG-LOM-001',
        'Boulevard du 13 Janvier, Face Rex',
        'Centre-Ville',
        'Lomé',
        6.1287000,
        1.2158000,
        '+228 22 21 43 00',
        'contact@pharmacie13janvier.tg',
        true,
        true,
        true
    ),
    (
        'p2222222-2222-2222-2222-222222222222',
        'Pharmacie Nation',
        'PH-TG-LOM-002',
        'Boulevard Circulaire, Près de Deckon',
        'Deckon',
        'Lomé',
        6.1334000,
        1.2223000,
        '+228 22 21 28 88',
        'info@pharmacienation.tg',
        false,
        true,
        true
    ),
    (
        'p3333333-3333-3333-3333-333333333333',
        'Pharmacie Bé-Kpota',
        'PH-TG-LOM-003',
        'Avenue de la Paix, Grand Marché de Bé',
        'Bé-Kpota',
        'Lomé',
        6.1420000,
        1.2465000,
        '+228 22 27 05 12',
        'contact@pharmaciebekpota.tg',
        false,
        true,
        true
    ),
    (
        'p4444444-4444-4444-4444-444444444444',
        'Pharmacie Tokoin Hôpital',
        'PH-TG-LOM-004',
        'Face CHU Sylvanus Olympio',
        'Tokoin',
        'Lomé',
        6.1556000,
        1.2124000,
        '+228 22 21 02 11',
        'tokoin@pharmaciehopital.tg',
        true,
        true,
        true
    )
ON CONFLICT (license_number) DO NOTHING;

-- 4. REFERENCE ESSENTIAL MEDICINES CATALOG
INSERT INTO public.products (id, pharmacy_id, category_id, name, brand, generic_name, form, dosage, description, price, currency, is_prescription_required, is_active)
VALUES
    -- Pharmacie du 13 Janvier
    (
        'm1111111-1111-1111-1111-111111111111',
        'p1111111-1111-1111-1111-111111111111',
        'c1111111-1111-1111-1111-111111111111',
        'Doliprane 1000 mg',
        'Sanofi',
        'Paracétamol',
        'Comprimé effervescent',
        '1000 mg',
        'Indiqué en cas de douleur et fièvre',
        1500.00,
        'XOF',
        false,
        true
    ),
    (
        'm2222222-2222-2222-2222-222222222222',
        'p1111111-1111-1111-1111-111111111111',
        'c1111111-1111-1111-1111-111111111111',
        'Paracétamol générique 500 mg',
        'Denk Pharma',
        'Paracétamol',
        'Comprimé',
        '500 mg',
        'Antalgique et antipyrétique de première intention',
        500.00,
        'XOF',
        false,
        true
    ),
    (
        'm3333333-3333-3333-3333-333333333333',
        'p1111111-1111-1111-1111-111111111111',
        'c2222222-2222-2222-2222-222222222222',
        'Amoxicilline 500 mg',
        'Biogaran',
        'Amoxicilline',
        'Gélule',
        '500 mg',
        'Antibiotique de la famille des bêta-lactamines',
        2200.00,
        'XOF',
        true,
        true
    ),
    -- Pharmacie Nation
    (
        'm4444444-4444-4444-4444-444444444444',
        'p2222222-2222-2222-2222-222222222222',
        'c1111111-1111-1111-1111-111111111111',
        'Efferalgan 500 mg',
        'UPSA',
        'Paracétamol',
        'Comprimé effervescent',
        '500 mg',
        'Antalgique rapide contre maux de tête et états grippaux',
        1200.00,
        'XOF',
        false,
        true
    ),
    (
        'm5555555-5555-5555-5555-555555555555',
        'p2222222-2222-2222-2222-222222222222',
        'c3333333-3333-3333-3333-333333333333',
        'Ibuprofène 400 mg',
        'Mylan',
        'Ibuprofène',
        'Comprimé enrobé',
        '400 mg',
        'Anti-inflammatoire non stéroïdien (AINS)',
        1800.00,
        'XOF',
        false,
        true
    ),
    -- Pharmacie Tokoin Hôpital
    (
        'm6666666-6666-6666-6666-666666666666',
        'p4444444-4444-4444-4444-444444444444',
        'c1111111-1111-1111-1111-111111111111',
        'Paracétamol générique 500 mg',
        'Sandoz',
        'Paracétamol',
        'Comprimé',
        '500 mg',
        'Traitement symptomatique de la douleur et fièvre',
        450.00,
        'XOF',
        false,
        true
    ),
    (
        'm7777777-7777-7777-7777-777777777777',
        'p4444444-4444-4444-4444-444444444444',
        'c2222222-2222-2222-2222-222222222222',
        'Augmentin 1 g / 125 mg',
        'GSK',
        'Amoxicilline + Acide clavulanique',
        'Comprimé pelliculé',
        '1 g',
        'Antibiotique à large spectre',
        6500.00,
        'XOF',
        true,
        true
    )
ON CONFLICT (id) DO NOTHING;

-- 5. INITIAL PRODUCT STOCKS
INSERT INTO public.product_stocks (product_id, pharmacy_id, current_quantity, reserved_quantity, low_stock_threshold)
VALUES
    ('m1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 45, 0, 5),
    ('m2222222-2222-2222-2222-222222222222', 'p1111111-1111-1111-1111-111111111111', 120, 0, 10),
    ('m3333333-3333-3333-3333-333333333333', 'p1111111-1111-1111-1111-111111111111', 28, 0, 5),
    ('m4444444-4444-4444-4444-444444444444', 'p2222222-2222-2222-2222-222222222222', 60, 0, 8),
    ('m5555555-5555-5555-5555-555555555555', 'p2222222-2222-2222-2222-222222222222', 35, 0, 5),
    ('m6666666-6666-6666-6666-666666666666', 'p4444444-4444-4444-4444-444444444444', 95, 0, 10),
    ('m7777777-7777-7777-7777-777777777777', 'p4444444-4444-4444-4444-444444444444', 18, 0, 4)
ON CONFLICT (product_id) DO UPDATE
SET current_quantity = EXCLUDED.current_quantity;
