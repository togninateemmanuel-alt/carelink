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
      <section v-if="!session" class="doc-card">
        <h1>Connexion médecin</h1>
        <p class="doc-muted">Agenda, consultations et ordonnances.</p>
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
        <p class="doc-note">Le rôle <strong>doctor</strong> doit être défini en base. Impossible de s’auto-promouvoir.</p>
      </section>

      <template v-else>
        <section class="doc-card">
          <h1>Dr. {{ doctorName }}</h1>
          <p class="doc-muted">Vérification : {{ verificationStatus }}</p>
        </section>

        <section v-if="activeConsultation" class="doc-card">
          <h2>Consultation en cours</h2>
          <p class="doc-muted">Patient : {{ activeConsultation.patient_name }}</p>
          <div v-if="consultError" class="doc-alert">{{ consultError }}</div>
          <div v-if="consultSuccess" class="doc-success">{{ consultSuccess }}</div>

          <label class="doc-label">Diagnostic</label>
          <textarea v-model="consultForm.diagnosis" class="doc-input" rows="2" />
          <label class="doc-label">Notes cliniques</label>
          <textarea v-model="consultForm.clinical_notes" class="doc-input" rows="3" />
          <label class="doc-label">Plan de traitement</label>
          <textarea v-model="consultForm.treatment_plan" class="doc-input" rows="2" />

          <h3 class="doc-sub">Ordonnance (optionnelle)</h3>
          <div v-for="(item, idx) in consultForm.items" :key="idx" class="rx-row">
            <input v-model="item.medication_name" class="doc-input" placeholder="Médicament" />
            <input v-model="item.dosage" class="doc-input" placeholder="Dosage" />
            <input v-model="item.form" class="doc-input" placeholder="Forme" />
            <input v-model.number="item.quantity" type="number" min="1" class="doc-input" placeholder="Qté" />
            <input v-model="item.frequency" class="doc-input" placeholder="Fréquence" />
            <input v-model.number="item.duration_days" type="number" min="1" class="doc-input" placeholder="Jours" />
            <button type="button" class="doc-btn ghost" @click="removeRxItem(idx)">Retirer</button>
          </div>
          <button type="button" class="doc-btn ghost" @click="addRxItem">+ Ligne médicament</button>

          <label class="doc-label">Instructions ordonnance</label>
          <input v-model="consultForm.rx_instructions" class="doc-input" />

          <button class="doc-btn primary" type="button" :disabled="completing" @click="completeConsultation">
            {{ completing ? 'Clôture…' : 'Clôturer (+ ordonnance si renseignée)' }}
          </button>
          <button class="doc-btn ghost" type="button" style="width:100%;margin-top:8px" @click="cancelConsultationPanel">Annuler</button>
        </section>

        <section v-else class="doc-card">
          <h2>Publier un créneau</h2>
          <div v-if="slotError" class="doc-alert">{{ slotError }}</div>
          <div v-if="slotSuccess" class="doc-success">{{ slotSuccess }}</div>
          <label class="doc-label">Début</label>
          <input v-model="newSlot.start" type="datetime-local" class="doc-input" />
          <label class="doc-label">Fin</label>
          <input v-model="newSlot.end" type="datetime-local" class="doc-input" />
          <label class="doc-label">Mode</label>
          <select v-model="newSlot.mode" class="doc-input">
            <option value="in_person">Présentiel</option>
            <option value="teleconsultation">Téléconsultation</option>
          </select>
          <button class="doc-btn primary" type="button" :disabled="savingSlot" @click="createSlot">
            {{ savingSlot ? 'Publication…' : 'Publier le créneau' }}
          </button>
        </section>

        <section class="doc-card">
          <h2>Rendez-vous</h2>
          <div v-if="loadingAppts" class="doc-muted">Chargement…</div>
          <div v-else-if="appointments.length === 0" class="doc-muted">Aucun rendez-vous.</div>
          <ul v-else class="doc-list">
            <li v-for="a in appointments" :key="a.id">
              <div>
                <strong>{{ a.patient_name }}</strong>
                <div class="doc-muted">{{ formatDt(a.scheduled_at) }} · {{ a.reason_for_visit }}</div>
              </div>
              <div class="doc-actions">
                <span class="doc-badge">{{ a.status }}</span>
                <button
                  v-if="['confirmed', 'requested'].includes(a.status) && !activeConsultation"
                  type="button"
                  class="doc-btn small"
                  @click="startConsultation(a)"
                >Consulter</button>
              </div>
            </li>
          </ul>
        </section>

        <section class="doc-card">
          <h2>Créneaux disponibles</h2>
          <div v-if="slots.length === 0" class="doc-muted">Aucun créneau libre.</div>
          <ul v-else class="doc-list">
            <li v-for="s in slots" :key="s.id">
              <div class="doc-muted">{{ formatDt(s.start_time) }} → {{ formatTime(s.end_time) }}</div>
              <button class="doc-btn ghost" type="button" @click="disableSlot(s.id)">Désactiver</button>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
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
const savingSlot = ref(false);
const slotError = ref('');
const slotSuccess = ref('');
const activeConsultation = ref<any>(null);
const completing = ref(false);
const consultError = ref('');
const consultSuccess = ref('');

