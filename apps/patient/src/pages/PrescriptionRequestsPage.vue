<template>
  <AppLayout page-title="Mes demandes">
    <div style="margin-bottom:12px">
      <RouterLink to="/prescriptions/new-request" class="btn btn-primary" style="width:100%">Nouvelle demande</RouterLink>
    </div>

    <div v-if="loading" class="dash-loading"><div class="spinner" /></div>

    <div v-else-if="items.length === 0" class="dash-section dash-empty">
      <p class="dash-empty-title">Aucune demande</p>
      <p class="dash-empty-desc">Créez une demande d’ordonnance / consultation hospitalière.</p>
    </div>

    <div v-else class="dash-list">
      <div v-for="r in items" :key="r.id" class="dash-section" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <div>
            <div class="dash-list-title">{{ r.hospital_name }}</div>
            <div class="dash-list-meta">{{ formatDate(r.created_at) }} · {{ r.consultation_type }}</div>
          </div>
          <span class="badge badge-blue">{{ r.request_status }}</span>
        </div>
        <p class="dash-list-sub" style="margin-top:8px">{{ r.symptoms }}</p>
        <div style="margin-top:8px;font-size:12px;color:var(--color-text-muted)">
          Priorité : {{ r.final_priority }}
          <span v-if="r.queue_number"> · File n° {{ r.queue_number }}</span>
          · Paiement : {{ r.payment_status }}
        </div>
        <p v-if="r.queue_number && r.request_status === 'waiting'" style="font-size:12px;margin-top:6px;color:var(--color-text-sub)">
          Temps d’attente estimé (non garanti) : ~{{ estimateWait(r) }} min
        </p>
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
const items = ref<any[]>([]);
const avgMinutes = ref(15);

function formatDate(d: string) {
  return new Date(d).toLocaleString('fr', { dateStyle: 'short', timeStyle: 'short' });
}

function estimateWait(r: any) {
  // Administrative estimate only
  const weight = r.final_priority === 'level_1' ? 0.5 : r.final_priority === 'level_2' ? 0.75 : 1;
  return Math.max(avgMinutes.value, Math.round(avgMinutes.value * weight));
}

onMounted(async () => {
  if (!authStore.user) return;
  loading.value = true;
  try {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'queue.avg_consultation_minutes')
      .maybeSingle();
    if (settings?.value != null) {
      const v = typeof settings.value === 'number' ? settings.value : Number(settings.value);
      if (!Number.isNaN(v) && v > 0) avgMinutes.value = v;
    }

    const { data } = await supabase
      .from('prescription_requests')
      .select('*, hospitals(name)')
      .eq('patient_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(40);

    items.value = (data ?? []).map((r: any) => ({
      ...r,
      hospital_name: r.hospitals?.name ?? 'Hôpital',
    }));
  } finally {
    loading.value = false;
  }
});
</script>
