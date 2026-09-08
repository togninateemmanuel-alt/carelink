/**
 * Shopping Cart, Multi-Pharmacy Orders & Anti-Race Stock Checkout Service
 * Project: CareLink Healthcare Platform
 */

import type { CareLinkSupabaseClient } from '../client';
import type { DeliveryModeType } from '@carelink/shared';

export class OrderService {
  constructor(private client: CareLinkSupabaseClient) {}

  /**
   * Retrieves or initializes patient's shopping cart
   */
  async getOrCreateCart(patientId: string) {
    let { data: cart } = await this.client
      .from('carts')
      .select('id')
      .eq('patient_id', patientId)
      .single();

    if (!cart) {
      const { data: newCart, error } = await this.client
        .from('carts')
        .insert({ patient_id: patientId })
        .select('id')
        .single();
      if (error) throw error;
      cart = newCart;
    }

    // Fetch items with product & pharmacy details
    const { data: items, error: itemsError } = await this.client
      .from('cart_items')
      .select(`
        *,
        product:products(*),
        pharmacy:pharmacies(id, name, address, city)
      `)
      .eq('cart_id', cart.id);

    if (itemsError) throw itemsError;

    return { cartId: cart.id, items: items || [] };
  }

  /**
   * Adds an item to cart or increments quantity
   */
  async addToCart(payload: {
    cartId: string;
    productId: string;
    pharmacyId: string;
    quantity: number;
    unitPrice: number;
  }) {
    const { data: existing } = await this.client
      .from('cart_items')
      .select('*')
      .eq('cart_id', payload.cartId)
      .eq('product_id', payload.productId)
      .single();

    if (existing) {
      const { data, error } = await this.client
        .from('cart_items')
        .update({
          quantity: existing.quantity + payload.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await this.client
        .from('cart_items')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  /**
   * Removes an item from cart
   */
  async removeFromCart(cartItemId: string) {
    const { error } = await this.client.from('cart_items').delete().eq('id', cartItemId);
    if (error) throw error;
  }

  /**
   * Places order with 100% Server-Side ACID Transaction via checkout_cart_atomic()
   * Pessimistic row locking, anti-tamper pricing from DB, insurance deduction,
   * fulfillment partitioning, in-app notifications and cart purge.
   */
  async checkoutAtomic(payload: {
    patientId: string;
    deliveryMode: DeliveryModeType;
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    patientInsuranceId?: string;
    patientNotes?: string;
  }) {
    const { data, error } = await this.client.rpc('checkout_cart_atomic', {
      p_patient_id: payload.patientId,
      p_delivery_mode: payload.deliveryMode,
      p_delivery_address: payload.deliveryAddress || null,
      p_delivery_city: payload.deliveryCity || null,
      p_delivery_latitude: payload.deliveryLatitude || null,
      p_delivery_longitude: payload.deliveryLongitude || null,
      p_patient_insurance_id: payload.patientInsuranceId || null,
      p_patient_notes: payload.patientNotes || null,
    });

    if (error) throw error;
    return data as unknown as {
      order_id: string;
      order_number: string;
      total_amount: number;
      insurance_amount: number;
      patient_amount: number;
      status: string;
    };
  }

  /**
   * Legacy checkout method (delegates to checkoutAtomic for transaction safety)
   */
  async checkoutOrder(payload: {
    patientId: string;
    cartId: string;
    items?: unknown[];
    deliveryMode: DeliveryModeType;
    deliveryAddress?: string;
    deliveryCity?: string;
    patientInsuranceId?: string;
    notes?: string;
  }) {
    return this.checkoutAtomic({
      patientId: payload.patientId,
      deliveryMode: payload.deliveryMode,
      deliveryAddress: payload.deliveryAddress,
      deliveryCity: payload.deliveryCity,
      patientInsuranceId: payload.patientInsuranceId,
      patientNotes: payload.notes,
    });
  }

  /**
   * Pharmacy updates fulfillment state (preparing, ready_for_pickup, completed)
   */
  async updateFulfillmentStatus(
    fulfillmentId: string,
    status: 'accepted' | 'preparing' | 'ready_for_pickup' | 'completed' | 'rejected',
    rejectionReason?: string
  ) {
    const { data, error } = await this.client
      .from('order_fulfillments')
      .update({
        status,
        rejection_reason: rejectionReason || null,
        prepared_at: status === 'ready_for_pickup' ? new Date().toISOString() : null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', fulfillmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