const newSlot = reactive({
  start: '',
  end: '',
  mode: 'in_person' as 'in_person' | 'teleconsultation',
});

const consultForm = reactive({
  diagnosis: '',
  clinical_notes: '',
  treatment_plan: '',
  rx_instructions: '',
  items: [] as Array<{ medication_name: string; dosage: string; form: string; quantity: number; frequency: string; duration_days: number }>,
});

const doctorName = computed(() => profile.value ? `${profile.value.first_name ?? ''} ${profile.value.last_name ?? ''}`.trim() : '');
const verificationStatus = computed(() => {
  const dp = Array.isArray(profile.value?.doctor_profiles) ? profile.value.doctor_profiles[0] : profile.value?.doctor_profiles;
  return dp?.verification_status ?? 'non renseigné';
});

function formatDt(d: string) { return new Date(d).toLocaleString('fr', { dateStyle: 'medium', timeStyle: 'short' }); }
function formatTime(d: string) { return new Date(d).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }); }
function addRxItem() {
  consultForm.items.push({ medication_name: '', dosage: '', form: 'comprimé', quantity: 1, frequency: '1 fois / jour', duration_days: 7 });
}
function removeRxItem(idx: number) { consultForm.items.splice(idx, 1); }
function cancelConsultationPanel() {
  activeConsultation.value = null;
  consultError.value = '';
  consultSuccess.value = '';
}

async function loadDoctorData() {
  if (!session.value?.user) return;
  const { data: p } = await supabase.from('profiles').select('*, doctor_profiles(*)').eq('id', session.value.user.id).single();
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
      .select('id, scheduled_at, status, reason_for_visit, patient_id, patient:profiles!appointments_patient_id_fkey(first_name, last_name)')
      .eq('doctor_id', session.value.user.id)
      .order('scheduled_at', { ascending: false })
      .limit(30);
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
      .limit(30);
    slots.value = slotRows ?? [];
  } finally {
    loadingAppts.value = false;
  }
}

async function startConsultation(appt: any) {
  if (!session.value?.user) return;
  consultError.value = '';
  consultSuccess.value = '';
  try {
    const { data: existing } = await supabase.from('consultations').select('id').eq('appointment_id', appt.id).maybeSingle();
    let consultationId = existing?.id as string | undefined;
    if (!consultationId) {
      const { data: created, error: cErr } = await supabase.from('consultations').insert({
        appointment_id: appt.id,
        doctor_id: session.value.user.id,
        patient_id: appt.patient_id,
        status: 'in_progress',
        symptoms: appt.reason_for_visit,
      }).select('id').single();
      if (cErr) throw cErr;
      consultationId = created.id;
    }
    consultForm.diagnosis = '';
    consultForm.clinical_notes = '';
    consultForm.treatment_plan = '';
    consultForm.rx_instructions = '';
    consultForm.items = [];
    activeConsultation.value = {
      id: consultationId,
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      patient_name: appt.patient_name,
    };
  } catch (e: unknown) {
    consultError.value = (e as Error).message || 'Impossible de démarrer la consultation.';
  }
}

