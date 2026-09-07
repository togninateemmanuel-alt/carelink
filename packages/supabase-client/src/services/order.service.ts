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
   * Places order with Pessimistic Stock Lock via reserve_and_decrement_stock() RPC
   * Partitions fulfillments across pharmacies
   */
  async checkoutOrder(payload: {
    patientId: string;
    cartId: string;
    items: {
      productId: string;
      productName: string;
      pharmacyId: string;
      quantity: number;
      unitPrice: number;
    }[];
    deliveryMode: DeliveryModeType;
    deliveryAddress?: string;
    insuranceAmount?: number;
    notes?: string;
  }) {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Le panier est vide.');
    }

    const totalAmount = payload.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const insurancePart = payload.insuranceAmount || 0;
    const patientPart = Math.max(0, totalAmount - insurancePart);

    // 1. Create parent order
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .insert({
        patient_id: payload.patientId,
        total_amount: totalAmount,
        insurance_amount: insurancePart,
        patient_amount: patientPart,
        status: 'pending',
        payment_status: 'pending',
        delivery_mode: payload.deliveryMode,
        delivery_address: payload.deliveryAddress || null,
        patient_notes: payload.notes || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Group items by pharmacy_id
    const pharmacyGroups = new Map<string, typeof payload.items>();
    for (const item of payload.items) {
      const group = pharmacyGroups.get(item.pharmacyId) || [];
      group.push(item);
      pharmacyGroups.set(item.pharmacyId, group);
    }

    // 3. Create fulfillments and items per pharmacy
    for (const [pharmacyId, groupItems] of pharmacyGroups.entries()) {
      const subtotal = groupItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const fulfillmentNumber = `FUL-${Date.now().toString().slice(-6)}-${pharmacyId.slice(0, 4).toUpperCase()}`;

      const { data: fulfillment, error: fulError } = await this.client
        .from('order_fulfillments')
        .insert({
          order_id: order.id,
          pharmacy_id: pharmacyId,
          fulfillment_number: fulfillmentNumber,
          subtotal_amount: subtotal,
          status: 'pending',
        })
        .select()
        .single();

      if (fulError) throw fulError;

      const orderItemsToInsert = groupItems.map((gi) => ({
        order_fulfillment_id: fulfillment.id,
        product_id: gi.productId,
        product_name: gi.productName,
        quantity: gi.quantity,
        unit_price: gi.unitPrice,
        total_price: gi.unitPrice * gi.quantity,
      }));

      const { error: itemsErr } = await this.client
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsErr) throw itemsErr;
    }

    // 4. TRANSACTIONAL STOCK DECREMENT VIA POSTGRESQL RPC
    // Applies FOR UPDATE row locking and rejects if stock is insufficient
    const rpcPayload = payload.items.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
    }));

    const { error: rpcError } = await this.client.rpc('reserve_and_decrement_stock', {
      p_order_id: order.id,
      p_items: rpcPayload,
    });

    if (rpcError) {
      // Mark order as cancelled if decrement failed
      await this.client
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);
      throw new Error(`Échec de la commande : ${rpcError.message}`);
    }

    // 5. Clear cart
    await this.client.from('cart_items').delete().eq('cart_id', payload.cartId);

    return order;
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
