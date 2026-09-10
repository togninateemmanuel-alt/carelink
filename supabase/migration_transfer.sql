-- =====================================================
-- Migration : transfert de dossiers entre médecins
-- À exécuter dans le SQL Editor Supabase
-- =====================================================

-- Historique des transferts
CREATE TABLE IF NOT EXISTS appointment_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  from_doctor_id UUID REFERENCES doctors(id),
  to_doctor_id UUID REFERENCES doctors(id),
  from_doctor_name TEXT,
  to_doctor_name TEXT,
  reason TEXT,
  transferred_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_appointment
  ON appointment_transfers(appointment_id);

-- Médecins de démonstration (liés aux hôpitaux existants)
-- On insère seulement s'il n'y a pas encore de médecins
DO $$
DECLARE
  h1 UUID;
  h2 UUID;
  h3 UUID;
BEGIN
  SELECT id INTO h1 FROM hospitals WHERE name = 'Hôpital Central' LIMIT 1;
  SELECT id INTO h2 FROM hospitals WHERE name = 'Clinique Sainte Marie' LIMIT 1;
  SELECT id INTO h3 FROM hospitals WHERE name = 'Clinique de la Paix' LIMIT 1;

  IF h1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM doctors LIMIT 1) THEN
    INSERT INTO doctors (hospital_id, specialty, license_number, signature, stamp, is_available) VALUES
      (h1, 'Médecine générale', 'MED-HC-001', 'Dr. Adjo Mensah', 'CACHET DR MENSAH', true),
      (h1, 'Cardiologie', 'MED-HC-002', 'Dr. Koffi Yao', 'CACHET DR YAO', true),
      (h1, 'Pédiatrie', 'MED-HC-003', 'Dr. Ama Boateng', 'CACHET DR BOATENG', true),
      (h2, 'Médecine générale', 'MED-SM-001', 'Dr. Jean Amouzou', 'CACHET DR AMOUZOU', true),
      (h2, 'Dermatologie', 'MED-SM-002', 'Dr. Fatou Diallo', 'CACHET DR DIALLO', true),
      (h3, 'Médecine générale', 'MED-CP-001', 'Dr. Paul Agbeko', 'CACHET DR AGBEKO', true),
      (h3, 'Dentisterie', 'MED-CP-002', 'Dr. Sophie Lawson', 'CACHET DR LAWSON', true);
  END IF;
END $$;
