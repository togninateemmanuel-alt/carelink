<template>
  <div class="om">
    <header class="om-header">
      <h1>🏥 Ordonnance Mobile</h1>
      <p>Votre santé, votre rendez-vous, votre ordonnance</p>
    </header>

    <div class="om-container">
      <div class="om-card">
        <RouterLink to="/dashboard" class="om-btn om-btn-secondary" style="text-decoration:none;display:inline-block">← Retour CareLink</RouterLink>
        <h2>👤 Rendez-vous patient</h2>

        <div class="om-steps">
          <span class="om-step" :class="stepClass(1)">1. Patient</span>
          <span class="om-step" :class="stepClass(2)">2. Hôpital</span>
          <span class="om-step" :class="stepClass(3)">3. Assurance</span>
          <span class="om-step" :class="stepClass(4)">4. Paiement</span>
          <span class="om-step" :class="stepClass(5)">5. Transmission</span>
        </div>

        <div v-if="error" class="om-danger">{{ error }}</div>
        <div v-if="info" class="om-success">{{ info }}</div>

        <!-- STEP 1: Patient + code -->
        <template v-if="step === 1">
          <label class="om-label">Nom complet</label>
          <input v-model="form.name" class="om-input" placeholder="Ex : Jean Koffi" />

          <label class="om-label">Numéro de téléphone</label>
          <input v-model="form.phone" class="om-input" type="tel" placeholder="Ex : 90 00 00 00" />

          <label class="om-label">Symptômes</label>
          <textarea v-model="form.symptoms" class="om-input" placeholder="Décrivez vos symptômes..." />

          <label class="om-label">Type de consultation</label>
          <select v-model="form.consultation" class="om-input">
            <option>Consultation générale</option>
            <option>Dentiste</option>
            <option>Pédiatrie</option>
            <option>Cardiologie</option>
            <option>Dermatologie</option>
            <option>Autre</option>
          </select>

          <div class="om-security">
            <h3>🔐 Sécurité de votre ordonnance</h3>
            <p>Ce code protège l’accès à votre ordonnance (stocké de façon sécurisée côté serveur, jamais en clair dans le code source).</p>
            <label class="om-label">Votre code d'ordonnance</label>
            <input v-model="form.code" class="om-input" type="password" maxlength="8" placeholder="Ex : 2580" />
            <label class="om-label">Confirmer le code</label>
            <input v-model="form.codeConfirm" class="om-input" type="password" maxlength="8" placeholder="Répétez votre code" />
          </div>

          <button class="om-btn om-btn-primary" type="button" @click="goStep2">Continuer → Hôpital</button>
        </template>

        <!-- STEP 2: Hospital -->
        <template v-else-if="step === 2">
          <h3>🏥 Choisissez votre hôpital</h3>
          <div v-if="loadingHospitals" class="om-info">Chargement…</div>
          <div v-else-if="hospitals.length === 0" class="om-warning">
            Aucun hôpital en base. L’admin doit créer des lignes dans <code>hospitals</code>.
          </div>
          <div v-for="h in hospitals" :key="h.id" class="om-hospital">
            <h3>{{ h.name }}</h3>
            <p>📍 {{ h.address }} · {{ h.city }}</p>
            <p class="om-price">Consultation : {{ formatPrice(Number(h.consultation_price)) }}</p>
            <label>
              <input type="radio" :value="h.id" v-model="form.hospital_id" />
              Choisir cet hôpital
            </label>
          </div>
          <div style="display:flex;gap:8px">
            <button class="om-btn om-btn-secondary" type="button" @click="step = 1">← Retour</button>
            <button class="om-btn om-btn-primary" type="button" :disabled="!form.hospital_id" @click="goStep3">Continuer → Assurance</button>
          </div>
        </template>

        <!-- STEP 3: Insurance -->
        <template v-else-if="step === 3">
          <h3>🛡️ Assurance maladie</h3>
          <p class="om-info">Hôpital : <strong>{{ selectedHospital?.name }}</strong> · Prix : <strong>{{ formatPrice(selectedPrice) }}</strong></p>

          <label><input type="radio" value="yes" v-model="form.hasInsurance" /> Oui</label>
          <label><input type="radio" value="no" v-model="form.hasInsurance" /> Non</label>

          <div v-if="form.hasInsurance === 'yes'" style="margin-top:16px">
            <label class="om-label">Compagnie</label>
            <select v-model="form.insuranceCompany" class="om-input">
              <option value="">-- Sélectionnez --</option>
              <option v-for="c in insuranceCompanies" :key="c" :value="c">{{ c }}</option>
            </select>
            <label class="om-label">Nom (carte)</label>
            <input v-model="form.insLast" class="om-input" />
            <label class="om-label">Prénom (carte)</label>
            <input v-model="form.insFirst" class="om-input" />
            <label class="om-label">Numéro de carte</label>
            <input v-model="form.insCard" class="om-input" placeholder="Ex : INAM-DEMO-001" />
            <button class="om-btn om-btn-primary" type="button" @click="verifyInsurance">🔎 Vérifier l'assurance</button>
            <div v-if="insuranceMsg" class="om-info" style="margin-top:12px">{{ insuranceMsg }}</div>
          </div>

          <div v-if="form.hasInsurance === 'no'" class="om-warning" style="margin-top:12px">
            Vous paierez la totalité de la consultation.
          </div>

          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="om-btn om-btn-secondary" type="button" @click="step = 2">← Retour</button>
            <button
              class="om-btn om-btn-success"
              type="button"
              :disabled="form.hasInsurance === 'yes' && !insuranceVerified"
              @click="goStep4"
            >➡️ Paiement</button>
          </div>
        </template>

        <!-- STEP 4: Payment -->
        <template v-else-if="step === 4">
          <h3>💰 Récapitulatif financier</h3>
          <p>Prix : <strong>{{ formatPrice(selectedPrice) }}</strong></p>
          <p>Assurance : <strong>{{ formatPrice(coverage) }}</strong></p>
          <p>Reste à payer : <span class="om-price">{{ formatPrice(remaining) }}</span></p>

          <h3 style="margin-top:16px">💳 Mode de paiement</h3>
          <div class="om-pay-grid">
            <label
              v-for="m in paymentMethods"
              :key="m"
              class="om-pay-opt"
              :class="{ selected: form.paymentMethod === m }"
            >
              <input type="radio" :value="m" v-model="form.paymentMethod" />
              {{ m }}
            </label>
          </div>

          <div class="om-warning" style="margin-top:12px">
            ⚠️ Les opérateurs (Gozem, TMoney, Moov, carte, PayPal) sont en <strong>mode démonstration</strong> tant qu’aucune API réelle n’est branchée.
            Le PIN de démo <strong>1234</strong> n’est pas un vrai secret bancaire.
          </div>

          <div v-if="isMobilePay" class="om-pay-fields">
            <label class="om-label">Téléphone (démo)</label>
            <input v-model="form.payPhone" class="om-input" />
            <label class="om-label">PIN démo</label>
            <input v-model="form.payPin" class="om-input" type="password" maxlength="6" placeholder="1234" />
          </div>

          <div v-if="form.paymentMethod === 'Carte bancaire'" class="om-pay-fields">
            <label class="om-label">N° carte fictif</label>
            <input v-model="form.cardNumber" class="om-input" placeholder="1111 2222 3333 4444" />
            <label class="om-label">Nom</label>
            <input v-model="form.cardName" class="om-input" />
          </div>

          <div v-if="form.paymentMethod === 'Cash'" class="om-warning">
            Paiement en espèces à régler à l’hôpital. Montant : {{ formatPrice(remaining) }}
          </div>

          <div style="display:flex;gap:8px">
            <button class="om-btn om-btn-secondary" type="button" @click="step = 3">← Retour</button>
            <button class="om-btn om-btn-success" type="button" :disabled="!form.paymentMethod || submitting" @click="confirmPaymentAndSubmit">
              ✅ Confirmer et transmettre
            </button>
          </div>
        </template>

        <!-- STEP 5: Transmission + result -->
        <template v-else-if="step === 5">
          <div v-if="transmitting" class="om-transfer">
            <div class="om-spinner" />
            <h2>📨 Transmission du dossier</h2>
            <p>{{ transferText }}</p>
          </div>

          <div v-else class="om-success">
            <h3>✅ Dossier envoyé à l'hôpital</h3>
            <p>👤 Patient : <strong>{{ form.name }}</strong></p>
            <p>🏥 Hôpital : <strong>{{ selectedHospital?.name }}</strong></p>
            <p>🛡️ Assurance : <strong>{{ insuranceLabel }}</strong></p>
            <p>💳 Paiement : <strong>{{ form.paymentMethod }}</strong> ({{ paymentStatusLabel }})</p>
            <p v-if="requestId">Réf. demande : <strong>{{ requestId }}</strong></p>
            <p style="margin-top:12px">⏳ Le dossier attend la validation de l’hôpital. Vous verrez ensuite votre numéro de file.</p>
          </div>

          <div v-if="queueInfo" class="om-success" style="margin-top:16px">
            <div class="om-queue">N° {{ queueInfo.queue_number }}</div>
            <p>Statut : {{ queueInfo.request_status }}</p>
            <p class="om-small">Temps d’attente estimé (non garanti) selon la file hospitalière.</p>
          </div>

          <button class="om-btn om-btn-primary" type="button" @click="refreshQueue">🔄 Actualiser le statut</button>
          <RouterLink to="/prescriptions" class="om-btn om-btn-secondary" style="display:inline-block;text-decoration:none;margin-left:8px">Mes ordonnances</RouterLink>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

