<template>
  <div class="ph-app">
    <header class="ph-header">
      <div class="ph-brand">
        <div class="ph-logo">CL</div>
        <div>
          <div class="ph-brand-name">CareLink</div>
          <div class="ph-brand-role">Portail Pharmacie</div>
        </div>
      </div>
      <button v-if="session" class="ph-btn ghost" type="button" @click="signOut">Déconnexion</button>
    </header>

    <main class="ph-main">
      <section v-if="!session" class="ph-card">
        <h1>Connexion pharmacie</h1>
        <p class="ph-muted">Ordonnances reçues et commandes marketplace.</p>
        <div v-if="error" class="ph-alert">{{ error }}</div>
        <form @submit.prevent="signIn">
          <label class="ph-label">Email</label>
          <input v-model="email" type="email" class="ph-input" required />
          <label class="ph-label">Mot de passe</label>
          <input v-model="password" type="password" class="ph-input" required />
          <button class="ph-btn primary" type="submit" :disabled="loading">
            {{ loading ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
        <p class="ph-note">
          Le compte doit être lié à une officine via <strong>pharmacy_staff</strong>.
          Aucune auto-promotion de rôle côté client.
        </p>
      </section>

      <template v-else>
        <section class="ph-card">
          <h1>{{ pharmacyName || 'Officine' }}</h1>
          <p class="ph-muted">{{ staffName }} · rôle {{ staffRole }}</p>
        </section>

        <section class="ph-card">
          <h2>Ordonnances reçues</h2>
          <div v-if="loadingData" class="ph-muted">Chargement…</div>
          <div v-else-if="transfers.length === 0" class="ph-muted">Aucune ordonnance transférée.</div>
          <ul v-else class="ph-list">
            <li v-for="t in transfers" :key="t.id">
              <div>
                <strong>{{ t.prescription_code }}</strong>
                <div class="ph-muted">Patient : {{ t.patient_name }} · {{ formatDt(t.transferred_at) }}</div>
                <div class="ph-muted" v-if="t.items?.length">
                  {{ t.items.map((i: any) => i.medication_name).join(', ') }}
                </div>
                <div v-if="actionMsg[t.id]" class="ph-success" style="margin-top:8px">{{ actionMsg[t.id] }}</div>
                <div v-if="actionErr[t.id]" class="ph-alert" style="margin-top:8px">{{ actionErr[t.id] }}</div>
              </div>
              <div class="ph-actions">
                <span class="ph-badge">{{ t.status }}</span>
                <template v-if="t.status === 'pending'">
                  <button class="ph-btn small" type="button" :disabled="busyId === t.id" @click="respond(t.id, 'accepted')">Accepter</button>
                  <button class="ph-btn small danger" type="button" :disabled="busyId === t.id" @click="respond(t.id, 'rejected')">Refuser</button>
                </template>
                <button
                  v-if="t.status === 'accepted'"
                  class="ph-btn small"
                  type="button"
                  :disabled="busyId === t.id"
                  @click="respond(t.id, 'completed')"
                >Marquer délivrée</button>
              </div>
            </li>
          </ul>
        </section>

        <section class="ph-card">
          <h2>Commandes marketplace</h2>
          <div v-if="fulfillments.length === 0" class="ph-muted">Aucune commande en cours.</div>
          <ul v-else class="ph-list">
            <li v-for="f in fulfillments" :key="f.id">
              <div>
                <strong>{{ f.fulfillment_number }}</strong>
                <div class="ph-muted">{{ formatPrice(Number(f.subtotal_amount)) }} · {{ formatDt(f.created_at) }}</div>
              </div>
              <div class="ph-actions">
                <span class="ph-badge">{{ f.status }}</span>
                <button
                  v-if="f.status === 'pending'"
                  class="ph-btn small"
                  type="button"
                  :disabled="busyId === f.id"
                  @click="advanceFulfillment(f.id, 'preparing')"
                >Préparer</button>
                <button
                  v-if="f.status === 'preparing'"
                  class="ph-btn small"
                  type="button"
                  :disabled="busyId === f.id"
                  @click="advanceFulfillment(f.id, 'ready')"
                >Prête</button>
                <button
                  v-if="f.status === 'ready'"
                  class="ph-btn small"
                  type="button"
                  :disabled="busyId === f.id"
                  @click="advanceFulfillment(f.id, 'fulfilled')"
                >Remise</button>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

const session = ref<Session | null>(null);
const email = ref('');
const password = ref('');
const loading = ref(false);
const loadingData = ref(false);
const error = ref('');
const profile = ref<any>(null);
const staff = ref<any>(null);
const transfers = ref<any[]>([]);
const fulfillments = ref<any[]>([]);
const busyId = ref<string | null>(null);
const actionMsg = reactive<Record<string, string>>({});
const actionErr = reactive<Record<string, string>>({});

const staffName = computed(() => profile.value ? `${profile.value.first_name ?? ''} ${profile.value.last_name ?? ''}`.trim() : '');
const staffRole = computed(() => staff.value?.staff_role ?? '—');
const pharmacyName = computed(() => staff.value?.pharmacies?.name ?? staff.value?.pharmacy?.name ?? '');
const pharmacyId = computed(() => staff.value?.pharmacy_id as string | undefined);

function formatDt(d: string) {
  return new Date(d).toLocaleString('fr', { dateStyle: 'medium', timeStyle: 'short' });
}
function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

async function loadPharmacyData() {
  if (!session.value?.user) return;
  loadingData.value = true;
  error.value = '';
  try {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.value.user.id)
      .single();
    profile.value = p;

    const { data: st } = await supabase
      .from('pharmacy_staff')
      .select('*, pharmacies(id, name, city, is_verified, is_active)')
      .eq('profile_id', session.value.user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    staff.value = st;

    if (!st?.pharmacy_id) {
      error.value = 'Aucun rattachement pharmacie actif (pharmacy_staff).';
      transfers.value = [];
      fulfillments.value = [];
      return;
    }

    const { data: tr } = await supabase
      .from('prescription_pharmacy_transfers')
      .select(`
        id, status, transferred_at, patient_notes,
        patient:profiles!prescription_pharmacy_transfers_patient_id_fkey(first_name, last_name),
        prescriptions(id, prescription_code, status, prescription_items(medication_name, dosage, quantity))
      `)
      .eq('pharmacy_id', st.pharmacy_id)
      .order('transferred_at', { ascending: false })
      .limit(40);

    transfers.value = (tr ?? []).map((row: any) => ({
      id: row.id,
      status: row.status,
      transferred_at: row.transferred_at,
      patient_name: `${row.patient?.first_name ?? ''} ${row.patient?.last_name ?? ''}`.trim() || 'Patient',
      prescription_code: row.prescriptions?.prescription_code ?? 'RX',
      items: row.prescriptions?.prescription_items ?? [],
    }));

    const { data: ful } = await supabase
      .from('order_fulfillments')
      .select('id, fulfillment_number, status, subtotal_amount, created_at')
      .eq('pharmacy_id', st.pharmacy_id)
      .order('created_at', { ascending: false })
      .limit(40);

    fulfillments.value = ful ?? [];
  } finally {
    loadingData.value = false;
  }
}

async function respond(transferId: string, status: 'accepted' | 'rejected' | 'completed') {
  busyId.value = transferId;
  actionMsg[transferId] = '';
  actionErr[transferId] = '';
  try {
    const { error: rpcErr } = await supabase.rpc('respond_to_prescription_transfer', {
      p_transfer_id: transferId,
      p_status: status,
      p_response_notes: null,
    });
    if (rpcErr) throw rpcErr;
    actionMsg[transferId] = status === 'accepted'
      ? 'Ordonnance acceptée.'
      : status === 'rejected'
        ? 'Ordonnance refusée.'
        : 'Ordonnance délivrée.';
    await loadPharmacyData();
  } catch (e: unknown) {
    actionErr[transferId] = (e as Error).message || 'Action impossible.';
  } finally {
    busyId.value = null;
  }
}

async function advanceFulfillment(id: string, status: string) {
  busyId.value = id;
  try {
    const { error: uErr } = await supabase
      .from('order_fulfillments')
      .update({ status })
      .eq('id', id);
    if (uErr) throw uErr;
    await loadPharmacyData();
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Mise à jour commande impossible.';
  } finally {
    busyId.value = null;
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
    await loadPharmacyData();
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
  staff.value = null;
  transfers.value = [];
  fulfillments.value = [];
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  if (session.value) await loadPharmacyData();
  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s;
  });
});
</script>

