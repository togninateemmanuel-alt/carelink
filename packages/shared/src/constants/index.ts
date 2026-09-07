/**
 * Shared Business Constants & Configuration Values
 * Project: CareLink Healthcare Platform
 */

import type { AppRole, ConsultationModeType } from '../types/database.types';

export const APP_NAME = 'CareLink';
export const APP_SLOGAN = 'Votre santé connectée, de la consultation à la pharmacie';

export const DEFAULT_CURRENCY = 'XOF'; // Franc CFA BCEAO
export const DEFAULT_CURRENCY_SYMBOL = 'FCFA';

export const ROLES: Record<string, AppRole> = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  PHARMACY_ADMIN: 'pharmacy_admin',
  PHARMACY_STAFF: 'pharmacy_staff',
  PLATFORM_ADMIN: 'platform_admin',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  patient: 'Patient',
  doctor: 'Médecin / Praticien',
  pharmacy_admin: 'Pharmacien Titulaire',
  pharmacy_staff: 'Équipe Officinale',
  platform_admin: 'Administrateur Plateforme',
};

export const MEDICAL_SPECIALTIES = [
  'Médecine Générale',
  'Cardiologie',
  'Pédiatrie',
  'Gynécologie-Obstétrique',
  'Dermatologie',
  'Ophtalmologie',
  'Pneumologie',
  'Neurologie',
  'Gastro-entérologie',
  'Psychiatrie',
  'Chirurgie Générale',
  'ORL (Oto-Rhino-Laryngologie)',
  'Rhumatologie',
  'Urologie',
  'Endocrinologie',
] as const;

export const CONSULTATION_MODES: Record<ConsultationModeType, string> = {
  in_person: 'En cabinet médical',
  teleconsultation: 'Téléconsultation vidéo',
  home_visit: 'Visite à domicile',
};

export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  MEDICAL_DOCUMENTS: 'medical-documents',
  PRESCRIPTIONS: 'prescriptions',
  DOCTOR_ASSETS: 'doctor-assets',
} as const;

export const DEFAULT_PAGINATION_LIMIT = 20;
export const MAX_DISTANCE_MARKETPLACE_KM = 50; // Rayon max de recherche d'officines