async function completeConsultation() {
  if (!activeConsultation.value) return;
  consultError.value = '';
  consultSuccess.value = '';
  completing.value = true;
  try {
    const items = consultForm.items.filter((i) => i.medication_name.trim()).map((i) => ({
      medication_name: i.medication_name.trim(),
      dosage: i.dosage || 'N/A',
      form: i.form || 'comprimé',
      quantity: Number(i.quantity) || 1,
      frequency: i.frequency || 'selon prescription',
      duration_days: Number(i.duration_days) || 7,
    }));
    const { error: rpcErr } = await supabase.rpc('complete_consultation_and_issue_prescription', {
      p_consultation_id: activeConsultation.value.id,
      p_diagnosis: consultForm.diagnosis || null,
      p_clinical_notes: consultForm.clinical_notes || null,
      p_treatment_plan: consultForm.treatment_plan || null,
      p_prescription_items: items.length ? items : null,
      p_prescription_instructions: consultForm.rx_instructions || null,
    });
    if (rpcErr) throw rpcErr;
    consultSuccess.value = items.length ? 'Consultation clôturée et ordonnance émise.' : 'Consultation clôturée.';
    setTimeout(async () => {
      activeConsultation.value = null;
      await loadDoctorData();
    }, 900);
  } catch (e: unknown) {
    consultError.value = (e as Error).message || 'Clôture impossible (médecin agréé requis).';
  } finally {
    completing.value = false;
  }
}

async function createSlot() {
  if (!session.value?.user) return;
  slotError.value = '';
  slotSuccess.value = '';
  if (!newSlot.start || !newSlot.end) { slotError.value = 'Renseignez début et fin.'; return; }
  const start = new Date(newSlot.start);
  const end = new Date(newSlot.end);
  if (!(end > start)) { slotError.value = 'La fin doit être après le début.'; return; }
  savingSlot.value = true;
  try {
    const { error: insErr } = await supabase.from('doctor_slots').insert({
      doctor_id: session.value.user.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'available',
      consultation_mode: newSlot.mode,
      capacity: 1,
    });
    if (insErr) throw insErr;
    slotSuccess.value = 'Créneau publié.';
    newSlot.start = '';
    newSlot.end = '';
    await loadDoctorData();
  } catch (e: unknown) {
    slotError.value = (e as Error).message || 'Publication impossible.';
  } finally {
    savingSlot.value = false;
  }
}

async function disableSlot(id: string) {
  await supabase.from('doctor_slots').update({ status: 'cancelled' }).eq('id', id);
  await loadDoctorData();
}

async function signIn() {
  error.value = '';
  loading.value = true;
  try {
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value });
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
  activeConsultation.value = null;
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  if (session.value) await loadDoctorData();
  supabase.auth.onAuthStateChange((_event, s) => { session.value = s; });
});
</script>

<style>
:root { font-family: Inter, system-ui, sans-serif; color: #0f172a; background: #f1f5f9; }
* { box-sizing: border-box; }
body { margin: 0; }
.doc-app { min-height: 100vh; }
.doc-header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,.95); border-bottom: 1px solid #e2e8f0; }
.doc-brand { display: flex; align-items: center; gap: 10px; }
.doc-logo { width: 36px; height: 36px; border-radius: 10px; color: #fff; font-weight: 800; display: grid; place-items: center; background: linear-gradient(135deg, #1677e8, #0aa38c); }
.doc-brand-name { font-weight: 700; font-size: 14px; }
.doc-brand-role { font-size: 11px; color: #1677e8; font-weight: 600; text-transform: uppercase; }
.doc-main { max-width: 720px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
.doc-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgb(0 0 0 / 0.04); }
.doc-card h1 { margin: 0 0 6px; font-size: 22px; }
.doc-card h2 { margin: 0 0 12px; font-size: 16px; }
.doc-sub { margin: 12px 0 8px; font-size: 14px; }
.doc-muted { color: #64748b; font-size: 13px; margin: 0 0 12px; }
.doc-label { display: block; font-size: 13px; font-weight: 600; margin: 10px 0 6px; }
.doc-input { width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; margin-bottom: 8px; background: #fff; font-family: inherit; }
.doc-btn { border: none; border-radius: 10px; padding: 12px 14px; font-weight: 600; cursor: pointer; }
.doc-btn.primary { width: 100%; margin-top: 8px; background: #1677e8; color: #fff; }
.doc-btn.ghost { background: transparent; color: #64748b; }
.doc-btn.small { padding: 8px 10px; background: #eff8ff; color: #1a62d5; font-size: 12px; }
.doc-alert { background: #fef2f2; color: #dc2626; border-left: 4px solid #ef4444; padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.doc-success { background: #f0fdf4; color: #16a34a; border-left: 4px solid #22c55e; padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.doc-note { font-size: 12px; color: #64748b; margin-top: 14px; }
.doc-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.doc-list li { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; padding: 10px; border-radius: 12px; background: #f8fafc; }
.doc-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.doc-badge { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 999px; background: #eff8ff; color: #1a62d5; white-space: nowrap; }
.rx-row { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; margin-bottom: 8px; background: #f8fafc; }
</style>
