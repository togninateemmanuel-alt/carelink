<template>
  <div class="doc-app">
    <header class="doc-header">
      <div class="doc-brand">
        <div class="doc-logo">CL</div>
        <div>
          <div class="doc-brand-name">CareLink</div>
          <div class="doc-brand-role">Portail Médecin</div>
        </div>
      </div>
      <button v-if="session" class="doc-btn ghost" type="button" @click="signOut">Déconnexion</button>
    </header>

    <main class="doc-main">
      <!-- Auth -->
      <section v-if="!session" class="doc-card">
        <h1>Connexion médecin</h1>
        <p class="doc-muted">Accédez à votre agenda, consultations et ordonnances.</p>

        <div v-if="error" class="doc-alert">{{ error }}</div>

        <form @submit.prevent="signIn">
          <label class="doc-label">Email</label>
          <input v-model="email" type="email" class="doc-input" required />

          <label class="doc-label">Mot de passe</label>
          <input v-model="password" type="password" class="doc-input" required />

          <button class="doc-btn primary" type="submit" :disabled="loading">
            {{ loading ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>

        <p class="doc-note">
          Le compte doit avoir le rôle <strong>doctor</strong> dans la table profiles.
          L’élévation de rôle n’est pas possible depuis le frontend.
        </p>
      </section>

      <!-- Dashboard -->
      <template v-else>
        <section class="doc-card">
          <h1>Bonjour, Dr. {{ doctorName }}</h1>
          <p class="doc-muted">Statut : {{ verificationStatus }}</p>
        </section>

        <section class="doc-card">
          <h2>Prochains rendez-vous</h2>
          <div v-if="loadingAppts" class="doc-muted">Chargement…</div>
          <div v-else-if="appointments.length === 0" class="doc-muted">Aucun rendez-vous à venir.</div>
          <ul v-else class="doc-list">
            <li v-for="a in appointments" :key="a.id">
              <div>
                <strong>{{ a.patient_name }}</strong>
                <div class="doc-muted">{{ formatDt(a.scheduled_at) }} · {{ a.reason_for_visit }}</div>
              </div>
              <span class="doc-badge">{{ a.status }}</span>
            </li>
          </ul>
        </section>

        <section class="doc-card">
          <h2>Créneaux disponibles</h2>
          <div v-if="slots.length === 0" class="doc-muted">Aucun créneau libre publié.</div>
          <ul v-else class="doc-list">
            <li v-for="s in slots" :key="s.id">
              <div class="doc-muted">{{ formatDt(s.start_time) }} → {{ formatTime(s.end_time) }}</div>
              <span class="doc-badge">{{ s.status }}</span>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

const session = ref<Session | null>(null);
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const profile = ref<any>(null);
const appointments = ref<any[]>([]);
const slots = ref<any[]>([]);
const loadingAppts = ref(false);

const doctorName = computed(() => {
  if (!profile.value) return '';
  return `${profile.value.first_name ?? ''} ${profile.value.last_name ?? ''}`.trim();
});

const verificationStatus = computed(() => {
  const dp = Array.isArray(profile.value?.doctor_profiles)
    ? profile.value.doctor_profiles[0]
    : profile.value?.doctor_profiles;
  return dp?.verification_status ?? 'non renseigné';
});

function formatDt(d: string) {
  return new Date(d).toLocaleString('fr', { dateStyle: 'medium', timeStyle: 'short' });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
}

async function loadDoctorData() {
  if (!session.value?.user) return;

  const { data: p } = await supabase
    .from('profiles')
    .select('*, doctor_profiles(*)')
    .eq('id', session.value.user.id)
    .single();

  profile.value = p;

  if (p?.role && p.role !== 'doctor' && p.role !== 'platform_admin') {
    error.value = 'Ce compte n’a pas le rôle médecin.';
    await supabase.auth.signOut();
    session.value = null;
    return;
  }

  loadingAppts.value = true;
  try {
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, scheduled_at, status, reason_for_visit, patient:profiles!appointments_patient_id_fkey(first_name, last_name)')
      .eq('doctor_id', session.value.user.id)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20);

    appointments.value = (appts ?? []).map((a: any) => ({
      ...a,
      patient_name: `${a.patient?.first_name ?? ''} ${a.patient?.last_name ?? ''}`.trim() || 'Patient',
    }));

    const { data: slotRows } = await supabase
      .from('doctor_slots')
      .select('id, start_time, end_time, status')
      .eq('doctor_id', session.value.user.id)
      .eq('status', 'available')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(20);

    slots.value = slotRows ?? [];
  } finally {
    loadingAppts.value = false;
  }
}

async function signIn() {
  error.value = '';
  loading.value = true;
  try {
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (authErr) throw authErr;
    session.value = data.session;
    await loadDoctorData();
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Échec de connexion.';
  } finally {
    loading.value = false;
  }
}

async function signOut() {
  await supabase.auth.signOut();
  session.value = null;
  profile.value = null;
  appointments.value = [];
  slots.value = [];
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  if (session.value) await loadDoctorData();

  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s;
  });
});
</script>

<style>
:root {
  font-family: Inter, system-ui, sans-serif;
  color: #0f172a;
  background: #f1f5f9;
}
* { box-sizing: border-box; }
body { margin: 0; }
.doc-app { min-height: 100vh; }
.doc-header {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: rgba(255,255,255,.95);
  border-bottom: 1px solid #e2e8f0;
}
.doc-brand { display: flex; align-items: center; gap: 10px; }
.doc-logo {
  width: 36px; height: 36px; border-radius: 10px; color: #fff; font-weight: 800;
  display: grid; place-items: center;
  background: linear-gradient(135deg, #1677e8, #0aa38c);
}
.doc-brand-name { font-weight: 700; font-size: 14px; }
.doc-brand-role { font-size: 11px; color: #1677e8; font-weight: 600; text-transform: uppercase; }
.doc-main { max-width: 720px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
.doc-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
}
.doc-card h1 { margin: 0 0 6px; font-size: 22px; }
.doc-card h2 { margin: 0 0 12px; font-size: 16px; }
.doc-muted { color: #64748b; font-size: 13px; margin: 0 0 12px; }
.doc-label { display: block; font-size: 13px; font-weight: 600; margin: 10px 0 6px; }
.doc-input {
  width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px;
  font-size: 14px; margin-bottom: 8px;
}
.doc-btn {
  border: none; border-radius: 10px; padding: 12px 14px; font-weight: 600; cursor: pointer;
}
.doc-btn.primary { width: 100%; margin-top: 8px; background: #1677e8; color: #fff; }
.doc-btn.ghost { background: transparent; color: #64748b; }
.doc-alert {
  background: #fef2f2; color: #dc2626; border-left: 4px solid #ef4444;
  padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px;
}
.doc-note { font-size: 12px; color: #64748b; margin-top: 14px; }
.doc-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.doc-list li {
  display: flex; justify-content: space-between; gap: 10px; align-items: flex-start;
  padding: 10px; border-radius: 12px; background: #f8fafc;
}
.doc-badge {
  font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 999px;
  background: #eff8ff; color: #1a62d5; white-space: nowrap;
}
</style>
