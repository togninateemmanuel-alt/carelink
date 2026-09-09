<template>
  <AppLayout page-title="Nouvelle demande">
    <div v-if="error" class="alert alert-error" style="margin-bottom:12px">{{ error }}</div>
    <div v-if="success" class="alert alert-success" style="margin-bottom:12px">{{ success }}</div>

    <!-- Step 1: symptoms -->
    <section v-if="step === 1" class="dash-section">
      <h2 style="font-size:15px;margin-bottom:12px">1. Motif & symptômes</h2>
      <div class="form-group">
        <label class="form-label">Type de consultation</label>
        <select v-model="form.consultation_type" class="input">
          <option value="general">Générale</option>
          <option value="urgent">Urgence relative</option>
          <option value="followup">Suivi</option>
          <option value="pediatric">Pédiatrie</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Symptômes</label>
        <textarea v-model="form.symptoms" class="input" rows="4" placeholder="Décrivez vos symptômes…" />
      </div>
      <p style="font-size:11px;color:var(--color-text-muted);margin-bottom:12px">
        L’indicateur de priorité automatique est un aide administratif et ne remplace pas un triage médical professionnel.
      </p>
      <button class="btn btn-primary" style="width:100%" :disabled="!form.symptoms.trim()" @click="step = 2">Continuer</button>
    </section>

    <!-- Step 2: hospital -->
    <section v-else-if="step === 2" class="dash-section">
      <h2 style="font-size:15px;margin-bottom:12px">2. Choisir un hôpital</h2>
      <div v-if="loadingHospitals" class="dash-loading"><div class="spinner" /></div>
      <div v-else-if="hospitals.length === 0" class="dash-empty compact">
        <p class="dash-empty-desc">Aucun hôpital actif. Contactez l’administrateur CareLink.</p>
      </div>
      <div v-else class="dash-list">
        <button
          v-for="h in hospitals"
          :key="h.id"
          type="button"
          class="dash-list-item"
          style="width:100%;text-align:left;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer"
          :class="{ active: form.hospital_id === h.id }"
          @click="form.hospital_id = h.id"
        >
          <div class="dash-list-body">
            <div class="dash-list-title">{{ h.name }}</div>
            <div class="dash-list-sub">{{ h.address }} · {{ h.city }}</div>
            <div class="dash-list-meta">Consultation : {{ formatPrice(Number(h.consultation_price)) }}</div>
          </div>
        </button>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-secondary" style="flex:1" @click="step = 1">Retour</button>
        <button class="btn btn-primary" style="flex:1" :disabled="!form.hospital_id" @click="step = 3">Continuer</button>
      </div>
    </section>

    <!-- Step 3: payment note -->
    <section v-else-if="step === 3" class="dash-section">
      <h2 style="font-size:15px;margin-bottom:12px">3. Paiement</h2>
      <p class="dash-list-sub" style="margin-bottom:8px">
        Montant estimé : <strong>{{ formatPrice(selectedPrice) }}</strong>
      </p>
      <div class="alert alert-warning" style="margin-bottom:12px">
        Les moyens Gozem, TMoney, Moov Money, carte, PayPal sont <strong>Demo / indisponibles</strong> tant qu’aucun prestataire réel n’est configuré.
        Aucun paiement n’est marqué réussi depuis le téléphone.
      </div>
      <label class="form-label">Méthode (information seulement)</label>
      <select v-model="form.payment_method" class="input">
        <option value="demo_unavailable">Demo / indisponible</option>
        <option value="cash_at_hospital">Espèces à l’hôpital</option>
      </select>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-secondary" style="flex:1" @click="step = 2">Retour</button>
        <button class="btn btn-primary" style="flex:1" :disabled="submitting" @click="submit">
          {{ submitting ? 'Envoi…' : 'Soumettre la demande' }}
        </button>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import { supabase } from '@/lib/supabase';

const router = useRouter();
const step = ref(1);
const loadingHospitals = ref(false);
const submitting = ref(false);
const error = ref('');
const success = ref('');
const hospitals = ref<any[]>([]);

const form = reactive({
  consultation_type: 'general',
  symptoms: '',
  hospital_id: '',
  payment_method: 'demo_unavailable',
});

const selectedPrice = computed(() => {
  const h = hospitals.value.find((x) => x.id === form.hospital_id);
  return h ? Number(h.consultation_price) : 0;
});

function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

onMounted(async () => {
  loadingHospitals.value = true;
  try {
    const { data } = await supabase
      .from('hospitals')
      .select('id, name, address, city, consultation_price, status')
      .eq('status', 'active')
      .order('name');
    hospitals.value = data ?? [];
  } finally {
    loadingHospitals.value = false;
  }
});

async function submit() {
  error.value = '';
  success.value = '';
  if (!form.hospital_id || !form.symptoms.trim()) {
    error.value = 'Hôpital et symptômes obligatoires.';
    return;
  }
  submitting.value = true;
  try {
    const { data, error: rpcErr } = await supabase.rpc('create_prescription_request', {
      p_hospital_id: form.hospital_id,
      p_consultation_type: form.consultation_type,
      p_symptoms: form.symptoms.trim(),
      p_patient_insurance_id: null,
      p_mark_payment_demo: false,
    });
    if (rpcErr) throw rpcErr;
    success.value = 'Demande créée. En attente de traitement hospitalier / paiement réel si montant dû.';
    setTimeout(() => router.push('/prescription-requests'), 900);
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Échec de création. Vérifiez que la migration est appliquée.';
  } finally {
    submitting.value = false;
  }
}
</script>
