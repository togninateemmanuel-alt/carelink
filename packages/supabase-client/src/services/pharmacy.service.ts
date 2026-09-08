/**
 * Pharmacy, Inventory & Marketplace Service
 * Manages pharmacy officine details, product catalog & immutable stock movements
 * Project: CareLink Healthcare Platform
 */

import type { CareLinkSupabaseClient } from '../client';
import { calculateDistanceKm } from '@carelink/shared';

export class PharmacyService {
  constructor(private client: CareLinkSupabaseClient) {}

  /**
   * Fetches active pharmacies sorted by proximity to patient location
   */
  async getNearbyPharmacies(patientLat?: number, patientLon?: number) {
    const { data, error } = await this.client
      .from('pharmacies')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    if (!data) return [];

    // Calculate client-side distance and sort
    const enriched = data.map((pharmacy) => {
      const distanceKm =
        patientLat !== undefined && patientLon !== undefined
          ? calculateDistanceKm(patientLat, patientLon, pharmacy.latitude, pharmacy.longitude)
          : null;
      return { ...pharmacy, distanceKm };
    });

    if (patientLat !== undefined && patientLon !== undefined) {
      enriched.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    return enriched;
  }

  /**
   * Searches marketplace products across all pharmacies with stock & distance
   */
  async searchMarketplaceProducts(options: {
    searchTerm?: string;
    categoryId?: string;
    patientLat?: number;
    patientLon?: number;
  }) {
    let query = this.client
      .from('products')
      .select(`
        *,
        pharmacy:pharmacies(*),
        stock:product_stocks(current_quantity, reserved_quantity)
      `)
      .eq('is_active', true);

    if (options.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    if (options.searchTerm) {
      query = query.ilike('name', `%${options.searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    // Attach distances and available quantities
    return data.map((prod) => {
      const distanceKm =
        options.patientLat !== undefined &&
        options.patientLon !== undefined &&
        prod.pharmacy
          ? calculateDistanceKm(
              options.patientLat,
              options.patientLon,
              prod.pharmacy.latitude,
              prod.pharmacy.longitude
            )
          : null;

      const currentQty = prod.stock?.[0]?.current_quantity ?? 0;
      const reservedQty = prod.stock?.[0]?.reserved_quantity ?? 0;
      const availableStock = Math.max(0, currentQty - reservedQty);

      return {
        ...prod,
        distanceKm,
        availableStock,
      };
    });
  }

  /**
   * Pharmacy creates a new catalog product
   */
  async createProduct(payload: {
    pharmacyId: string;
    categoryId?: string;
    name: string;
    brand?: string;
    genericName?: string;
    form: string;
    dosage: string;
    description?: string;
    price: number;
    isPrescriptionRequired?: boolean;
    imageUrl?: string;
    initialStock?: number;
  }) {
    const { data: product, error: prodError } = await this.client
      .from('products')
      .insert({
        pharmacy_id: payload.pharmacyId,
        category_id: payload.categoryId || null,
        name: payload.name,
        brand: payload.brand || null,
        generic_name: payload.genericName || null,
        form: payload.form,
        dosage: payload.dosage,
        description: payload.description || null,
        price: payload.price,
        is_prescription_required: payload.isPrescriptionRequired || false,
        image_url: payload.imageUrl || null,
      })
      .select()
      .single();

    if (prodError) throw prodError;

    // If initial stock provided, update and record movement
    if (payload.initialStock && payload.initialStock > 0) {
      await this.adjustStock({
        productId: product.id,
        pharmacyId: payload.pharmacyId,
        quantityChange: payload.initialStock,
        movementType: 'entry',
        referenceType: 'initial_stock',
        notes: 'Initialisation du stock à la création du produit',
      });
    }

    return product;
  }

  /**
   * Adjusts stock quantity and writes immutable stock_movement record
   */
  async adjustStock(payload: {
    productId: string;
    pharmacyId: string;
    quantityChange: number;
    movementType: 'entry' | 'adjustment' | 'return' | 'loss' | 'expiry';
    referenceType: string;
    referenceId?: string;
    notes?: string;
  }) {
    // 1. Get current stock
    const { data: curStock, error: stockFetchErr } = await this.client
      .from('product_stocks')
      .select('current_quantity')
      .eq('product_id', payload.productId)
      .single();

    if (stockFetchErr) throw stockFetchErr;

    const qtyBefore = curStock.current_quantity;
    const qtyAfter = qtyBefore + payload.quantityChange;

    if (qtyAfter < 0) {
      throw new Error(`Ajustement impossible : le stock deviendrait négatif (${qtyAfter}).`);
    }

    // 2. Update stock
    const { error: stockUpdateErr } = await this.client
      .from('product_stocks')
      .update({
        current_quantity: qtyAfter,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', payload.productId);

    if (stockUpdateErr) throw stockUpdateErr;

    // 3. Insert audit log in stock_movements
    const { error: moveErr } = await this.client.from('stock_movements').insert({
      product_id: payload.productId,
      pharmacy_id: payload.pharmacyId,
      movement_type: payload.movementType,
      quantity_change: payload.quantityChange,
      quantity_before: qtyBefore,
      quantity_after: qtyAfter,
      reference_type: payload.referenceType,
      reference_id: payload.referenceId || null,
      notes: payload.notes || null,
    });

    if (moveErr) throw moveErr;

    return { quantityBefore: qtyBefore, quantityAfter: qtyAfter };
  }

  /**
   * Fetches immutable stock movements audit history for a product or pharmacy
   */
  async getStockMovements(pharmacyId: string, productId?: string) {
    let query = this.client
      .from('stock_movements')
      .select(`
        *,
        product:products(name, form, dosage),
        actor:profiles(first_name, last_name)
      `)
      .eq('pharmacy_id', pharmacyId);

    if (productId) {
      query = query.eq('product_id', productId);
    }

  /**
   * Fast Geospatial & Multi-Criteria Marketplace Search via search_marketplace() RPC
   * Evaluates Haversine distance, joins stocks & pharmacies, and sorts server-side
   */
  async searchMarketplace(options: {
    query?: string;
    categoryId?: string;
    latitude?: number;
    longitude?: number;
    maxDistanceKm?: number;
    inStockOnly?: boolean;
    sortBy?: 'distance' | 'price_asc' | 'price_desc' | 'name' | 'stock_desc';
    limit?: number;
    offset?: number;
  }) {
    const { data, error } = await this.client.rpc('search_marketplace', {
      p_query: options.query || null,
      p_category_id: options.categoryId || null,
      p_latitude: options.latitude ?? null,
      p_longitude: options.longitude ?? null,
      p_max_distance_km: options.maxDistanceKm ?? null,
      p_in_stock_only: options.inStockOnly ?? true,
      p_sort_by: options.sortBy || 'distance',
      p_limit: options.limit || 50,
      p_offset: options.offset || 0,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Pharmacy staff responds to a patient-transferred prescription (accept, reject, dispense)
   */
  async respondToPrescriptionTransfer(payload: {
    transferId: string;
    status: 'accepted' | 'rejected' | 'dispensing' | 'completed' | 'cancelled';
    notes?: string;
  }) {
    const { data, error } = await this.client.rpc('respond_to_prescription_transfer', {
      p_transfer_id: payload.transferId,
      p_status: payload.status,
      p_response_notes: payload.notes || null,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Platform Admin verifies or suspends a pharmacy
   */
  async verifyPharmacy(pharmacyId: string, isVerified: boolean) {
    const { data, error } = await this.client.rpc('verify_pharmacy_account', {
      p_pharmacy_id: pharmacyId,
      p_is_verified: isVerified,
    });

    if (error) throw error;
    return data;
  }
}
