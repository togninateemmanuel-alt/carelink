-- =====================================================
-- Migration : Abonnements hôpital + clés d'activation
-- À exécuter dans le SQL Editor Supabase
-- =====================================================

-- Plans d'abonnement
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- Basique, Standard, Illimité
  code TEXT NOT NULL UNIQUE, -- basic, standard, unlimited
  max_seats INTEGER, -- NULL = illimité
  price_monthly INTEGER NOT NULL DEFAULT 0, -- en F CFA
  price_yearly INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abonnements actifs d'un hôpital
CREATE TABLE IF NOT EXISTS hospital_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  license_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, suspended
  seats_used INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_key
  ON hospital_subscriptions(license_key);

CREATE INDEX IF NOT EXISTS idx_subscriptions_hospital
  ON hospital_subscriptions(hospital_id);

-- Lier les médecins à un abonnement (poste / siège)
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES hospital_subscriptions(id);

ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Plans de démo
INSERT INTO subscription_plans (name, code, max_seats, price_monthly, price_yearly, description)
VALUES
  ('Basique', 'basic', 3, 25000, 250000, 'Jusqu''à 3 postes médecins'),
  ('Standard', 'standard', 10, 75000, 750000, 'Jusqu''à 10 postes médecins'),
  ('Illimité', 'unlimited', NULL, 150000, 1500000, 'Postes médecins illimités')
ON CONFLICT (code) DO NOTHING;

-- Créer un abonnement de démo pour chaque hôpital existant
DO $$
DECLARE
  r RECORD;
  plan_basic UUID;
  plan_std UUID;
  plan_unl UUID;
  key_val TEXT;
BEGIN
  SELECT id INTO plan_basic FROM subscription_plans WHERE code = 'basic' LIMIT 1;
  SELECT id INTO plan_std FROM subscription_plans WHERE code = 'standard' LIMIT 1;
  SELECT id INTO plan_unl FROM subscription_plans WHERE code = 'unlimited' LIMIT 1;

  FOR r IN SELECT id, name FROM hospitals LOOP
    IF NOT EXISTS (
      SELECT 1 FROM hospital_subscriptions WHERE hospital_id = r.id
    ) THEN
      -- Clé de démo unique par hôpital
      key_val := 'CARE-' || upper(substr(replace(r.id::text, '-', ''), 1, 4)) || '-' || upper(substr(md5(r.id::text), 1, 6));

      INSERT INTO hospital_subscriptions (
        hospital_id, plan_id, license_key, status, seats_used, expires_at
      ) VALUES (
        r.id,
        COALESCE(plan_std, plan_basic),
        key_val,
        'active',
        0,
        NOW() + INTERVAL '1 year'
      );
    END IF;
  END LOOP;
END $$;
