<template>
  <AppLayout page-title="Ordonnances">
    <div v-if="loading" class="dash-loading"><div class="spinner" /></div>

    <div v-else-if="prescriptions.length === 0" class="dash-section dash-empty">
      <p class="dash-empty-title">Aucune ordonnance</p>
      <p class="dash-empty-desc">Vos ordonnances électroniques apparaîtront ici après consultation.</p>
    </div>

    <div v-else class="dash-list">
      <div v-for="rx in prescriptions" :key="rx.id" class="dash-section" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <div>
            <div class="dash-list-title">{{ rx.prescription_code }}</div>
            <div class="dash-list-meta">Dr. {{ rx.doctor_name }} · {{ formatDate(rx.created_at) }}</div>
          </div>
          <span class="badge" :class="rx.status === 'active' ? 'badge-green' : 'badge-neutral'">{{ rx.status }}</span>
        </div>

        <div v-if="rx.items?.length" style="margin-top:10px" class="dash-list">
          <div v-for="it in rx.items" :key="it.id" class="dash-list-item">
            <div class="dash-list-body">
              <div class="dash-list-title">{{ it.medication_name }}</div>
              <div class="dash-list-sub">{{ it.dosage }} · {{ it.form }} · x{{ it.quantity }}</div>
              <div class="dash-list-meta">{{ it.frequency }} · {{ it.duration_days }} j</div>
            </div>
          </div>
        </div>

        <div style="margin-top:12px">
          <label class="form-label">Transférer vers une pharmacie</label>
          <select v-model="selectedPharmacy[rx.id]" class="input" style="margin-bottom:8px">
            <option value="">Choisir une pharmacie…</option>
            <option v-for="ph in pharmacies" :key="ph.id" :value="ph.id">
              {{ ph.name }} — {{ ph.city }}
            </option>
          </select>
          <button
            class="btn btn-primary btn-sm"
            style="width:100%"
            :disabled="!selectedPharmacy[rx.id] || transferring === rx.id"
            @click="transfer(rx.id)"
          >
            {{ transferring === rx.id ? 'Transfert…' : 'Envoyer à la pharmacie' }}
          </button>
          <p v-if="messages[rx.id]" style="font-size:12px;margin-top:8px;color:var(--color-primary-700)">{{ messages[rx.id] }}</p>
          <p v-if="errors[rx.id]" style="font-size:12px;margin-top:8px;color:var(--color-error-600)">{{ errors[rx.id] }}</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

const authStore = useAuthStore();
const loading = ref(true);
const prescriptions = ref<any[]>([]);
const pharmacies = ref<any[]>([]);
const selectedPharmacy = reactive<Record<string, string>>({});
const transferring = ref<string | null>(null);
const messages = reactive<Record<string, string>>({});
const errors = reactive<Record<string, string>>({});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr');
}

onMounted(async () => {
  if (!authStore.user) return;
  loading.value = true;
  try {
    const [{ data: rxs }, { data: ph }] = await Promise.all([
      supabase
        .from('prescriptions')
        .select(`
          id, prescription_code, status, created_at, valid_until,
          doctor:profiles!prescriptions_doctor_id_fkey(first_name, last_name),
          prescription_items(*)
        `)
        .eq('patient_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('pharmacies')
        .select('id, name, city')
        .eq('is_active', true)
        .eq('is_verified', true)
        .order('name')
        .limit(50),
    ]);

    prescriptions.value = (rxs ?? []).map((r: any) => ({
      ...r,
      doctor_name: `${r.doctor?.first_name ?? ''} ${r.doctor?.last_name ?? ''}`.trim() || 'Médecin',
      items: r.prescription_items ?? [],
    }));

    pharmacies.value = ph ?? [];
  } finally {
    loading.value = false;
  }
});

async function transfer(prescriptionId: string) {
  const pharmacyId = selectedPharmacy[prescriptionId];
  if (!pharmacyId) return;
  transferring.value = prescriptionId;
  messages[prescriptionId] = '';
  errors[prescriptionId] = '';
  try {
    const { error } = await supabase.rpc('transfer_prescription_to_pharmacy', {
      p_prescription_id: prescriptionId,
      p_pharmacy_id: pharmacyId,
      p_notes: null,
    });
    if (error) throw error;
    messages[prescriptionId] = 'Ordonnance transférée à la pharmacie choisie.';
  } catch (e: unknown) {
    errors[prescriptionId] = (e as Error).message || 'Transfert impossible.';
  } finally {
    transferring.value = null;
  }
}
</script>
