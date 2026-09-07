/**
 * Appointment & Doctor Availability Service
 * Uses PostgreSQL transactional slot locking to prevent concurrent bookings
 * Project: CareLink Healthcare Platform
 */

import type { CareLinkSupabaseClient } from '../client';
import type { ConsultationModeType } from '@carelink/shared';

export class AppointmentService {
  constructor(private client: CareLinkSupabaseClient) {}

  /**
   * Fetches upcoming available slots for a given doctor
   */
  async getDoctorAvailableSlots(doctorId: string, fromDate?: string) {
    const from = fromDate || new Date().toISOString();
    const { data, error } = await this.client
      .from('doctor_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('status', 'available')
      .gte('start_time', from)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Doctor creates a new availability slot
   */
  async createSlot(payload: {
    doctorId: string;
    startTime: string;
    endTime: string;
    consultationMode: ConsultationModeType;
    capacity?: number;
  }) {
    const { data, error } = await this.client
      .from('doctor_slots')
      .insert({
        doctor_id: payload.doctorId,
        start_time: payload.startTime,
        end_time: payload.endTime,
        consultation_mode: payload.consultationMode,
        capacity: payload.capacity || 1,
        status: 'available',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Transactional appointment booking via book_appointment_slot() RPC
   * Applies row-level lock FOR UPDATE on doctor_slots
   */
  async bookSlot(payload: {
    patientId: string;
    slotId: string;
    reason: string;
    consultationMode?: ConsultationModeType;
  }): Promise<string> {
    const { data, error } = await this.client.rpc('book_appointment_slot', {
      p_patient_id: payload.patientId,
      p_slot_id: payload.slotId,
      p_reason: payload.reason,
      p_mode: payload.consultationMode || 'in_person',
    });

    if (error) throw error;
    return data as string; // Returns appointment_id
  }

  /**
   * Lists patient's appointments with doctor details
   */
  async getPatientAppointments(patientId: string) {
    const { data, error } = await this.client
      .from('appointments')
      .select(`
        *,
        doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name, avatar_url),
        slot:doctor_slots(*)
      `)
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Lists doctor's appointments with patient details
   */
  async getDoctorAppointments(doctorId: string) {
    const { data, error } = await this.client
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(id, first_name, last_name, phone, avatar_url),
        slot:doctor_slots(*)
      `)
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Cancels an appointment and frees the slot
   */
  async cancelAppointment(appointmentId: string, reason: string) {
    const { data, error } = await this.client
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
