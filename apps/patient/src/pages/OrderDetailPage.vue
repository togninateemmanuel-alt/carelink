<template>
  <AppLayout page-title="Détail commande">
    <div v-if="loading" class="dash-loading"><div class="spinner" /></div>

    <div v-else-if="!order" class="dash-section dash-empty">
      <p class="dash-empty-title">Commande introuvable</p>
      <RouterLink to="/orders" class="btn btn-primary btn-sm">Retour</RouterLink>
    </div>

    <template v-else>
      <section class="dash-section">
        <div class="dash-section-header">
          <h2>{{ order.order_number }}</h2>
          <span class="badge" :class="badge(order.status)">{{ order.status }}</span>
        </div>
        <p class="dash-list-meta">{{ formatDate(order.created_at) }}</p>
        <div style="margin-top:12px;display:grid;gap:6px;font-size:13px">
          <div style="display:flex;justify-content:space-between"><span>Total</span><strong>{{ formatPrice(Number(order.total_amount)) }}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Assurance</span><span>{{ formatPrice(Number(order.insurance_amount || 0)) }}</span></div>
          <div style="display:flex;justify-content:space-between"><span>À charge</span><strong>{{ formatPrice(Number(order.patient_amount || order.total_amount)) }}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Paiement</span><span>{{ order.payment_status }}</span></div>
        </div>
      </section>

      <section v-for="f in fulfillments" :key="f.id" class="dash-section">
        <div class="dash-section-header">
          <h2>{{ f.pharmacy_name }}</h2>
          <span class="badge badge-teal">{{ f.status }}</span>
        </div>
        <p class="dash-list-meta">{{ f.fulfillment_number }} · {{ formatPrice(Number(f.subtotal_amount)) }}</p>
        <div class="dash-list" style="margin-top:10px">
          <div v-for="it in f.items" :key="it.id" class="dash-list-item">
            <div class="dash-list-body">
              <div class="dash-list-title">{{ it.product_name }}</div>
              <div class="dash-list-meta">x{{ it.quantity }} · {{ formatPrice(Number(it.unit_price)) }}</div>
            </div>
            <strong style="font-size:13px">{{ formatPrice(Number(it.total_price)) }}</strong>
          </div>
        </div>
      </section>

      <RouterLink to="/orders" class="btn btn-secondary" style="width:100%">Retour aux commandes</RouterLink>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

const route = useRoute();
const authStore = useAuthStore();
const loading = ref(true);
const order = ref<any>(null);
const fulfillments = ref<any[]>([]);

function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}
function formatDate(d: string) {
  return new Date(d).toLocaleString('fr', { dateStyle: 'medium', timeStyle: 'short' });
}
function badge(s: string) {
  const m: Record<string, string> = {
    pending: 'badge-amber', confirmed: 'badge-blue', processing: 'badge-teal',
    ready: 'badge-green', fulfilled: 'badge-green', cancelled: 'badge-red',
  };
  return m[s] ?? 'badge-neutral';
}

onMounted(async () => {
  if (!authStore.user) return;
  loading.value = true;
  try {
    const id = String(route.params.id);
    const { data: o } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('patient_id', authStore.user.id)
      .maybeSingle();

    order.value = o;
    if (!o) return;

    const { data: ful } = await supabase
      .from('order_fulfillments')
      .select(`
        id, fulfillment_number, status, subtotal_amount, created_at,
        pharmacies(name),
        order_items(id, product_name, quantity, unit_price, total_price)
      `)
      .eq('order_id', o.id);

    fulfillments.value = (ful ?? []).map((f: any) => ({
      ...f,
      pharmacy_name: f.pharmacies?.name ?? 'Pharmacie',
      items: f.order_items ?? [],
    }));
  } finally {
    loading.value = false;
  }
});
</script>
