/**
 * Supabase Database TypeScript Definitions
 * Automatically mapped from PostgreSQL 15+ Schema (Migrations 01-14)
 * Project: CareLink Healthcare Platform
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | 'patient'
  | 'doctor'
  | 'pharmacy_admin'
  | 'pharmacy_staff'
  | 'platform_admin';

export type GenderType = 'male' | 'female' | 'other' | 'unspecified';

export type BloodGroupType =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-'
  | 'unknown';

export type DoctorVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'suspended';

export type AccessLevelType = 'read_only' | 'read_write' | 'full';

export type AccessStatusType = 'active' | 'revoked' | 'expired';

export type SlotStatusType = 'available' | 'booked' | 'blocked' | 'cancelled';

export type ConsultationModeType =
  | 'in_person'
  | 'teleconsultation'
  | 'home_visit';

export type AppointmentStatusType =
  | 'requested'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'transferred';

export type ConsultationStatusType =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PrescriptionStatusType =
  | 'active'
  | 'partially_dispensed'
  | 'dispensed'
  | 'expired'
  | 'cancelled';

export type TransferStatusType =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'dispensing'
  | 'completed'
  | 'cancelled';

export type StockMovementType =
  | 'entry'
  | 'sale'
  | 'adjustment'
  | 'reservation'
  | 'release_reservation'
  | 'return'
  | 'loss'
  | 'expiry';

export type OrderStatusType =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'partially_fulfilled'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type FulfillmentStatusType =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type DeliveryModeType =
  | 'pickup'
  | 'standard_delivery'
  | 'express_delivery';

export type PaymentMethodType =
  | 'tmoney'
  | 'yas'
  | 'moov_money'
  | 'gozem'
  | 'card'
  | 'paypal'
  | 'cash_on_delivery'
  | 'cash_in_person';

export type PaymentStatusType =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type ClaimStatusType =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid';

export type NotificationType =
  | 'appointment'
  | 'prescription'
  | 'order'
  | 'stock'
  | 'access_request'
  | 'system';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: AppRole;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      patient_profiles: {
        Row: {
          id: string;
          profile_id: string;
          date_of_birth: string | null;
          gender: GenderType;
          blood_group: BloodGroupType;
          allergies: string[];
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          address: string | null;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          date_of_birth?: string | null;
          gender?: GenderType;
          blood_group?: BloodGroupType;
          allergies?: string[];
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          address?: string | null;
          city?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['patient_profiles']['Insert']>;
      };
      doctor_profiles: {
        Row: {
          id: string;
          profile_id: string;
          license_number: string;
          specialty: string;
          sub_specialties: string[];
          bio: string | null;
          consultation_fee: number;
          currency: string;
          verification_status: DoctorVerificationStatus;
          verified_at: string | null;
          verified_by: string | null;
          signature_url: string | null;
          stamp_url: string | null;
          office_address: string | null;
          office_city: string | null;
          office_latitude: number | null;
          office_longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          license_number: string;
          specialty: string;
          sub_specialties?: string[];
          bio?: string | null;
          consultation_fee?: number;
          currency?: string;
          verification_status?: DoctorVerificationStatus;
          verified_at?: string | null;
          verified_by?: string | null;
          signature_url?: string | null;
          stamp_url?: string | null;
          office_address?: string | null;
          office_city?: string | null;
          office_latitude?: number | null;
          office_longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['doctor_profiles']['Insert']>;
      };
      pharmacies: {
        Row: {
          id: string;
          name: string;
          license_number: string;
          address: string;
          district: string | null;
          city: string;
          latitude: number;
          longitude: number;
          phone: string;
          email: string | null;
          opening_hours: Json;
          is_duty_pharmacy: boolean;
          is_verified: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          license_number: string;
          address: string;
          district?: string | null;
          city: string;
          latitude: number;
          longitude: number;
          phone: string;
          email?: string | null;
          opening_hours?: Json;
          is_duty_pharmacy?: boolean;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pharmacies']['Insert']>;
      };
      pharmacy_staff: {
        Row: {
          id: string;
          pharmacy_id: string;
          profile_id: string;
          staff_role: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          profile_id: string;
          staff_role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pharmacy_staff']['Insert']>;
      };
      medical_dossiers: {
        Row: {
          id: string;
          patient_id: string;
          blood_group: BloodGroupType;
          allergies: string[];
          chronic_conditions: string[];
          past_medical_history: string | null;
          surgical_history: string | null;
          family_history: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          blood_group?: BloodGroupType;
          allergies?: string[];
          chronic_conditions?: string[];
          past_medical_history?: string | null;
          surgical_history?: string | null;
          family_history?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['medical_dossiers']['Insert']>;
      };
      medical_record_entries: {
        Row: {
          id: string;
          dossier_id: string;
          doctor_id: string | null;
          entry_type: string;
          title: string;
          content: string;
          attachments: Json;
          is_sensitive: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dossier_id: string;
          doctor_id?: string | null;
          entry_type: string;
          title: string;
          content: string;
          attachments?: Json;
          is_sensitive?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['medical_record_entries']['Insert']>;
      };
      doctor_patient_access: {
        Row: {
          id: string;
          doctor_id: string;
          patient_id: string;
          granted_by: string;
          reason: string | null;
          access_level: AccessLevelType;
          status: AccessStatusType;
          granted_at: string;
          expires_at: string | null;
          revoked_at: string | null;
          revocation_reason: string | null;
        };
        Insert: {
          id?: string;
          doctor_id: string;
          patient_id: string;
          granted_by: string;
          reason?: string | null;
          access_level?: AccessLevelType;
          status?: AccessStatusType;
          granted_at?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          revocation_reason?: string | null;
        };
        Update: Partial<Database['public']['Tables']['doctor_patient_access']['Insert']>;
      };
      dossier_transfers: {
        Row: {
          id: string;
          dossier_id: string;
          patient_id: string;
          from_doctor_id: string;
          to_doctor_id: string;
          transfer_reason: string;
          clinical_summary: string | null;
          status: TransferStatusType;
          requested_at: string;
          responded_at: string | null;
          response_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dossier_id: string;
          patient_id: string;
          from_doctor_id: string;
          to_doctor_id: string;
          transfer_reason: string;
          clinical_summary?: string | null;
          status?: TransferStatusType;
          requested_at?: string;
          responded_at?: string | null;
          response_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dossier_transfers']['Insert']>;
      };
      doctor_slots: {
        Row: {
          id: string;
          doctor_id: string;
          start_time: string;
          end_time: string;
          status: SlotStatusType;
          consultation_mode: ConsultationModeType;
          capacity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doctor_id: string;
          start_time: string;
          end_time: string;
          status?: SlotStatusType;
          consultation_mode?: ConsultationModeType;
          capacity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['doctor_slots']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          slot_id: string | null;
          scheduled_at: string;
          duration_minutes: number;
          status: AppointmentStatusType;
          consultation_mode: ConsultationModeType;
          reason_for_visit: string;
          patient_notes: string | null;
          cancellation_reason: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          slot_id?: string | null;
          scheduled_at: string;
          duration_minutes?: number;
          status?: AppointmentStatusType;
          consultation_mode?: ConsultationModeType;
          reason_for_visit: string;
          patient_notes?: string | null;
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      consultations: {
        Row: {
          id: string;
          appointment_id: string | null;
          doctor_id: string;
          patient_id: string;
          status: ConsultationStatusType;
          symptoms: string | null;
          vital_signs: Json;
          physical_examination: string | null;
          diagnosis: string | null;
          clinical_notes: string | null;
          treatment_plan: string | null;
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appointment_id?: string | null;
          doctor_id: string;
          patient_id: string;
          status?: ConsultationStatusType;
          symptoms?: string | null;
          vital_signs?: Json;
          physical_examination?: string | null;
          diagnosis?: string | null;
          clinical_notes?: string | null;
          treatment_plan?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['consultations']['Insert']>;
      };
      prescriptions: {
        Row: {
          id: string;
          consultation_id: string | null;
          doctor_id: string;
          patient_id: string;
          prescription_code: string;
          status: PrescriptionStatusType;
          general_instructions: string | null;
          doctor_signature_url: string | null;
          doctor_stamp_url: string | null;
          is_digitally_signed: boolean;
          signed_at: string | null;
          valid_until: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          consultation_id?: string | null;
          doctor_id: string;
          patient_id: string;
          prescription_code?: string;
          status?: PrescriptionStatusType;
          general_instructions?: string | null;
          doctor_signature_url?: string | null;
          doctor_stamp_url?: string | null;
          is_digitally_signed?: boolean;
          signed_at?: string | null;
          valid_until?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['prescriptions']['Insert']>;
      };
      prescription_items: {
        Row: {
          id: string;
          prescription_id: string;
          medication_name: string;
          brand: string | null;
          form: string;
          dosage: string;
          quantity: number;
          frequency: string;
          duration_days: number;
          instructions: string | null;
          is_renewable: boolean;
          renewals_allowed: number;
          renewals_remaining: number;
          is_dispensed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          prescription_id: string;
          medication_name: string;
          brand?: string | null;
          form: string;
          dosage: string;
          quantity?: number;
          frequency: string;
          duration_days?: number;
          instructions?: string | null;
          is_renewable?: boolean;
          renewals_allowed?: number;
          renewals_remaining?: number;
          is_dispensed?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['prescription_items']['Insert']>;
      };
      prescription_pharmacy_transfers: {
        Row: {
          id: string;
          prescription_id: string;
          patient_id: string;
          pharmacy_id: string;
          status: TransferStatusType;
          patient_notes: string | null;
          pharmacy_response_notes: string | null;
          transferred_at: string;
          responded_at: string | null;
          responded_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prescription_id: string;
          patient_id: string;
          pharmacy_id: string;
          status?: TransferStatusType;
          patient_notes?: string | null;
          pharmacy_response_notes?: string | null;
          transferred_at?: string;
          responded_at?: string | null;
          responded_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['prescription_pharmacy_transfers']['Insert']>;
      };
      product_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          parent_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          parent_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          pharmacy_id: string;
          category_id: string | null;
          name: string;
          brand: string | null;
          generic_name: string | null;
          form: string;
          dosage: string;
          description: string | null;
          price: number;
          currency: string;
          is_prescription_required: boolean;
          is_active: boolean;
          sku: string | null;
          barcode: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          category_id?: string | null;
          name: string;
          brand?: string | null;
          generic_name?: string | null;
          form: string;
          dosage: string;
          description?: string | null;
          price: number;
          currency?: string;
          is_prescription_required?: boolean;
          is_active?: boolean;
          sku?: string | null;
          barcode?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      product_stocks: {
        Row: {
          product_id: string;
          pharmacy_id: string;
          current_quantity: number;
          reserved_quantity: number;
          low_stock_threshold: number;
          updated_at: string;
        };
        Insert: {
          product_id: string;
          pharmacy_id: string;
          current_quantity?: number;
          reserved_quantity?: number;
          low_stock_threshold?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_stocks']['Insert']>;
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          pharmacy_id: string;
          movement_type: StockMovementType;
          quantity_change: number;
          quantity_before: number;
          quantity_after: number;
          reference_type: string;
          reference_id: string | null;
          notes: string | null;
          performed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          pharmacy_id: string;
          movement_type: StockMovementType;
          quantity_change: number;
          quantity_before: number;
          quantity_after: number;
          reference_type: string;
          reference_id?: string | null;
          notes?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>;
      };
      carts: {
        Row: {
          id: string;
          patient_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['carts']['Insert']>;
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          pharmacy_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          pharmacy_id: string;
          quantity?: number;
          unit_price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cart_items']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          patient_id: string;
          order_number: string;
          status: OrderStatusType;
          total_amount: number;
          insurance_amount: number;
          patient_amount: number;
          currency: string;
          payment_status: PaymentStatusType;
          delivery_mode: DeliveryModeType;
          delivery_address: string | null;
          delivery_city: string | null;
          delivery_latitude: number | null;
          delivery_longitude: number | null;
          patient_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          order_number?: string;
          status?: OrderStatusType;
          total_amount?: number;
          insurance_amount?: number;
          patient_amount?: number;
          currency?: string;
          payment_status?: PaymentStatusType;
          delivery_mode?: DeliveryModeType;
          delivery_address?: string | null;
          delivery_city?: string | null;
          delivery_latitude?: number | null;
          delivery_longitude?: number | null;
          patient_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_fulfillments: {
        Row: {
          id: string;
          order_id: string;
          pharmacy_id: string;
          fulfillment_number: string;
          subtotal_amount: number;
          status: FulfillmentStatusType;
          rejection_reason: string | null;
          prepared_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          pharmacy_id: string;
          fulfillment_number?: string;
          subtotal_amount: number;
          status?: FulfillmentStatusType;
          rejection_reason?: string | null;
          prepared_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_fulfillments']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_fulfillment_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_fulfillment_id: string;
          product_id: string;
          product_name: string;
          quantity?: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      insurance_providers: {
        Row: {
          id: string;
          name: string;
          code: string;
          contact_phone: string | null;
          contact_email: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          contact_phone?: string | null;
          contact_email?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['insurance_providers']['Insert']>;
      };
      patient_insurances: {
        Row: {
          id: string;
          patient_id: string;
          provider_id: string;
          policy_number: string;
          member_id: string;
          coverage_rate_default: number;
          is_verified: boolean;
          valid_from: string;
          valid_until: string;
          card_document_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          provider_id: string;
          policy_number: string;
          member_id: string;
          coverage_rate_default?: number;
          is_verified?: boolean;
          valid_from: string;
          valid_until: string;
          card_document_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['patient_insurances']['Insert']>;
      };
      insurance_coverages: {
        Row: {
          id: string;
          provider_id: string;
          category_id: string | null;
          coverage_percentage: number;
          ceiling_amount: number | null;
          requires_preauth: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          category_id?: string | null;
          coverage_percentage: number;
          ceiling_amount?: number | null;
          requires_preauth?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['insurance_coverages']['Insert']>;
      };
      insurance_claims: {
        Row: {
          id: string;
          claim_reference: string;
          patient_insurance_id: string;
          order_id: string | null;
          consultation_id: string | null;
          claimed_amount: number;
          approved_amount: number;
          patient_copay_amount: number;
          status: ClaimStatusType;
          rejection_reason: string | null;
          submitted_at: string;
          processed_at: string | null;
          processed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          claim_reference?: string;
          patient_insurance_id: string;
          order_id?: string | null;
          consultation_id?: string | null;
          claimed_amount: number;
          approved_amount?: number;
          patient_copay_amount?: number;
          status?: ClaimStatusType;
          rejection_reason?: string | null;
          submitted_at?: string;
          processed_at?: string | null;
          processed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['insurance_claims']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          order_id: string | null;
          consultation_id: string | null;
          patient_id: string;
          amount: number;
          currency: string;
          payment_method: PaymentMethodType;
          status: PaymentStatusType;
          provider_tx_id: string | null;
          external_reference: string | null;
          metadata: Json;
          initiated_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          consultation_id?: string | null;
          patient_id: string;
          amount: number;
          currency?: string;
          payment_method: PaymentMethodType;
          status?: PaymentStatusType;
          provider_tx_id?: string | null;
          external_reference?: string | null;
          metadata?: Json;
          initiated_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          title: string;
          message: string;
          notification_type: NotificationType;
          data: Json;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          title: string;
          message: string;
          notification_type?: NotificationType;
          data?: Json;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          performed_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          resource_type: string;
          resource_id: string;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          performed_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
    Functions: {
      calculate_distance_km: {
        Args: {
          p_lat1: number | null;
          p_lon1: number | null;
          p_lat2: number | null;
          p_lon2: number | null;
        };
        Returns: number | null;
      };
      reserve_and_decrement_stock: {
        Args: {
          p_order_id: string;
          p_items: Json; // Array of { product_id: string, quantity: number }
        };
        Returns: boolean;
      };
      book_appointment_slot: {
        Args: {
          p_patient_id: string;
          p_slot_id: string;
          p_reason: string;
          p_mode?: ConsultationModeType;
        };
        Returns: string; // appointment_id
      };
      transfer_prescription_to_pharmacy: {
        Args: {
          p_prescription_id: string;
          p_pharmacy_id: string;
          p_notes?: string | null;
        };
        Returns: string; // transfer_id
      };
      record_audit_log: {
        Args: {
          p_actor_id: string | null;
          p_action: string;
          p_resource_type: string;
          p_resource_id: string;
          p_old_values?: Json | null;
          p_new_values?: Json | null;
          p_ip?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string; // log_id
      };
    };
  };
}