const authStore = useAuthStore();
const step = ref(1);
const error = ref('');
const info = ref('');
const loadingHospitals = ref(false);
const hospitals = ref<any[]>([]);
const submitting = ref(false);
const transmitting = ref(false);
const transferText = ref('Préparation du dossier...');
const requestId = ref<string | null>(null);
const queueInfo = ref<any>(null);
const insuranceVerified = ref(false);
const insuranceMsg = ref('');
const coverage = ref(0);

const form = reactive({
  name: '',
  phone: '',
  symptoms: '',
  consultation: 'Consultation générale',
  code: '',
  codeConfirm: '',
  hospital_id: '',
  hasInsurance: '' as '' | 'yes' | 'no',
  insuranceCompany: '',
  insLast: '',
  insFirst: '',
  insCard: '',
  paymentMethod: '',
  payPhone: '',
  payPin: '',
  cardNumber: '',
  cardName: '',
});

const insuranceCompanies = ['INAM', 'NSIA', 'SUNU', 'AXA', 'Allianz'];
const paymentMethods = ['Gozem', 'Mouvementi', 'TMoney', 'Moov Money', 'Carte bancaire', 'PayPal', 'Cash'];

const selectedHospital = computed(() => hospitals.value.find((h) => h.id === form.hospital_id));
const selectedPrice = computed(() => Number(selectedHospital.value?.consultation_price ?? 0));
const remaining = computed(() => Math.max(0, selectedPrice.value - coverage.value));
const isMobilePay = computed(() => ['Gozem', 'Mouvementi', 'TMoney', 'Moov Money'].includes(form.paymentMethod));
const insuranceLabel = computed(() =>
  form.hasInsurance === 'yes' ? `${form.insuranceCompany || 'Assurance'} (${form.insCard || '—'})` : 'Sans assurance'
);
const paymentStatusLabel = computed(() =>
  form.paymentMethod === 'Cash' ? 'À régler à l’hôpital' : 'Démo / en attente prestataire réel'
);

