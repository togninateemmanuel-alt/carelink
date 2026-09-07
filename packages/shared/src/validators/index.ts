/**
 * Pure Validation Schemas and Payload Validators
 * Zero external heavy dependencies to remain lightweight across web, node and react-native
 * Project: CareLink Healthcare Platform
 */

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: Record<string, string>;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Le mot de passe doit comporter au moins 8 caractères.' };
  }
  return { isValid: true };
}

export interface PatientSignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
}

export function validatePatientSignup(input: Partial<PatientSignupPayload>): ValidationResult<PatientSignupPayload> {
  const errors: Record<string, string> = {};

  if (!input.email || !validateEmail(input.email)) {
    errors.email = 'Veuillez renseigner une adresse email valide.';
  }

  const pwdCheck = validatePassword(input.password || '');
  if (!pwdCheck.isValid) {
    errors.password = pwdCheck.message || 'Mot de passe invalide.';
  }

  if (!input.firstName || input.firstName.trim().length < 2) {
    errors.firstName = 'Le prénom doit comporter au moins 2 caractères.';
  }

  if (!input.lastName || input.lastName.trim().length < 2) {
    errors.lastName = 'Le nom doit comporter au moins 2 caractères.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    data: Object.keys(errors).length === 0 ? (input as PatientSignupPayload) : undefined,
    errors,
  };
}

export interface DoctorSignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string;
  specialty: string;
  consultationFee: number;
}

export function validateDoctorSignup(input: Partial<DoctorSignupPayload>): ValidationResult<DoctorSignupPayload> {
  const errors: Record<string, string> = {};

  if (!input.email || !validateEmail(input.email)) {
    errors.email = 'Email professionnel invalide.';
  }

  const pwdCheck = validatePassword(input.password || '');
  if (!pwdCheck.isValid) {
    errors.password = pwdCheck.message || 'Mot de passe invalide.';
  }

  if (!input.firstName || input.firstName.trim().length < 2) {
    errors.firstName = 'Prénom requis.';
  }

  if (!input.lastName || input.lastName.trim().length < 2) {
    errors.lastName = 'Nom requis.';
  }

  if (!input.licenseNumber || input.licenseNumber.trim().length < 4) {
    errors.licenseNumber = 'Numéro d’ordre ou licence médicale obligatoire.';
  }

  if (!input.specialty || input.specialty.trim().length === 0) {
    errors.specialty = 'Spécialité médicale obligatoire.';
  }

  if (input.consultationFee === undefined || input.consultationFee < 0) {
    errors.consultationFee = 'Tarif de consultation invalide.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    data: Object.keys(errors).length === 0 ? (input as DoctorSignupPayload) : undefined,
    errors,
  };
}

export interface PrescriptionCreationPayload {
  patientId: string;
  consultationId?: string;
  generalInstructions?: string;
  items: {
    medicationName: string;
    brand?: string;
    form: string;
    dosage: string;
    quantity: number;
    frequency: string;
    durationDays: number;
    instructions?: string;
  }[];
}

export function validatePrescriptionCreation(
  input: Partial<PrescriptionCreationPayload>
): ValidationResult<PrescriptionCreationPayload> {
  const errors: Record<string, string> = {};

  if (!input.patientId) {
    errors.patientId = 'Patient destinataire requis.';
  }

  if (!input.items || input.items.length === 0) {
    errors.items = 'L’ordonnance doit comporter au moins un médicament.';
  } else {
    input.items.forEach((item, index) => {
      if (!item.medicationName || item.medicationName.trim().length === 0) {
        errors[`item_${index}_name`] = `Médicament ${index + 1} : nom obligatoire.`;
      }
      if (!item.form) {
        errors[`item_${index}_form`] = `Médicament ${index + 1} : forme galénique requise.`;
      }
      if (!item.dosage) {
        errors[`item_${index}_dosage`] = `Médicament ${index + 1} : dosage requis.`;
      }
      if (!item.quantity || item.quantity <= 0) {
        errors[`item_${index}_quantity`] = `Médicament ${index + 1} : quantité invalide.`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    data: Object.keys(errors).length === 0 ? (input as PrescriptionCreationPayload) : undefined,
    errors,
  };
}
