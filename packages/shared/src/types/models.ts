/**
 * Clean Business Domain Models for Frontend & API Consumptions
 * Project: CareLink Healthcare Platform
 */

import type {
  AppRole,
  BloodGroupType,
  DoctorVerificationStatus,
  GenderType,
  SlotStatusType,
  ConsultationModeType,
  AppointmentStatusType,
  ConsultationStatusType,
  PrescriptionStatusType,
  TransferStatusType,
  OrderStatusType,
  FulfillmentStatusType,
  PaymentMethodType,
  PaymentStatusType,
  NotificationType,
} from './database.types';

export interface UserProfile {
  id: string;
  email: string;
  role: AppRole;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PatientProfileModel extends UserProfile {
  dateOfBirth?: string;
  gender: GenderType;
  bloodGroup: BloodGroupType;
  allergies: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface DoctorProfileModel extends UserProfile {
  licenseNumber: string;
  specialty: string;
  subSpecialties: string[];
  bio?: string;
  consultationFee: number;
  currency: string;
  verificationStatus: DoctorVerificationStatus;
  signatureUrl?: string;
  stampUrl?: string;
  officeAddress?: string;
  officeCity?: string;
  officeLatitude?: number;
  officeLongitude?: number;
}

export interface PharmacyModel {
  id: string;
  name: string;
  licenseNumber: string;
  address: string;
  district?: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  email?: string;
  openingHours: Record<string, string>;
  isDutyPharmacy: boolean;
  isVerified: boolean;
  isActive: boolean;
  distanceKm?: number;
}

export interface DoctorSlotModel {
  id: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  status: SlotStatusType;
  consultationMode: ConsultationModeType;
  capacity: number;
}

export interface AppointmentModel {
  id: string;
  patientId: string;
  doctorId: string;
  slotId?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatusType;
  consultationMode: ConsultationModeType;
  reasonForVisit: string;
  patientNotes?: string;
  doctor?: Partial<DoctorProfileModel>;
  patient?: Partial<PatientProfileModel>;
}

export interface PrescriptionItemModel {
  id: string;
  medicationName: string;
  brand?: string;
  form: string;
  dosage: string;
  quantity: number;
  frequency: string;
  durationDays: number;
  instructions?: string;
  isRenewable: boolean;
  renewalsRemaining: number;
  isDispensed: boolean;
}

export interface PrescriptionModel {
  id: string;
  consultationId?: string;
  doctorId: string;
  patientId: string;
  prescriptionCode: string;
  status: PrescriptionStatusType;
  generalInstructions?: string;
  doctorSignatureUrl?: string;
  doctorStampUrl?: string;
  isDigitallySigned: boolean;
  validUntil: string;
  createdAt: string;
  items: PrescriptionItemModel[];
  doctor?: Partial<DoctorProfileModel>;
}

export interface ProductModel {
  id: string;
  pharmacyId: string;
  categoryId?: string;
  name: string;
  brand?: string;
  genericName?: string;
  form: string;
  dosage: string;
  description?: string;
  price: number;
  currency: string;
  isPrescriptionRequired: boolean;
  imageUrl?: string;
  stockQuantity?: number;
  pharmacy?: Partial<PharmacyModel>;
}

export interface CartItemModel {
  id: string;
  productId: string;
  pharmacyId: string;
  quantity: number;
  unitPrice: number;
  product?: ProductModel;
}

export interface OrderFulfillmentModel {
  id: string;
  orderId: string;
  pharmacyId: string;
  fulfillmentNumber: string;
  subtotalAmount: number;
  status: FulfillmentStatusType;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  pharmacy?: Partial<PharmacyModel>;
}

export interface OrderModel {
  id: string;
  patientId: string;
  orderNumber: string;
  status: OrderStatusType;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  currency: string;
  paymentStatus: PaymentStatusType;
  fulfillments: OrderFulfillmentModel[];
  createdAt: string;
}

export interface NotificationModel {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  notificationType: NotificationType;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
