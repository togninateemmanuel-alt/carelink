<template>
  <div class="hm">
    <header class="hm-header">
      <div>
        <h1>🏥 Hôpital / Médecin</h1>
        <p>Validation dossiers · File · Ordonnance</p>
      </div>
      <button v-if="session" class="hm-btn hm-btn-secondary" type="button" @click="signOut">Déconnexion</button>
    </header>

    <main class="hm-main">
      <!-- AUTH -->
      <section v-if="!session" class="hm-card">
        <h2>Connexion</h2>
        <p class="hm-muted">Espace hôpital / médecin CareLink</p>
        <div v-if="error" class="hm-danger">{{ error }}</div>
        <form @submit.prevent="signIn">
          <label class="hm-label">Email</label>
          <input v-model="email" type="email" class="hm-input" required />
          <label class="hm-label">Mot de passe</label>
          <input v-model="password" type="password" class="hm-input" required />
          <button class="hm-btn hm-btn-success" type="submit" :disabled="loading">
            {{ loading ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
      </section>

      <template v-else>
        <section class="hm-card">
          <h2>{{ displayName }}</h2>
          <p class="hm-muted">Rôle profil : {{ profile?.role ?? '—' }} · Hôpital lié : {{ hospitalName || 'non renseigné' }}</p>
          <div v-if="error" class="hm-danger">{{ error }}</div>
          <div v-if="success" class="hm-success">{{ success }}</div>
        </section>

        <!-- PENDING REQUESTS (like hospitalPatientList) -->
        <section class="hm-card">
          <h2>📨 Dossiers en attente de validation</h2>
          <button class="hm-btn hm-btn-secondary" type="button" @click="loadData">🔄 Actualiser</button>
          <div v-if="loadingData" class="hm-muted" style="margin-top:12px">Chargement…</div>
          <div v-else-if="pending.length === 0" class="hm-info" style="margin-top:12px">Aucun dossier en attente.</div>
          <div v-for="p in pending" :key="p.id" class="hm-patient">
            <h3>👤 {{ p.patient_name }}</h3>
            <p>📱 {{ p.patient_phone || '—' }}</p>
            <p>🩺 {{ p.consultation_type }}</p>
            <p>💬 {{ p.symptoms }}</p>
            <p>💰 Reste : {{ formatPrice(Number(p.remaining_amount)) }} · Paiement : {{ p.payment_status }}</p>
            <p>
              <span class="hm-priority" :class="'p' + priorityNum(p.final_priority)">
                Priorité {{ p.final_priority }}
              </span>
            </p>
            <button class="hm-btn hm-btn-primary" type="button" @click="openValidation(p)">
              🔎 Ouvrir / Valider le dossier
            </button>
          </div>
        </section>

        <!-- VALIDATION CARD -->
        <section v-if="selectedPending" class="hm-card">
          <h2>✅ Validation hospitalière</h2>
          <div class="hm-info">
            <strong>{{ selectedPending.patient_name }}</strong><br />
            {{ selectedPending.consultation_type }} · {{ selectedPending.symptoms }}
          </div>
          <label class="hm-label">Responsable (vérificateur)</label>
          <input v-model="validation.verifier" class="hm-input" placeholder="Nom du responsable" />
          <label class="hm-label">Signature numérique</label>
          <input v-model="validation.signature" class="hm-input" placeholder="Signature" />
          <label class="hm-label">Observation</label>
          <textarea v-model="validation.observation" class="hm-input" rows="3" />
          <label class="hm-label">Priorité (surcharge optionnelle)</label>
          <select v-model="validation.priority" class="hm-input">
            <option value="">Garder automatique ({{ selectedPending.final_priority }})</option>
            <option value="level_1">LEVEL 1 — Très urgent</option>
            <option value="level_2">LEVEL 2 — Prioritaire</option>
            <option value="level_3">LEVEL 3 — Normal</option>
          </select>
          <p class="hm-small">Cet indicateur ne remplace pas un triage médical professionnel.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="hm-btn hm-btn-success" type="button" :disabled="busy" @click="validate(true)">
              ✅ Valider et mettre en file
            </button>
            <button class="hm-btn hm-btn-danger" type="button" :disabled="busy" @click="validate(false)">
              ❌ Rejeter
            </button>
            <button class="hm-btn hm-btn-secondary" type="button" @click="selectedPending = null">Fermer</button>
          </div>
        </section>

        <!-- QUEUE (validated patients) -->
        <section class="hm-card">
          <h2>🎫 File d'attente validée</h2>
          <div v-if="queue.length === 0" class="hm-muted">Aucun patient en file.</div>
          <div v-for="q in queue" :key="q.id" class="hm-patient">
            <h3>🎫 N° {{ q.queue_number }} — {{ q.patient_name }}</h3>
            <p>🩺 {{ q.consultation_type }}</p>
            <p>Priorité {{ q.final_priority }} · {{ q.queue_status || q.request_status }}</p>
            <button class="hm-btn hm-btn-primary" type="button" @click="takePatient(q)">
              🩺 Prendre ce patient
            </button>
          </div>
        </section>

        <!-- DOCTOR WORKSPACE -->
        <section v-if="current" class="hm-card">
          <h2>🩺 Consultation / Ordonnance</h2>
          <p class="hm-info">Patient en cours : <strong>{{ current.patient_name }}</strong> (file N° {{ current.queue_number }})</p>

          <label class="hm-label">Nom du médecin</label>
          <input v-model="rx.doctorName" class="hm-input" />
          <label class="hm-label">Téléphone médecin</label>
          <input v-model="rx.doctorPhone" class="hm-input" />

          <h3 style="margin-top:16px">Constantes</h3>
          <label class="hm-label">Température</label>
          <input v-model="rx.temperature" class="hm-input" placeholder="Ex : 37.2" />
          <label class="hm-label">Pouls (BPM)</label>
          <input v-model="rx.bpm" class="hm-input" placeholder="Ex : 78" />
          <label class="hm-label">Tension</label>
          <input v-model="rx.bloodPressure" class="hm-input" placeholder="Ex : 120/80" />

          <label class="hm-label">Médicaments prescrits</label>
          <textarea v-model="rx.prescription" class="hm-input" rows="5" placeholder="Paracétamol 500mg ...&#10;Amoxicilline ..." />
          <label class="hm-label">Instructions</label>
          <textarea v-model="rx.instructions" class="hm-input" rows="3" />

          <label class="hm-label">Signature</label>
          <input v-model="rx.signature" class="hm-input" />
          <label class="hm-label">Cachet</label>
          <input v-model="rx.stamp" class="hm-input" placeholder="CACHET DU MÉDECIN" />

          <button class="hm-btn hm-btn-success" type="button" :disabled="busy" @click="savePrescription">
            💾 Enregistrer l'ordonnance
          </button>
          <div v-if="rxResult" class="hm-success" style="margin-top:12px" v-html="rxResult" />
        </section>

        <!-- SLOTS (keep existing CareLink feature) -->
        <section class="hm-card">
          <h2>📅 Créneaux (agenda CareLink)</h2>
          <label class="hm-label">Début</label>
          <input v-model="newSlot.start" type="datetime-local" class="hm-input" />
          <label class="hm-label">Fin</label>
          <input v-model="newSlot.end" type="datetime-local" class="hm-input" />
          <button class="hm-btn hm-btn-primary" type="button" @click="createSlot">Publier créneau</button>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

const session = ref<Session | null>(null);
const email = ref('');
const password = ref('');
const loading = ref(false);
const loadingData = ref(false);
const busy = ref(false);
const error = ref('');
const success = ref('');
const profile = ref<any>(null);
const staffHospital = ref<any>(null);
const pending = ref<any[]>([]);
const queue = ref<any[]>([]);
const selectedPending = ref<any>(null);
const current = ref<any>(null);
const rxResult = ref('');

const validation = reactive({
  verifier: '',
  signature: '',
  observation: '',
  priority: '' as string,
});

const rx = reactive({
  doctorName: '',
  doctorPhone: '',
  temperature: '',
  bpm: '',
  bloodPressure: '',
  prescription: '',
  instructions: '',
  signature: '',
  stamp: '',
});

const newSlot = reactive({ start: '', end: '' });

const displayName = computed(() => {
  if (!profile.value) return '';
  return `Dr. ${profile.value.first_name ?? ''} ${profile.value.last_name ?? ''}`.trim();
});
const hospitalName = computed(() => staffHospital.value?.hospitals?.name ?? staffHospital.value?.name ?? '');
const hospitalId = computed(() => staffHospital.value?.hospital_id as string | undefined);

function formatPrice(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} F CFA`;
}
function priorityNum(p: string) {
  if (p === 'level_1') return 1;
  if (p === 'level_2') return 2;
  return 3;
}

async function loadData() {
  if (!session.value?.user) return;
  loadingData.value = true;
  error.value = '';
  try {
    const { data: p } = await supabase.from('profiles').select('*, doctor_profiles(*)').eq('id', session.value.user.id).single();
    profile.value = p;
    rx.doctorName = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim();
    rx.doctorPhone = p?.phone ?? '';

    // Prefer hospital_staff; else doctor_profiles.hospital_id
    const { data: hs } = await supabase
      .from('hospital_staff')
      .select('*, hospitals(*)')
      .eq('profile_id', session.value.user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (hs) {
      staffHospital.value = hs;
    } else {
      const dp = Array.isArray(p?.doctor_profiles) ? p.doctor_profiles[0] : p?.doctor_profiles;
      if (dp?.hospital_id) {
        const { data: h } = await supabase.from('hospitals').select('*').eq('id', dp.hospital_id).maybeSingle();
        staffHospital.value = { hospital_id: dp.hospital_id, hospitals: h };
      }
    }

    const hid = hospitalId.value;
    if (!hid) {
      // Load all pending if admin/doctor without hospital link (dev)
      const { data: allPending } = await supabase
        .from('prescription_requests')
        .select('*, patient:profiles!prescription_requests_patient_id_fkey(first_name, last_name, phone)')
        .in('request_status', ['submitted', 'hospital_pending', 'payment_confirmed'])
        .order('created_at', { ascending: true })
        .limit(50);
      pending.value = mapPatients(allPending);

      const { data: allQueue } = await supabase
        .from('prescription_requests')
        .select('*, patient:profiles!prescription_requests_patient_id_fkey(first_name, last_name, phone)')
        .in('request_status', ['waiting', 'with_doctor'])
        .order('final_priority', { ascending: true })
        .order('queue_number', { ascending: true })
        .limit(50);
      queue.value = mapPatients(allQueue);
    } else {
      const { data: pend } = await supabase
        .from('prescription_requests')
        .select('*, patient:profiles!prescription_requests_patient_id_fkey(first_name, last_name, phone)')
        .eq('hospital_id', hid)
        .in('request_status', ['submitted', 'hospital_pending', 'payment_confirmed'])
        .order('created_at', { ascending: true });
      pending.value = mapPatients(pend);

      const { data: q } = await supabase
        .from('prescription_requests')
        .select('*, patient:profiles!prescription_requests_patient_id_fkey(first_name, last_name, phone)')
        .eq('hospital_id', hid)
        .in('request_status', ['waiting', 'with_doctor'])
        .order('final_priority', { ascending: true })
        .order('queue_number', { ascending: true });
      queue.value = mapPatients(q);
    }
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Chargement impossible (migration hospitals ?)';
  } finally {
    loadingData.value = false;
  }
}

function mapPatients(rows: any[] | null) {
  return (rows ?? []).map((r) => ({
    ...r,
    patient_name: `${r.patient?.first_name ?? ''} ${r.patient?.last_name ?? ''}`.trim() || 'Patient',
    patient_phone: r.patient?.phone,
  }));
}

function openValidation(p: any) {
  selectedPending.value = p;
  validation.verifier = displayName.value || '';
  validation.signature = '';
  validation.observation = '';
  validation.priority = '';
  success.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function validate(approve: boolean) {
  if (!selectedPending.value) return;
  if (approve && (!validation.verifier.trim() || !validation.signature.trim())) {
    error.value = 'Responsable et signature obligatoires.';
    return;
  }
  busy.value = true;
  error.value = '';
  success.value = '';
  try {
    const { data, error: rpcErr } = await supabase.rpc('hospital_validate_prescription_request', {
      p_request_id: selectedPending.value.id,
      p_approve: approve,
      p_rejection_reason: approve ? null : (validation.observation || 'Refusé par l’hôpital'),
      p_priority_override: validation.priority || null,
      p_priority_reason: validation.priority ? validation.observation || 'Surcharge staff' : null,
    });
    if (rpcErr) throw rpcErr;
    success.value = approve
      ? `Dossier validé. File N° ${(data as any)?.queue_number ?? '—'}`
      : 'Dossier rejeté.';
    selectedPending.value = null;
    await loadData();
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Validation impossible (staff hôpital requis).';
  } finally {
    busy.value = false;
  }
}

async function takePatient(q: any) {
  current.value = q;
  rxResult.value = '';
  // mark with_doctor if possible
  await supabase
    .from('prescription_requests')
    .update({ request_status: 'with_doctor', queue_status: 'in_consultation' })
    .eq('id', q.id);
  await loadData();
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

async function savePrescription() {
  if (!current.value || !session.value?.user) return;
  error.value = '';
  rxResult.value = '';
  if (!rx.doctorName || !rx.signature || !rx.stamp || !rx.prescription.trim()) {
    error.value = 'Médecin, signature, cachet et médicaments sont obligatoires.';
    return;
  }
  busy.value = true;
  try {
    // 1) Ensure consultation row
    let consultationId: string | undefined;
    const { data: existing } = await supabase
      .from('consultations')
      .select('id')
      .eq('patient_id', current.value.patient_id)
      .eq('doctor_id', session.value.user.id)
      .in('status', ['in_progress', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      consultationId = existing.id;
    } else {
      const { data: created, error: cErr } = await supabase
        .from('consultations')
        .insert({
          doctor_id: session.value.user.id,
          patient_id: current.value.patient_id,
          status: 'in_progress',
          symptoms: current.value.symptoms,
          clinical_notes: `Temp:${rx.temperature || 'n/a'} BPM:${rx.bpm || 'n/a'} TA:${rx.bloodPressure || 'n/a'}`,
        })
        .select('id')
        .single();
      if (cErr) throw cErr;
      consultationId = created.id;
    }

    // Parse medicine lines into structured items
    const lines = rx.prescription
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const items = lines.map((line) => ({
      medication_name: line,
      dosage: 'selon ordonnance',
      form: 'comprimé',
      quantity: 1,
      frequency: 'selon prescription',
      duration_days: 7,
    }));

    const { data: rpcData, error: rpcErr } = await supabase.rpc('complete_consultation_and_issue_prescription', {
      p_consultation_id: consultationId,
      p_diagnosis: current.value.consultation_type,
      p_clinical_notes: `T:${rx.temperature} BPM:${rx.bpm} TA:${rx.bloodPressure} | Signé: ${rx.signature} | Cachet: ${rx.stamp}`,
      p_treatment_plan: rx.instructions || null,
      p_prescription_items: items,
      p_prescription_instructions: rx.instructions || null,
    });

    if (rpcErr) throw rpcErr;

    await supabase
      .from('prescription_requests')
      .update({
        request_status: 'prescription_ready',
        queue_status: 'done',
        completed_at: new Date().toISOString(),
        consultation_id: consultationId,
      })
      .eq('id', current.value.id);

    rxResult.value = `
      <h3>✅ Ordonnance enregistrée</h3>
      <p>Patient : <strong>${current.value.patient_name}</strong></p>
      <p>Médecin : <strong>${rx.doctorName}</strong></p>
      <p>L'ordonnance est disponible côté patient (protégée par son code secret).</p>
    `;
    success.value = 'Ordonnance envoyée au patient.';
    await loadData();
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Échec enregistrement (médecin verified requis pour RPC).';
  } finally {
    busy.value = false;
  }
}

async function createSlot() {
  if (!session.value?.user || !newSlot.start || !newSlot.end) return;
  const start = new Date(newSlot.start);
  const end = new Date(newSlot.end);
  const { error: insErr } = await supabase.from('doctor_slots').insert({
    doctor_id: session.value.user.id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: 'available',
    consultation_mode: 'in_person',
    capacity: 1,
  });
  if (insErr) error.value = insErr.message;
  else {
    success.value = 'Créneau publié.';
    newSlot.start = '';
    newSlot.end = '';
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
    await loadData();
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Échec connexion.';
  } finally {
    loading.value = false;
  }
}

async function signOut() {
  await supabase.auth.signOut();
  session.value = null;
  profile.value = null;
  pending.value = [];
  queue.value = [];
  current.value = null;
  selectedPending.value = null;
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  if (session.value) await loadData();
  supabase.auth.onAuthStateChange((_e, s) => {
    session.value = s;
  });
});
</script>

<style>
:root { font-family: Arial, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: #f4f7fb; color: #222; }
.hm-header {
  background: #198754; color: #fff; padding: 16px 20px;
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
}
.hm-header h1 { margin: 0; font-size: 20px; }
.hm-header p { margin: 4px 0 0; font-size: 13px; opacity: 0.95; }
.hm-main { max-width: 720px; margin: 0 auto; padding: 15px; display: grid; gap: 14px; }
.hm-card {
  background: #fff; padding: 18px; border-radius: 14px;
  box-shadow: 0 3px 12px rgba(0,0,0,.08);
}
.hm-card h2 { color: #198754; margin: 0 0 12px; font-size: 18px; }
.hm-label { display: block; margin-top: 12px; margin-bottom: 6px; font-weight: bold; font-size: 14px; }
.hm-input {
  width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 15px;
  font-family: inherit;
}
textarea.hm-input { min-height: 90px; resize: vertical; }
.hm-btn {
  border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 12px;
}
.hm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hm-btn-primary { background: #0b5ed7; color: #fff; }
.hm-btn-success { background: #198754; color: #fff; }
.hm-btn-danger { background: #dc3545; color: #fff; }
.hm-btn-secondary { background: #6c757d; color: #fff; }
.hm-muted { color: #666; font-size: 13px; }
.hm-small { font-size: 12px; color: #666; margin-top: 6px; }
.hm-info { padding: 14px; border-radius: 10px; background: #eaf2ff; margin: 10px 0; }
.hm-success { padding: 14px; border-radius: 10px; background: #d1e7dd; color: #0f5132; }
.hm-danger { padding: 14px; border-radius: 10px; background: #f8d7da; color: #842029; margin-top: 10px; }
.hm-patient {
  border: 1px solid #ddd; border-radius: 10px; padding: 14px; margin-top: 12px;
}
.hm-patient h3 { margin: 0 0 8px; font-size: 16px; }
.hm-priority {
  display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;
}
.hm-priority.p1 { background: #dc3545; color: #fff; }
.hm-priority.p2 { background: #ffc107; color: #222; }
.hm-priority.p3 { background: #198754; color: #fff; }
</style>
