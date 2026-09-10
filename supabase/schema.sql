-- =====================================================
-- CareLink - Schéma de base de données (Supabase)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'hospital_admin', 'pharmacy');
CREATE TYPE appointment_status AS ENUM ('pending', 'validated', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'cash_pending', 'failed', 'refunded');
CREATE TYPE prescription_status AS ENUM ('draft', 'sent', 'dispensed', 'cancelled');

-- =====================================================
-- PROFILES (lié à auth.users de Supabase)
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'patient',
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  avatar_url TEXT,
  prescription_code TEXT, -- code secret pour les ordonnances (patients)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HOSPITALS
-- =====================================================

CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT DEFAULT 'Lomé',
  phone TEXT,
  email TEXT,
  rating DECIMAL(2,1) DEFAULT 4.0,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  consultation_price INTEGER NOT NULL DEFAULT 160, -- en F CFA
  accepted_insurances TEXT[] DEFAULT ARRAY['INAM', 'NSIA', 'SUNU'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DOCTORS (liés à un hôpital + un profile)
-- =====================================================

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  specialty TEXT,
  license_number TEXT,
  signature TEXT,
  stamp TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- APPOINTMENTS (Dossiers / Rendez-vous)
-- =====================================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  doctor_id UUID REFERENCES doctors(id),
  
  consultation_type TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  
  -- Assurance
  has_insurance BOOLEAN DEFAULT FALSE,
  insurance_company TEXT,
  insurance_card_number TEXT,
  insurance_coverage INTEGER DEFAULT 0,
  
  -- Paiement
  consultation_price INTEGER NOT NULL,
  remaining_amount INTEGER NOT NULL,
  payment_method TEXT,
  payment_status payment_status DEFAULT 'pending',
  
  -- File d'attente
  queue_number INTEGER,
  priority INTEGER DEFAULT 3, -- 1=très urgent, 2=urgent, 3=normal
  
  status appointment_status DEFAULT 'pending',
  hospital_validated_at TIMESTAMPTZ,
  hospital_validator_name TEXT,
  hospital_observation TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PRESCRIPTIONS (Ordonnances)
-- =====================================================

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id),
  patient_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Constantes
  temperature TEXT,
  bpm TEXT,
  blood_pressure TEXT,
  
  -- Contenu
  medications TEXT NOT NULL, -- texte libre pour l'instant
  instructions TEXT,
  
  -- Signature
  doctor_name TEXT,
  doctor_phone TEXT,
  doctor_signature TEXT,
  doctor_stamp TEXT,
  
  status prescription_status DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PHARMACIES
-- =====================================================

CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  address TEXT,
  zone TEXT,
  city TEXT DEFAULT 'Lomé',
  phone TEXT,
  email TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS (Médicaments / produits de santé)
-- =====================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  generic_name TEXT,
  description TEXT,
  category TEXT,
  requires_prescription BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PHARMACY STOCK
-- =====================================================

CREATE TABLE pharmacy_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  price INTEGER NOT NULL, -- en F CFA
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pharmacy_id, product_id)
);

-- =====================================================
-- ORDERS (Commandes patient → pharmacie)
-- =====================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id),
  prescription_id UUID REFERENCES prescriptions(id),
  
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, ready, delivered, cancelled
  payment_method TEXT,
  payment_status payment_status DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_appointment ON prescriptions(appointment_id);
CREATE INDEX idx_pharmacy_stock_pharmacy ON pharmacy_stock(pharmacy_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Base
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

-- Profiles : chacun peut lire/modifier son propre profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Hospitals : tout le monde peut les voir (public)
CREATE POLICY "Anyone can view active hospitals"
  ON hospitals FOR SELECT
  USING (is_active = TRUE);

-- Appointments : le patient voit les siens
CREATE POLICY "Patients can view own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Prescriptions : le patient voit les siennes
CREATE POLICY "Patients can view own prescriptions"
  ON prescriptions FOR SELECT
  USING (auth.uid() = patient_id);

-- =====================================================
-- DONNÉES DE DÉMONSTRATION
-- =====================================================

INSERT INTO hospitals (name, address, city, rating, consultation_price, accepted_insurances) VALUES
  ('Hôpital Central', 'Avenue de la Libération', 'Lomé', 4.7, 160, ARRAY['INAM', 'NSIA', 'SUNU', 'AXA', 'Allianz']),
  ('Clinique Sainte Marie', 'Quartier Administratif', 'Lomé', 4.5, 160, ARRAY['INAM', 'NSIA', 'SUNU', 'Allianz']),
  ('Clinique de la Paix', 'Tokoin', 'Lomé', 4.3, 160, ARRAY['INAM', 'NSIA', 'SUNU']);

INSERT INTO products (name, generic_name, category, requires_prescription) VALUES
  ('Paracétamol 500mg', 'Paracetamol', 'Antalgique', false),
  ('Amoxicilline 500mg', 'Amoxicillin', 'Antibiotique', true),
  ('Ibuprofène 400mg', 'Ibuprofen', 'Anti-inflammatoire', false),
  ('Oméprazole 20mg', 'Omeprazole', 'Antiulcéreux', true);