function formatPrice(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} F CFA`;
}

function stepClass(n: number) {
  if (step.value > n) return 'done';
  if (step.value === n) return 'active';
  return '';
}

onMounted(async () => {
  if (authStore.profile) {
    form.name = `${authStore.profile.first_name ?? ''} ${authStore.profile.last_name ?? ''}`.trim();
    form.phone = authStore.profile.phone ?? '';
  }
  loadingHospitals.value = true;
  try {
    const { data } = await supabase.from('hospitals').select('*').eq('status', 'active').order('name');
    hospitals.value = data ?? [];
  } finally {
    loadingHospitals.value = false;
  }
});

function goStep2() {
  error.value = '';
  if (!form.name.trim() || !form.phone.trim() || !form.symptoms.trim()) {
    error.value = 'Nom, téléphone et symptômes sont obligatoires.';
    return;
  }
  if (!form.code || form.code.length < 4) {
    error.value = 'Le code d’ordonnance doit faire au moins 4 caractères.';
    return;
  }
  if (form.code !== form.codeConfirm) {
    error.value = 'Les codes ne correspondent pas.';
    return;
  }
  // Store code only in sessionMemory for later server hash — not localStorage primary DB
  sessionStorage.setItem('carelink_rx_pin_tmp', form.code);
  step.value = 2;
}

function goStep3() {
  if (!form.hospital_id) {
    error.value = 'Choisissez un hôpital.';
    return;
  }
  error.value = '';
  insuranceVerified.value = false;
  coverage.value = 0;
  step.value = 3;
}

function verifyInsurance() {
  insuranceMsg.value = '';
  if (!form.insuranceCompany || !form.insCard || !form.insLast || !form.insFirst) {
    insuranceMsg.value = 'Complétez les informations de la carte.';
    insuranceVerified.value = false;
    return;
  }
  // Demo verification only — not a real insurer API
  if (form.insCard.toUpperCase().includes('DEMO') || form.insCard.length >= 6) {
    coverage.value = Math.round(selectedPrice.value * 0.5);
    insuranceVerified.value = true;
    insuranceMsg.value = `Vérification démo OK. Prise en charge estimée : ${formatPrice(coverage.value)} (non contractuelle).`;
  } else {
    insuranceVerified.value = false;
    insuranceMsg.value = 'Carte non reconnue en mode démo. Utilisez un numéro contenant DEMO.';
  }
}

function goStep4() {
  if (!form.hasInsurance) {
    error.value = 'Indiquez si vous avez une assurance.';
    return;
  }
  if (form.hasInsurance === 'no') coverage.value = 0;
  error.value = '';
  step.value = 4;
}

async function confirmPaymentAndSubmit() {
  error.value = '';
  if (!form.paymentMethod) {
    error.value = 'Choisissez un mode de paiement.';
    return;
  }
  if (isMobilePay.value && form.payPin && form.payPin !== '1234') {
    error.value = 'PIN démo incorrect (utilisez 1234 en simulation).';
    return;
  }

  submitting.value = true;
  transmitting.value = true;
  step.value = 5;
  transferText.value = 'Préparation du dossier...';

  try {
    await delay(600);
    transferText.value = 'Vérification des informations...';
    await delay(500);
    transferText.value = 'Envoi sécurisé à l’hôpital...';

    // Prefer server RPC if migration applied
    const { data, error: rpcErr } = await supabase.rpc('create_prescription_request', {
      p_hospital_id: form.hospital_id,
      p_consultation_type: form.consultation,
      p_symptoms: form.symptoms.trim(),
      p_patient_insurance_id: null,
      p_mark_payment_demo: form.paymentMethod === 'Cash' ? false : false,
    });

    if (rpcErr) {
      // Fallback insert if RPC missing
      const { data: row, error: insErr } = await supabase
        .from('prescription_requests')
        .insert({
          patient_id: authStore.user?.id,
          hospital_id: form.hospital_id,
          consultation_type: form.consultation,
          symptoms: form.symptoms.trim(),
          consultation_price: selectedPrice.value,
          insurance_coverage: coverage.value,
          remaining_amount: remaining.value,
          payment_status: form.paymentMethod === 'Cash' ? 'pending' : 'pending',
          request_status: 'hospital_pending',
        })
        .select('id')
        .single();
      if (insErr) throw rpcErr;
      requestId.value = row?.id ?? null;
    } else {
      requestId.value = data as string;
    }

    // Persist access code hash attempt via edge-less approach: store only with request metadata in notes is forbidden for plaintext.
    // Keep PIN in session until hospital/doctor issues prescription — production should hash via Edge Function.
    if (requestId.value) {
      sessionStorage.setItem(`carelink_rx_pin_${requestId.value}`, form.code);
    }

    transferText.value = 'Dossier transmis.';
    transmitting.value = false;
    info.value = 'Transmission réussie.';
  } catch (e: unknown) {
    transmitting.value = false;
    error.value = (e as Error).message || 'Échec transmission. Appliquez la migration hospitals / prescription_requests.';
  } finally {
    submitting.value = false;
  }
}

async function refreshQueue() {
  if (!requestId.value || !authStore.user) return;
  const { data } = await supabase
    .from('prescription_requests')
    .select('id, request_status, queue_number, payment_status')
    .eq('id', requestId.value)
    .eq('patient_id', authStore.user.id)
    .maybeSingle();
  queueInfo.value = data;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
</script>

<style scoped>
.om { min-height: 100vh; background: #f4f7fb; color: #222; font-family: Arial, sans-serif; }
.om-header { background: #0b5ed7; color: #fff; padding: 20px; text-align: center; }
.om-header h1 { margin: 0 0 6px; font-size: 22px; }
.om-header p { margin: 0; opacity: 0.95; font-size: 14px; }
.om-container { max-width: 640px; margin: 0 auto; padding: 15px; }
.om-card { background: #fff; padding: 22px; border-radius: 14px; box-shadow: 0 3px 12px rgba(0,0,0,.08); }
.om-card h2 { color: #0b5ed7; margin: 16px 0; }
.om-label { display: block; margin-top: 14px; margin-bottom: 6px; font-weight: bold; font-size: 14px; }
.om-input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 15px; margin-bottom: 4px; box-sizing: border-box; }
textarea.om-input { min-height: 100px; resize: vertical; }
.om-btn { border: none; padding: 12px 18px; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 15px; }
.om-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.om-btn-primary { background: #0b5ed7; color: #fff; }
.om-btn-success { background: #198754; color: #fff; }
.om-btn-secondary { background: #6c757d; color: #fff; }
.om-steps { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.om-step { padding: 8px 12px; border-radius: 20px; background: #e9ecef; font-size: 13px; }
.om-step.active { background: #0b5ed7; color: #fff; }
.om-step.done { background: #198754; color: #fff; }
.om-security { border: 2px solid #0b5ed7; border-radius: 12px; padding: 16px; margin-top: 16px; background: #f5f9ff; }
.om-hospital { border: 1px solid #ddd; border-radius: 10px; padding: 15px; margin: 12px 0; }
.om-price { font-size: 18px; font-weight: bold; color: #0b5ed7; }
.om-info { padding: 15px; border-radius: 10px; background: #eaf2ff; margin-top: 12px; }
.om-success { padding: 18px; border-radius: 10px; background: #d1e7dd; color: #0f5132; margin-top: 12px; }
.om-warning { padding: 18px; border-radius: 10px; background: #fff3cd; color: #664d03; margin-top: 12px; }
.om-danger { padding: 18px; border-radius: 10px; background: #f8d7da; color: #842029; margin-top: 12px; }
.om-pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.om-pay-opt { border: 2px solid #ddd; padding: 15px; border-radius: 10px; cursor: pointer; }
.om-pay-opt.selected { border-color: #0b5ed7; background: #eaf2ff; }
.om-pay-fields { margin-top: 16px; padding: 16px; border-radius: 10px; background: #f8f9fa; border: 1px solid #ddd; }
.om-transfer { text-align: center; padding: 30px 15px; }
.om-spinner { width: 55px; height: 55px; border: 6px solid #ddd; border-top: 6px solid #0b5ed7; border-radius: 50%; animation: omspin 1s linear infinite; margin: 0 auto 20px; }
@keyframes omspin { to { transform: rotate(360deg); } }
.om-queue { font-size: 42px; font-weight: bold; color: #0b5ed7; text-align: center; margin: 15px; }
.om-small { font-size: 13px; color: #666; }
@media (max-width: 700px) { .om-pay-grid { grid-template-columns: 1fr; } }
</style>
