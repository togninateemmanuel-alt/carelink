import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './auth';

interface CartItem {
  id: string;
  product_id: string;
  pharmacy_id: string;
  quantity: number;
  unit_price: number;
  products?: {
    id: string;
    name: string;
    brand: string | null;
    form: string;
    image_url: string | null;
    pharmacy_id: string;
  };
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);
  const loading = ref(false);
  const cartId = ref<string | null>(null);

  const totalItems = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0));
  const totalAmount = computed(() =>
    items.value.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
  );

  async function fetchCart() {
    const authStore = useAuthStore();
    if (!authStore.user) return;

    loading.value = true;
    try {
      // Get cart id
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('patient_id', authStore.user.id)
        .single();

      if (!cart) {
        items.value = [];
        return;
      }

      cartId.value = cart.id;

      const { data } = await supabase
        .from('cart_items')
        .select('*, products(id, name, brand, form, image_url, pharmacy_id)')
        .eq('cart_id', cart.id);

      items.value = (data as CartItem[]) ?? [];
    } finally {
      loading.value = false;
    }
  }

  async function addItem(productId: string, pharmacyId: string, unitPrice: number, quantity = 1) {
    const authStore = useAuthStore();
    if (!authStore.user) return;

    // Ensure cart exists
    if (!cartId.value) {
      const { data: existingCart } = await supabase
        .from('carts')
        .select('id')
        .eq('patient_id', authStore.user.id)
        .single();

      if (existingCart) {
        cartId.value = existingCart.id;
      } else {
        const { data: newCart } = await supabase
          .from('carts')
          .insert({ patient_id: authStore.user.id })
          .select('id')
          .single();
        cartId.value = newCart?.id ?? null;
      }
    }

    if (!cartId.value) return;

    // Check if item already exists
    const existing = items.value.find(i => i.product_id === productId && i.pharmacy_id === pharmacyId);

    if (existing) {
      await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('cart_items')
        .insert({
          cart_id: cartId.value,
          product_id: productId,
          pharmacy_id: pharmacyId,
          unit_price: unitPrice,
          quantity,
        });
    }

    await fetchCart();
  }

  async function removeItem(itemId: string) {
    await supabase.from('cart_items').delete().eq('id', itemId);
    items.value = items.value.filter(i => i.id !== itemId);
  }

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) return removeItem(itemId);
    await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
    const item = items.value.find(i => i.id === itemId);
    if (item) item.quantity = quantity;
  }

  async function checkout(
    deliveryMode: string,
    deliveryAddress?: string,
    deliveryCity?: string,
    patientInsuranceId?: string,
    patientNotes?: string
  ) {
    const authStore = useAuthStore();
    if (!authStore.user) throw new Error('Non authentifié');

    const { data, error } = await supabase.rpc('checkout_cart_atomic', {
      p_patient_id: authStore.user.id,
      p_delivery_mode: deliveryMode,
      p_delivery_address: deliveryAddress ?? null,
      p_delivery_city: deliveryCity ?? null,
      p_delivery_latitude: null,
      p_delivery_longitude: null,
      p_patient_insurance_id: patientInsuranceId ?? null,
      p_patient_notes: patientNotes ?? null,
    });

    if (error) throw error;

    items.value = [];
    return data;
  }

  return {
    items,
    loading,
    cartId,
    totalItems,
    totalAmount,
    fetchCart,
    addItem,
    removeItem,
    updateQuantity,
    checkout,
  };
});
