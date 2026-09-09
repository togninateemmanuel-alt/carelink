<template>
  <AppLayout page-title="Marketplace">
    <div class="form-group">
      <input
        v-model="query"
        class="input"
        placeholder="Rechercher un médicament…"
        @keyup.enter="search"
      />
    </div>
    <button class="btn btn-primary" style="width:100%;margin-bottom:14px" :disabled="loading" @click="search">
      {{ loading ? 'Recherche…' : 'Rechercher' }}
    </button>

    <div v-if="error" class="alert alert-error" style="margin-bottom:12px">{{ error }}</div>

    <div v-if="results.length === 0 && !loading" class="dash-section dash-empty compact">
      <p class="dash-empty-desc">Aucun produit trouvé. Essayez un autre mot-clé.</p>
    </div>

    <div class="dash-list">
      <div v-for="p in results" :key="p.product_id + p.pharmacy_id" class="dash-section" style="margin-bottom:10px">
        <div class="dash-list-title">{{ p.product_name }}</div>
        <div class="dash-list-sub">{{ p.brand || p.generic_name || p.form }} · {{ p.dosage }}</div>
        <div class="dash-list-meta" style="margin:6px 0">
          {{ p.pharmacy_name }} · {{ p.pharmacy_city }}
          <span v-if="p.distance_km != null"> · {{ p.distance_km }} km</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <strong>{{ formatPrice(p.price) }}</strong>
          <button class="btn btn-primary btn-sm" :disabled="p.current_stock <= 0" @click="add(p)">
            {{ p.current_stock <= 0 ? 'Rupture' : 'Ajouter' }}
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useCartStore } from '@/stores/cart';
import { supabase } from '@/lib/supabase';

const cartStore = useCartStore();
const query = ref('');
const loading = ref(false);
const error = ref('');
const results = ref<any[]>([]);

function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

async function search() {
  loading.value = true;
  error.value = '';
  try {
    // Prefer RPC if available
    const { data, error: rpcErr } = await supabase.rpc('search_marketplace', {
      p_query: query.value || null,
      p_lat: null,
      p_lon: null,
      p_radius_km: null,
      p_limit: 40,
    });

    if (!rpcErr && data) {
      results.value = data as any[];
      return;
    }

    // Fallback direct query
    let q = supabase
      .from('products')
      .select('id, name, brand, generic_name, form, dosage, price, currency, pharmacy_id, pharmacies(name, city, is_active, is_verified), product_stocks(current_quantity)')
      .limit(40);

    if (query.value.trim()) {
      q = q.or(`name.ilike.%${query.value}%,brand.ilike.%${query.value}%,generic_name.ilike.%${query.value}%`);
    }

    const { data: products, error: qErr } = await q;
    if (qErr) throw qErr;

    results.value = (products ?? [])
      .filter((p: any) => p.pharmacies?.is_active !== false)
      .map((p: any) => ({
        product_id: p.id,
        product_name: p.name,
        brand: p.brand,
        generic_name: p.generic_name,
        form: p.form,
        dosage: p.dosage,
        price: Number(p.price),
        pharmacy_id: p.pharmacy_id,
        pharmacy_name: p.pharmacies?.name ?? 'Pharmacie',
        pharmacy_city: p.pharmacies?.city ?? '',
        current_stock: p.product_stocks?.[0]?.current_quantity ?? p.product_stocks?.current_quantity ?? 0,
        distance_km: null,
      }));
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Erreur de recherche.';
  } finally {
    loading.value = false;
  }
}

async function add(p: any) {
  try {
    await cartStore.addItem(p.product_id, p.pharmacy_id, Number(p.price), 1);
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Impossible d\'ajouter au panier.';
  }
}

onMounted(() => {
  search();
});
</script>
