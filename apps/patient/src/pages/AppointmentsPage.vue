<template>
  <AppLayout page-title="Rendez-vous">
    <div style="margin-bottom:12px">
      <RouterLink to="/appointments/new" class="btn btn-primary" style="width:100%">Prendre un rendez-vous</RouterLink>
    </div>

    <div v-if="loading" class="dash-loading"><div class="spinner" /></div>

    <div v-else-if="appointments.length === 0" class="dash-section dash-empty">
      <p class="dash-empty-title">Aucun rendez-vous</p>
      <p class="dash-empty-desc">Réservez une consultation avec un médecin disponible.</p>
      <RouterLink to="/appointments/new" class="btn btn-primary btn-sm">Nouveau RDV</RouterLink>
    </div>

    <div v-else class="dash-list">
      <div v-for="a in appointments" :key="a.id" class="dash-section dash-list-item" style="margin-bottom:10px">
        <div class="dash-date-box">
          <span class="dash-date-day">{{ day(a.scheduled_at) }}</span>
          <span class="dash-date-month">{{ month(a.scheduled_at) }}</span>
        </div>
        <div class="dash-list-body">
          <div class="dash-list-title">Dr. {{ a.doctor_name }}</div>
          <div class="dash-list-sub">{{ a.reason_for_visit }}</div>
          <div class="dash-list-meta">{{ time(a.scheduled_at) }} · {{ a.consultation_mode }}</div>
        </div>
        <span class="badge" :class="badge(a.status)">{{ a.status }}</span>
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

interface Appt {
  id: string;
  scheduled_at: string;
  status: string;
  reason_for_visit: string;
  consultation_mode: string;
  doctor_name: string;
}

const appointments = ref<Appt[]>([]);

function day(d: string) { return new Date(d).getDate(); }
function month(d: string) { return new Date(d).toLocaleString('fr', { month: 'short' }); }
function time(d: string) { return new Date(d).toLocaleString('fr', { dateStyle: 'short', timeStyle: 'short' }); }
function badge(s: string) {
  const m: Record<string, string> = {
    confirmed: 'badge-green', requested: 'badge-blue', cancelled: 'badge-red',
    completed: 'badge-neutral', no_show: 'badge-amber',
  };
  return m[s] ?? 'badge-neutral';
}

onMounted(async () => {
  if (!authStore.user) return;
  loading.value = true;
  try {
    const { data } = await supabase
      .from('appointments')
      .select('id, scheduled_at, status, reason_for_visit, consultation_mode, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name)')
      .eq('patient_id', authStore.user.id)
      .order('scheduled_at', { ascending: false })
      .limit(50);

    appointments.value = (data ?? []).map((row: any) => ({
      id: row.id,
      scheduled_at: row.scheduled_at,
      status: row.status,
      reason_for_visit: row.reason_for_visit,
      consultation_mode: row.consultation_mode,
      doctor_name: `${row.doctor?.first_name ?? ''} ${row.doctor?.last_name ?? ''}`.trim() || 'Médecin',
    }));
  } finally {
    loading.value = false;
  }
});
</script>
