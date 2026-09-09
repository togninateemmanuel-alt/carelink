<template>
  <AppLayout page-title="Mes commandes">
    <div v-if="loading" class="dash-loading"><div class="spinner" /></div>

    <div v-else-if="orders.length === 0" class="dash-section dash-empty">
      <p class="dash-empty-title">Aucune commande</p>
      <p class="dash-empty-desc">Vos commandes marketplace apparaîtront ici.</p>
      <RouterLink to="/marketplace" class="btn btn-primary btn-sm">Marketplace</RouterLink>
    </div>

    <div v-else class="dash-list">
      <div v-for="o in orders" :key="o.id" class="dash-section" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <div>
            <div class="dash-list-title">{{ o.order_number }}</div>
            <div class="dash-list-meta">{{ formatDate(o.created_at) }}</div>
          </div>
          <span class="badge" :class="badge(o.status)">{{ o.status }}</span>
        </div>
        <div style="margin-top:8px;display:flex;justify-content:space-between;font-size:13px">
          <span>Total</span>
          <strong>{{ formatPrice(Number(o.total_amount)) }}</strong>
        </div>
        <div style="margin-top:4px;font-size:12px;color:var(--color-text-muted)">
          Paiement : {{ o.payment_status }}
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

const authStore = useAuthStore();
const loading = ref(true);
const orders = ref<any[]>([]);

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
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, status, total_amount, payment_status, created_at')
      .eq('patient_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(40);
    orders.value = data ?? [];
  } finally {
    loading.value = false;
  }
});
</script>
