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
   * Doctor requests or accepts a dossier transfer
   */
  async initiateDossierTransfer(payload: {
    dossierId: string;
    patientId: string;
    fromDoctorId: string;
    toDoctorId: string;
    transferReason: string;
    clinicalSummary?: string;
  }) {
    const { data, error } = await this.client
      .from('dossier_transfers')
      .insert({
        dossier_id: payload.dossierId,
        patient_id: payload.patientId,
        from_doctor_id: payload.fromDoctorId,
        to_doctor_id: payload.toDoctorId,
        transfer_reason: payload.transferReason,
        clinical_summary: payload.clinicalSummary,
        status: 'pending',
      })
      .select()
      .single();

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