<style>
:root { font-family: Inter, system-ui, sans-serif; color: #0f172a; background: #f1f5f9; }
* { box-sizing: border-box; }
body { margin: 0; }
.ph-app { min-height: 100vh; }
.ph-header {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: rgba(255,255,255,.95);
  border-bottom: 1px solid #e2e8f0;
}
.ph-brand { display: flex; align-items: center; gap: 10px; }
.ph-logo {
  width: 36px; height: 36px; border-radius: 10px; color: #fff; font-weight: 800;
  display: grid; place-items: center;
  background: linear-gradient(135deg, #0d9488, #1677e8);
}
.ph-brand-name { font-weight: 700; font-size: 14px; }
.ph-brand-role { font-size: 11px; color: #0d9488; font-weight: 600; text-transform: uppercase; }
.ph-main { max-width: 720px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
.ph-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
}
.ph-card h1 { margin: 0 0 6px; font-size: 22px; }
.ph-card h2 { margin: 0 0 12px; font-size: 16px; }
.ph-muted { color: #64748b; font-size: 13px; margin: 0 0 8px; }
.ph-label { display: block; font-size: 13px; font-weight: 600; margin: 10px 0 6px; }
.ph-input {
  width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px;
  font-size: 14px; margin-bottom: 8px; background: #fff;
}
.ph-btn { border: none; border-radius: 10px; padding: 12px 14px; font-weight: 600; cursor: pointer; }
.ph-btn.primary { width: 100%; margin-top: 8px; background: #0d9488; color: #fff; }
.ph-btn.ghost { background: transparent; color: #64748b; }
.ph-btn.small { padding: 8px 10px; background: #f0fdfa; color: #0f766e; font-size: 12px; }
.ph-btn.small.danger { background: #fef2f2; color: #dc2626; }
.ph-alert {
  background: #fef2f2; color: #dc2626; border-left: 4px solid #ef4444;
  padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px;
}
.ph-success {
  background: #f0fdf4; color: #16a34a; border-left: 4px solid #22c55e;
  padding: 10px 12px; border-radius: 8px; font-size: 13px;
}
.ph-note { font-size: 12px; color: #64748b; margin-top: 14px; }
.ph-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.ph-list li {
  display: flex; justify-content: space-between; gap: 10px; align-items: flex-start;
  padding: 10px; border-radius: 12px; background: #f8fafc;
}
.ph-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.ph-badge {
  font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 999px;
  background: #f0fdfa; color: #0f766e; white-space: nowrap;
}
</style>
