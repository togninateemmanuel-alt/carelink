/**
 * Medical Dossier & Clinical Records Service
 * Governed by strict RLS and doctor-patient access delegation
 * Project: CareLink Healthcare Platform
 */

import type { CareLinkSupabaseClient } from '../client';
import type { Json } from '@carelink/shared';

export class MedicalService {
  constructor(private client: CareLinkSupabaseClient) {}

  /**
   * Fetches the root medical dossier for a patient
   */
  async getMedicalDossier(patientId: string) {
    const { data, error } = await this.client
      .from('medical_dossiers')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Fetches chronological entries (notes, diagnoses, observations, labs) for a dossier
   */
  async getDossierEntries(dossierId: string) {
    const { data, error } = await this.client
      .from('medical_record_entries')
      .select(`
        *,
        doctor:profiles!medical_record_entries_doctor_id_fkey(id, first_name, last_name, avatar_url)
      `)
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Adds an entry to the patient's medical dossier (Doctor only, checked via RLS)
   */
  async addDossierEntry(payload: {
    dossierId: string;
    doctorId: string;
    entryType: string;
    title: string;
    content: string;
    attachments?: Json;
    isSensitive?: boolean;
  }) {
    const { data, error } = await this.client
      .from('medical_record_entries')
      .insert({
        dossier_id: payload.dossierId,
        doctor_id: payload.doctorId,
        entry_type: payload.entryType,
        title: payload.title,
        content: payload.content,
        attachments: payload.attachments || [],
        is_sensitive: payload.isSensitive || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Doctor requests a confraternal dossier transfer with clinical motivation via initiate_dossier_transfer() RPC
   */
  async initiateDossierTransfer(payload: {
    dossierId: string;
    toDoctorId: string;
    reason: string;
    clinicalSummary?: string;
  }) {
    const { data, error } = await this.client.rpc('initiate_dossier_transfer', {
      p_dossier_id: payload.dossierId,
      p_to_doctor_id: payload.toDoctorId,
      p_reason: payload.reason,
      p_clinical_summary: payload.clinicalSummary || null,
    });

    if (error) throw error;
    return data; // transfer_id
  }

  /**
   * Doctor B responds to a dossier transfer request via respond_to_dossier_transfer() RPC
   * Automatically grants active access upon acceptance
   */
  async respondToDossierTransfer(payload: {
    transferId: string;
    accept: boolean;
    notes?: string;
  }) {
    const { data, error } = await this.client.rpc('respond_to_dossier_transfer', {
      p_transfer_id: payload.transferId,
      p_accept: payload.accept,
      p_response_notes: payload.notes || null,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Completes a consultation and optionally issues a digitally signed prescription atomically
   */
  async completeConsultation(payload: {
    consultationId: string;
    diagnosis: string;
    clinicalNotes: string;
    treatmentPlan: string;
    prescriptionItems?: {
      medication_name: string;
      dosage: string;
      form: string;
      quantity: number;
      frequency: string;
      duration_days: number;
      instructions?: string;
    }[];
    prescriptionInstructions?: string;
  }) {
    const { data, error } = await this.client.rpc('complete_consultation_and_issue_prescription', {
      p_consultation_id: payload.consultationId,
      p_diagnosis: payload.diagnosis,
      p_clinical_notes: payload.clinicalNotes,
      p_treatment_plan: payload.treatmentPlan,
      p_prescription_items: (payload.prescriptionItems as unknown as Json) || null,
      p_prescription_instructions: payload.prescriptionInstructions || null,
    });

    if (error) throw error;
    return data as unknown as {
      consultation_id: string;
      prescription_id: string | null;
      prescription_code: string | null;
      status: string;
    };
  }

  /**
   * Platform Admin verifies, approves or suspends a doctor account
   */
  async verifyDoctor(doctorId: string, status: 'pending' | 'verified' | 'rejected' | 'suspended', notes?: string) {
    const { data, error } = await this.client.rpc('verify_doctor_account', {
      p_doctor_id: doctorId,
      p_status: status,
      p_notes: notes || null,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Updates patient's allergies & chronic conditions
   */
  async updateDossierSummary(
    dossierId: string,
    payload: {
      allergies?: string[];
      chronicConditions?: string[];
      pastMedicalHistory?: string;
      notes?: string;
    }
  ) {
    const { data, error } = await this.client
      .from('medical_dossiers')
      .update({
        allergies: payload.allergies,
        chronic_conditions: payload.chronicConditions,
        past_medical_history: payload.pastMedicalHistory,
        notes: payload.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dossierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
