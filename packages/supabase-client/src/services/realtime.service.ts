/**
 * Realtime Event Subscription Service
 * Subscribes to Supabase Realtime Channels for instantaneous UI synchronization
 * Project: CareLink Healthcare Platform
 */

import type { CareLinkSupabaseClient } from '../client';
import type { Database } from '@carelink/shared';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type FulfillmentRow = Database['public']['Tables']['order_fulfillments']['Row'];
type TransferRow = Database['public']['Tables']['prescription_pharmacy_transfers']['Row'];
type StockRow = Database['public']['Tables']['product_stocks']['Row'];

export class RealtimeService {
  constructor(private client: CareLinkSupabaseClient) {}

  /**
   * Subscribes to real-time notifications for a specific user
   */
  subscribeToNotifications(userId: string, onNotification: (payload: NotificationRow) => void) {
    return this.client
      .channel(`user-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          onNotification(payload.new as NotificationRow);
        }
      )
      .subscribe();
  }

  /**
   * Doctor subscribes to appointment bookings & changes
   */
  subscribeToDoctorAppointments(doctorId: string, onUpdate: (payload: AppointmentRow) => void) {
    return this.client
      .channel(`doctor-appointments:${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload) => {
          onUpdate(payload.new as AppointmentRow);
        }
      )
      .subscribe();
  }

  /**
   * Pharmacy subscribes to new order fulfillments in real-time
   */
  subscribeToPharmacyFulfillments(pharmacyId: string, onUpdate: (payload: FulfillmentRow) => void) {
    return this.client
      .channel(`pharmacy-orders:${pharmacyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_fulfillments',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        (payload) => {
          onUpdate(payload.new as FulfillmentRow);
        }
      )
      .subscribe();
  }

  /**
   * Pharmacy subscribes to prescription transfers in real-time
   */
  subscribeToPrescriptionTransfers(pharmacyId: string, onUpdate: (payload: TransferRow) => void) {
    return this.client
      .channel(`pharmacy-transfers:${pharmacyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescription_pharmacy_transfers',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        (payload) => {
          onUpdate(payload.new as TransferRow);
        }
      )
      .subscribe();
  }

  /**
   * Real-time listener for product stock updates
   */
  subscribeToStockUpdates(pharmacyId: string, onUpdate: (payload: StockRow) => void) {
    return this.client
      .channel(`pharmacy-stocks:${pharmacyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'product_stocks',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        (payload) => {
          onUpdate(payload.new as StockRow);
        }
      )
      .subscribe();
  }
}
