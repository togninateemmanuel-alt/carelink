/**
 * Prescription & Pharmacy Transfer Service
 * Manages tamper-proof digital prescriptions and targeted patient-directed transfers
 * Project: CareLink Healthcare Platform
 */

import type { CareLinkSupabaseClient } from '../client';
import type { PrescriptionCreationPayload, TransferStatusType } from '@carelink/shared';

export class PrescriptionService {
  constructor(private client: CareLinkSupabaseClient) {}

  /**
   * Doctor creates a new digital prescription with line items
   */
  async createPrescription(doctorId: string, payload: PrescriptionCreationPayload) {
    // 1. Create prescription header
    const { data: rx, error: rxError } = await this.client
      .from('prescriptions')
      .insert({
        doctor_id: doctorId,
        patient_id: payload.patientId,
        consultation_id: payload.consultationId || null,
        general_instructions: payload.generalInstructions || null,
        status: 'active',
        is_digitally_signed: false,
      })
      .select()
      .single();

    if (rxError) throw rxError;

    // 2. Insert items
    const itemsToInsert = payload.items.map((item) => ({
      prescription_id: rx.id,
      medication_name: item.medicationName,
      brand: item.brand || null,
      form: item.form,
      dosage: item.dosage,
      quantity: item.quantity,
      frequency: item.frequency,
      duration_days: item.durationDays,
      instructions: item.instructions || null,
    }));

    const { error: itemsError } = await this.client
      .from('prescription_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    return rx;
  }

  /**
   * Signs prescription digitally with stamp & signature URLs
   */
  async signPrescription(prescriptionId: string, signatureUrl: string, stampUrl?: string) {
    const { data, error } = await this.client
      .from('prescriptions')
      .update({
        is_digitally_signed: true,
        signed_at: new Date().toISOString(),
        doctor_signature_url: signatureUrl,
        doctor_stamp_url: stampUrl || null,
      })
      .eq('id', prescriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Patient transfers a prescription to a chosen pharmacy using the secure transfer_prescription_to_pharmacy() RPC
   */
  async transferToPharmacy(prescriptionId: string, pharmacyId: string, patientNotes?: string): Promise<string> {
    const { data, error } = await this.client.rpc('transfer_prescription_to_pharmacy', {
      p_prescription_id: prescriptionId,
      p_pharmacy_id: pharmacyId,
      p_notes: patientNotes || null,
    });

    if (error) throw error;
    return data as string; // transfer_id
  }

  /**
   * Fetches patient's prescriptions with items
   */
  async getPatientPrescriptions(patientId: string) {
    const { data, error } = await this.client
      .from('prescriptions')
      .select(`
        *,
        items:prescription_items(*),
        doctor:profiles!prescriptions_doctor_id_fkey(first_name, last_name, avatar_url)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Pharmacy fetches prescriptions explicitly transferred to its officine
   */
  async getPharmacyTransfers(pharmacyId: string, status?: TransferStatusType) {
    let query = this.client
      .from('prescription_pharmacy_transfers')
      .select(`
        *,
        prescription:prescriptions(
          id,
          prescription_code,
          doctor_signature_url,
          doctor_stamp_url,
          valid_until,
          created_at,
          doctor:profiles!prescriptions_doctor_id_fkey(first_name, last_name),
          items:prescription_items(*)
        ),
        patient:profiles!prescription_pharmacy_transfers_patient_id_fkey(first_name, last_name, phone)
      `)
      .eq('pharmacy_id', pharmacyId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('transferred_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  /**
   * Pharmacy updates status of a transferred prescription (accepted, rejected, completed)
   */
  async updateTransferStatus(transferId: string, status: TransferStatusType, notes?: string) {
    const { data, error } = await this.client
      .from('prescription_pharmacy_transfers')
      .update({
        status,
        pharmacy_response_notes: notes,
        responded_at: new Date().toISOString(),
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', transferId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
