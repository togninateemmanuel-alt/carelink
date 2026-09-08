<template>
  <AppLayout page-title="Tableau de bord">
    <!-- Hero welcome card -->
    <div class="hero-gradient mb-8" style="margin-bottom:var(--space-8)">
      <div style="position:relative;z-index:1">
        <p style="font-size:var(--font-size-sm);opacity:0.8;margin-bottom:var(--space-2);font-weight:500">Bonjour 👋</p>
        <h1 style="font-size:var(--font-size-3xl);font-weight:800;margin-bottom:var(--space-3);color:white">{{ authStore.fullName || 'Bienvenue !' }}</h1>
        <p style="opacity:0.8;max-width:500px;color:white;font-size:var(--font-size-sm)">Votre tableau de bord santé personnel. Gérez vos rendez-vous, ordonnances et commandes en toute sécurité.</p>
        <div style="margin-top:var(--space-6);display:flex;gap:var(--space-3)">
          <RouterLink to="/appointments/new" class="btn" style="background:white;color:var(--color-primary-700);font-weight:600">
            📅 Prendre un RDV
          </RouterLink>
          <RouterLink to="/marketplace" class="btn" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3)">
            💊 Marketplace
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid-4 mb-8" style="margin-bottom:var(--space-8)">
      <div class="stat-card">
        <div class="stat-icon blue">📅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.appointments }}</div>
          <div class="stat-label">RDV à venir</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon teal">📋</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.prescriptions }}</div>
          <div class="stat-label">Ordonnances actives</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">📦</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.orders }}</div>
          <div class="stat-label">Commandes en cours</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">🔔</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.notifications }}</div>
          <div class="stat-label">Notifications</div>
        </div>
      </div>
    </div>

    <!-- Two column layout -->
    <div style="display:grid;grid-template-columns:3fr 2fr;gap:var(--space-6)">
      <!-- Upcoming appointments -->
      <div class="card">
        <div class="flex items-center justify-between mb-4" style="margin-bottom:var(--space-5)">
          <h2 class="font-bold" style="font-size:var(--font-size-lg)">Prochains rendez-vous</h2>
          <RouterLink to="/appointments" class="btn btn-ghost btn-sm text-sm" style="color:var(--color-primary-600)">Voir tout →</RouterLink>
        </div>

        <div v-if="loadingAppointments" class="loading-overlay">
          <div class="spinner" />
        </div>

        <div v-else-if="appointments.length === 0" class="empty-state" style="padding:var(--space-8)">
          <div class="empty-icon">📅</div>
          <div class="empty-title">Aucun rendez-vous</div>
          <div class="empty-desc">Prenez votre premier rendez-vous médical en ligne.</div>
          <RouterLink to="/appointments/new" class="btn btn-primary btn-sm">Prendre un RDV</RouterLink>
        </div>

        <div v-else style="display:flex;flex-direction:column;gap:var(--space-3)">
          <div v-for="appt in appointments" :key="appt.id"
            style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-lg);transition:background var(--transition-fast)"
            @mouseover="($event.target as HTMLElement).closest('div')!.style.background='var(--color-neutral-50)'"
            @mouseleave="($event.target as HTMLElement).closest('div')!.style.background=''"
          >
            <div style="width:48px;height:48px;border-radius:var(--radius-lg);background:var(--color-primary-50);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-size:var(--font-size-lg);font-weight:800;color:var(--color-primary-700);line-height:1">{{ formatDay(appt.scheduled_at) }}</span>
              <span style="font-size:var(--font-size-xs);color:var(--color-primary-500);text-transform:uppercase;font-weight:600">{{ formatMonth(appt.scheduled_at) }}</span>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:var(--font-size-sm)" class="truncate">Dr. {{ appt.doctor_name }}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-sub)">{{ appt.reason_for_visit }}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px">{{ formatTime(appt.scheduled_at) }}</div>
            </div>
            <span class="badge" :class="statusBadge(appt.status)">{{ appt.status }}</span>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div style="display:flex;flex-direction:column;gap:var(--space-6)">
        <!-- Recent prescriptions -->
        <div class="card">
          <div class="flex items-center justify-between" style="margin-bottom:var(--space-4)">
            <h2 class="font-bold" style="font-size:var(--font-size-base)">Ordonnances récentes</h2>
            <RouterLink to="/prescriptions" class="btn btn-ghost btn-sm" style="color:var(--color-primary-600);font-size:var(--font-size-xs)">Voir →</RouterLink>
          </div>

          <div v-if="prescriptions.length === 0" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);font-size:var(--font-size-sm)">
            Aucune ordonnance
          </div>

          <div v-else style="display:flex;flex-direction:column;gap:var(--space-3)">
            <div v-for="rx in prescriptions" :key="rx.id"
              style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-radius:var(--radius-md);background:var(--color-neutral-50)">
              <div style="width:36px;height:36px;background:var(--color-primary-50);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">💊</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:var(--font-size-xs);font-weight:600" class="truncate">{{ rx.prescription_code }}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-muted)">{{ formatDate(rx.created_at) }}</div>
              </div>
              <span class="badge" :class="rx.status === 'active' ? 'badge-green' : 'badge-neutral'">{{ rx.status }}</span>
            </div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="card">
          <h2 class="font-bold mb-4" style="font-size:var(--font-size-base);margin-bottom:var(--space-4)">Accès rapide</h2>
          <div style="display:flex;flex-direction:column;gap:var(--space-2)">
            <RouterLink v-for="action in quickActions" :key="action.to" :to="action.to"
              style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-radius:var(--radius-md);font-size:var(--font-size-sm);color:var(--color-text-main);font-weight:500;transition:background var(--transition-fast)"
              @mouseover="($event.target as HTMLElement).closest('a')!.style.background='var(--color-neutral-50)'"
              @mouseleave="($event.target as HTMLElement).closest('a')!.style.background=''">
              <span style="font-size:1.2rem">{{ action.icon }}</span>
              <span>{{ action.label }}</span>
              <svg style="margin-left:auto;color:var(--color-text-muted)" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </RouterLink>
          </div>
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
const loadingAppointments = ref(false);
const appointments = ref<Record<string, unknown>[]>([]);
const prescriptions = ref<Record<string, unknown>[]>([]);
const stats = ref({ appointments: 0, prescriptions: 0, orders: 0, notifications: 0 });

const quickActions = [
  { to: '/dossier', icon: '📋', label: 'Mon dossier médical' },
  { to: '/marketplace', icon: '🔍', label: 'Rechercher un médicament' },
  { to: '/cart', icon: '🛒', label: 'Mon panier' },
  { to: '/profile', icon: '👤', label: 'Mon profil' },
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
    // Fetch upcoming appointments
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, scheduled_at, status, reason_for_visit, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name)')
      .eq('patient_id', authStore.user.id)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5);

    appointments.value = (appts ?? []).map((a: Record<string, unknown>) => ({
      ...a,
      doctor_name: `${(a.doctor as Record<string, string>)?.first_name} ${(a.doctor as Record<string, string>)?.last_name}`,
    }));

    // Fetch recent prescriptions
    const { data: rxs } = await supabase
      .from('prescriptions')
      .select('id, prescription_code, status, created_at')
      .eq('patient_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    prescriptions.value = rxs ?? [];

    // Count stats
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
