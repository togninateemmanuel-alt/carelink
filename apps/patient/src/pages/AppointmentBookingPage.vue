<template>
  <AppLayout page-title="Nouveau RDV">
    <section class="dash-section">
      <div class="form-group">
        <label class="form-label">Motif de consultation</label>
        <input v-model="reason" class="input" placeholder="Ex: Fièvre, contrôle…" required />
      </div>

      <div class="form-group">
        <label class="form-label">Mode</label>
        <select v-model="mode" class="input">
          <option value="in_person">En présentiel</option>
          <option value="teleconsultation">Téléconsultation</option>
        </select>
      </div>

      <div v-if="error" class="alert alert-error" style="margin-bottom:12px">{{ error }}</div>
      <div v-if="success" class="alert alert-success" style="margin-bottom:12px">{{ success }}</div>

      <h3 style="font-size:14px;margin:8px 0 12px">Créneaux disponibles</h3>

      <div v-if="loading" class="dash-loading"><div class="spinner" /></div>

      <div v-else-if="slots.length === 0" class="dash-empty compact">
        <p class="dash-empty-desc">Aucun créneau disponible pour le moment.</p>
      </div>

      <div v-else class="dash-list">
        <button
          v-for="s in slots"
          :key="s.id"
          type="button"
          class="dash-list-item"
          style="width:100%;text-align:left;border:1px solid var(--color-border);cursor:pointer"
          :disabled="booking"
          @click="book(s.id)"
        >
          <div class="dash-date-box">
            <span class="dash-date-day">{{ day(s.start_time) }}</span>
            <span class="dash-date-month">{{ month(s.start_time) }}</span>
          </div>
          <div class="dash-list-body">
            <div class="dash-list-title">Dr. {{ s.doctor_name }}</div>
            <div class="dash-list-sub">{{ s.specialty }}</div>
            <div class="dash-list-meta">{{ time(s.start_time) }} → {{ time(s.end_time) }}</div>
          </div>
        </button>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(true);
const booking = ref(false);
const reason = ref('');
const mode = ref<'in_person' | 'teleconsultation'>('in_person');
const error = ref('');
const success = ref('');

interface SlotRow {
  id: string;
  start_time: string;
  end_time: string;
  doctor_name: string;
  specialty: string;
}

const slots = ref<SlotRow[]>([]);

function day(d: string) { return new Date(d).getDate(); }
function month(d: string) { return new Date(d).toLocaleString('fr', { month: 'short' }); }
function time(d: string) { return new Date(d).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }); }

onMounted(async () => {
  loading.value = true;
  try {
    const { data } = await supabase
      .from('doctor_slots')
      .select(`
        id, start_time, end_time, status,
        doctor:profiles!doctor_slots_doctor_id_fkey(
          first_name, last_name,
          doctor_profiles(specialty)
        )
      `)
      .eq('status', 'available')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(40);

    slots.value = (data ?? []).map((row: any) => {
      const dp = Array.isArray(row.doctor?.doctor_profiles)
        ? row.doctor.doctor_profiles[0]
        : row.doctor?.doctor_profiles;
      return {
        id: row.id,
        start_time: row.start_time,
        end_time: row.end_time,
        doctor_name: `${row.doctor?.first_name ?? ''} ${row.doctor?.last_name ?? ''}`.trim() || 'Médecin',
        specialty: dp?.specialty ?? 'Médecine générale',
      };
    });
  } finally {
    loading.value = false;
  }
});

async function book(slotId: string) {
  if (!authStore.user) return;
  if (!reason.value.trim()) {
    error.value = 'Indiquez le motif de consultation.';
    return;
  }
  error.value = '';
  success.value = '';
  booking.value = true;
  try {
    const { data, error: rpcError } = await supabase.rpc('book_appointment_slot', {
      p_patient_id: authStore.user.id,
      p_slot_id: slotId,
      p_reason: reason.value.trim(),
      p_mode: mode.value,
    });
    if (rpcError) throw rpcError;
    success.value = 'Rendez-vous confirmé.';
    setTimeout(() => router.push('/appointments'), 800);
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Impossible de réserver ce créneau.';
  } finally {
    booking.value = false;
  }
}
</script>
