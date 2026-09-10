-- =====================================================
-- Migration : créneaux de rendez-vous (calendrier médecin)
-- À exécuter dans le SQL Editor Supabase
-- =====================================================

-- Date/heure planifiée de la consultation
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Durée estimée en minutes (défaut 20 min)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 20;

-- Index pour rechercher rapidement les créneaux d'un hôpital
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled
  ON appointments(hospital_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status NOT IN ('cancelled');

-- Commentaire
COMMENT ON COLUMN appointments.scheduled_at IS 'Date et heure planifiées de la consultation';
COMMENT ON COLUMN appointments.duration_minutes IS 'Durée estimée de la consultation en minutes';
