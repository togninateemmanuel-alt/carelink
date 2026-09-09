<template>
  <AppLayout page-title="Tableau de bord">
    <!-- Welcome card -->
    <section class="dash-hero">
      <div class="dash-hero-content">
        <p class="dash-hero-hello">Bonjour 👋</p>
        <h1 class="dash-hero-name">{{ authStore.fullName || 'Bienvenue' }}</h1>
        <p class="dash-hero-sub">Votre espace santé personnel</p>
        <div class="dash-hero-actions">
          <RouterLink to="/appointments/new" class="dash-btn dash-btn-light">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Prendre RDV
          </RouterLink>
          <RouterLink to="/marketplace" class="dash-btn dash-btn-ghost">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
            Pharmacie
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="dash-stats">
      <div class="dash-stat">
        <div class="dash-stat-icon blue">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <div>
          <div class="dash-stat-value">{{ stats.appointments }}</div>
          <div class="dash-stat-label">RDV à venir</div>
        </div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-icon teal">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <div class="dash-stat-value">{{ stats.prescriptions }}</div>
          <div class="dash-stat-label">Ordonnances</div>
        </div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-icon green">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <div>
          <div class="dash-stat-value">{{ stats.orders }}</div>
          <div class="dash-stat-label">Commandes</div>
        </div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-icon amber">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <div>
          <div class="dash-stat-value">{{ stats.notifications }}</div>
          <div class="dash-stat-label">Alertes</div>
        </div>
      </div>
    </section>

    <!-- Appointments -->
    <section class="dash-section">
      <div class="dash-section-header">
        <h2>Prochains RDV</h2>
        <RouterLink to="/appointments" class="dash-link">Voir tout</RouterLink>
      </div>

      <div v-if="loadingAppointments" class="dash-loading">
        <div class="spinner" />
      </div>

      <div v-else-if="appointments.length === 0" class="dash-empty">
        <div class="dash-empty-icon">
          <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <p class="dash-empty-title">Aucun rendez-vous</p>
        <p class="dash-empty-desc">Réservez votre première consultation en ligne.</p>
        <RouterLink to="/appointments/new" class="btn btn-primary btn-sm">Prendre un RDV</RouterLink>
      </div>

      <div v-else class="dash-list">
        <div v-for="appt in appointments" :key="appt.id" class="dash-list-item">
          <div class="dash-date-box">
            <span class="dash-date-day">{{ formatDay(appt.scheduled_at) }}</span>
            <span class="dash-date-month">{{ formatMonth(appt.scheduled_at) }}</span>
          </div>
          <div class="dash-list-body">
            <div class="dash-list-title">Dr. {{ appt.doctor_name }}</div>
            <div class="dash-list-sub">{{ appt.reason_for_visit || 'Consultation' }}</div>
            <div class="dash-list-meta">{{ formatTime(appt.scheduled_at) }}</div>
          </div>
          <span class="badge" :class="statusBadge(appt.status)">{{ appt.status }}</span>
        </div>
      </div>
    </section>

    <!-- Prescriptions -->
    <section class="dash-section">
      <div class="dash-section-header">
        <h2>Ordonnances récentes</h2>
        <RouterLink to="/prescriptions" class="dash-link">Voir tout</RouterLink>
      </div>

      <div v-if="prescriptions.length === 0" class="dash-empty compact">
        <p class="dash-empty-desc">Aucune ordonnance pour le moment.</p>
      </div>

      <div v-else class="dash-list">
        <div v-for="rx in prescriptions" :key="rx.id" class="dash-list-item">
          <div class="dash-rx-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
          </div>
          <div class="dash-list-body">
            <div class="dash-list-title">{{ rx.prescription_code }}</div>
            <div class="dash-list-meta">{{ formatDate(rx.created_at) }}</div>
          </div>
          <span class="badge" :class="rx.status === 'active' ? 'badge-green' : 'badge-neutral'">{{ rx.status }}</span>
        </div>
      </div>
    </section>

    <!-- Quick actions -->
    <section class="dash-section">
      <div class="dash-section-header">
        <h2>Accès rapide</h2>
      </div>
      <div class="dash-quick">
        <RouterLink v-for="action in quickActions" :key="action.to" :to="action.to" class="dash-quick-item">
          <span class="dash-quick-icon" v-html="action.icon" />
          <span class="dash-quick-label">{{ action.label }}</span>
          <svg class="dash-quick-arrow" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </RouterLink>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

const authStore = useAuthStore();
const loadingAppointments = ref(false);

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  reason_for_visit: string | null;
  doctor_name: string;
}

interface AppointmentQuery extends Omit<Appointment, 'doctor_name'> {
  doctor: { first_name: string; last_name: string } | null;
}

interface Prescription {
  id: string;
  prescription_code: string;
  status: string;
  created_at: string;
}

const appointments = ref<Appointment[]>([]);
const prescriptions = ref<Prescription[]>([]);
const stats = ref({ appointments: 0, prescriptions: 0, orders: 0, notifications: 0 });

const quickActions = [
  {
    to: '/dossier',
    label: 'Mon dossier médical',
    icon: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
  },
  {
    to: '/marketplace',
    label: 'Rechercher un médicament',
    icon: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`,
  },
  {
    to: '/cart',
    label: 'Mon panier',
    icon: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
  },
  {
    to: '/profile',
    label: 'Mon profil',
    icon: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
  },
];

function formatDay(dt: string) { return new Date(dt).getDate(); }
function formatMonth(dt: string) { return new Date(dt).toLocaleString('fr', { month: 'short' }); }
function formatTime(dt: string) { return new Date(dt).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }); }
function formatDate(dt: string) { return new Date(dt).toLocaleDateString('fr'); }
function statusBadge(status: string) {
  const map: Record<string, string> = {
    confirmed: 'badge-green', requested: 'badge-blue', cancelled: 'badge-red',
    completed: 'badge-neutral', in_progress: 'badge-teal',
  };
  return map[status] ?? 'badge-neutral';
}

onMounted(async () => {
  if (!authStore.user) return;

  loadingAppointments.value = true;
  try {
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, scheduled_at, status, reason_for_visit, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name)')
      .eq('patient_id', authStore.user.id)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5);

    const appointmentData = (appts ?? []) as unknown as AppointmentQuery[];
    appointments.value = appointmentData.map((a) => ({
      ...a,
      doctor_name: `${a.doctor?.first_name ?? ''} ${a.doctor?.last_name ?? ''}`.trim() || 'Médecin',
    }));

    const { data: rxs } = await supabase
      .from('prescriptions')
      .select('id, prescription_code, status, created_at')
      .eq('patient_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    prescriptions.value = (rxs ?? []) as Prescription[];

    const [{ count: apptCount }, { count: rxCount }, { count: orderCount }, { count: notifCount }] =
      await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('patient_id', authStore.user.id).gte('scheduled_at', new Date().toISOString()),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('patient_id', authStore.user.id).eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('patient_id', authStore.user.id).not('status', 'in', '("completed","cancelled")'),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', authStore.user.id).eq('is_read', false),
      ]);

    stats.value = {
      appointments: apptCount ?? 0,
      prescriptions: rxCount ?? 0,
      orders: orderCount ?? 0,
      notifications: notifCount ?? 0,
    };
  } finally {
    loadingAppointments.value = false;
  }
});
</script>
