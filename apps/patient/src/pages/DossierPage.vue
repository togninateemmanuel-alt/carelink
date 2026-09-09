<template>
  <AppLayout page-title="Mon dossier">
    <div v-if="loading" class="dash-loading"><div class="spinner" /></div>

    <template v-else-if="!dossier">
      <section class="dash-section dash-empty">
        <p class="dash-empty-title">Dossier non initialisé</p>
        <p class="dash-empty-desc">Votre dossier médical sera créé automatiquement après la finalisation du profil patient.</p>
        <button class="btn btn-primary btn-sm" :disabled="creating" @click="ensureDossier">
          {{ creating ? 'Création…' : 'Initialiser mon dossier' }}
        </button>
        <p v-if="error" class="alert alert-error" style="margin-top:12px">{{ error }}</p>
      </section>
    </template>

    <template v-else>
      <section class="dash-section">
        <div class="dash-section-header"><h2>Synthèse</h2></div>
        <div class="dash-list">
          <div class="dash-list-item">
            <div class="dash-list-body">
              <div class="dash-list-title">Groupe sanguin</div>
              <div class="dash-list-meta">{{ dossier.blood_group || 'Non renseigné' }}</div>
            </div>
          </div>
          <div class="dash-list-item">
            <div class="dash-list-body">
              <div class="dash-list-title">Allergies</div>
              <div class="dash-list-meta">{{ (dossier.allergies || []).length ? dossier.allergies.join(', ') : 'Aucune déclarée' }}</div>
            </div>
          </div>
          <div class="dash-list-item">
            <div class="dash-list-body">
              <div class="dash-list-title">Maladies chroniques</div>
              <div class="dash-list-meta">{{ (dossier.chronic_conditions || []).length ? dossier.chronic_conditions.join(', ') : 'Aucune déclarée' }}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="dash-section">
        <div class="dash-section-header"><h2>Antécédents</h2></div>
        <p class="dash-list-sub" style="margin-bottom:8px"><strong>Médicaux :</strong> {{ dossier.past_medical_history || '—' }}</p>
        <p class="dash-list-sub" style="margin-bottom:8px"><strong>Chirurgicaux :</strong> {{ dossier.surgical_history || '—' }}</p>
        <p class="dash-list-sub"><strong>Familiaux :</strong> {{ dossier.family_history || '—' }}</p>
      </section>

      <section class="dash-section">
        <div class="dash-section-header"><h2>Entrées cliniques</h2></div>
        <div v-if="entries.length === 0" class="dash-empty compact">
          <p class="dash-empty-desc">Aucune entrée pour le moment. Elles apparaîtront après vos consultations.</p>
        </div>
        <div v-else class="dash-list">
          <div v-for="e in entries" :key="e.id" class="dash-list-item">
            <div class="dash-list-body">
              <div class="dash-list-title">{{ e.title }}</div>
              <div class="dash-list-sub">{{ e.entry_type }}</div>
              <div class="dash-list-meta">{{ formatDate(e.created_at) }}</div>
              <p style="font-size:13px;margin-top:6px;color:var(--color-text-sub)">{{ e.content }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

const authStore = useAuthStore();
const loading = ref(true);
const creating = ref(false);
const error = ref('');
const dossier = ref<any>(null);
const entries = ref<any[]>([]);

function formatDate(d: string) {
  return new Date(d).toLocaleString('fr', { dateStyle: 'medium', timeStyle: 'short' });
}

async function load() {
  if (!authStore.user) return;
  loading.value = true;
  error.value = '';
  try {
    const { data: d } = await supabase
      .from('medical_dossiers')
      .select('*')
      .eq('patient_id', authStore.user.id)
      .maybeSingle();

    dossier.value = d;

    if (d) {
      const { data: ents } = await supabase
        .from('medical_record_entries')
        .select('id, entry_type, title, content, created_at')
        .eq('dossier_id', d.id)
        .order('created_at', { ascending: false })
        .limit(30);
      entries.value = ents ?? [];
    } else {
      entries.value = [];
    }
  } finally {
    loading.value = false;
  }
}

async function ensureDossier() {
  if (!authStore.user) return;
  creating.value = true;
  error.value = '';
  try {
    const { error: insErr } = await supabase.from('medical_dossiers').insert({
      patient_id: authStore.user.id,
    });
    if (insErr) throw insErr;
    await load();
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Impossible de créer le dossier.';
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>
