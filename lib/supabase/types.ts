export type UserRole = "patient" | "doctor" | "hospital_admin" | "pharmacy";

export type AppointmentStatus =
  | "pending"
  | "validated"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "cash_pending"
  | "failed"
  | "refunded";

export type PrescriptionStatus = "draft" | "sent" | "dispensed" | "cancelled";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  avatar_url: string | null;
  prescription_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string | null;
  city: string;
  phone: string | null;
  email: string | null;
  rating: number;
  latitude: number | null;
  longitude: number | null;
  consultation_price: number;
  accepted_insurances: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  hospital_id: string;
  doctor_id: string | null;
  consultation_type: string;
  symptoms: string;
  has_insurance: boolean;
  insurance_company: string | null;
  insurance_card_number: string | null;
  insurance_coverage: number;
  consultation_price: number;
  remaining_amount: number;
  payment_method: string | null;
  payment_status: PaymentStatus;
  queue_number: number | null;
  priority: number;
  status: AppointmentStatus;
  hospital_validated_at: string | null;
  hospital_validator_name: string | null;
  hospital_observation: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  appointment_id: string;
  doctor_id: string | null;
  patient_id: string;
  temperature: string | null;
  bpm: string | null;
  blood_pressure: string | null;
  medications: string;
  instructions: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  doctor_signature: string | null;
  doctor_stamp: string | null;
  status: PrescriptionStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pharmacy {
  id: string;
  owner_id: string | null;
  name: string;
  address: string | null;
  zone: string | null;
  city: string;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
