<template>
  <AppLayout page-title="Mon profil">
    <div v-if="loading" class="dash-loading"><div class="spinner" /></div>

    <template v-else>
      <section class="dash-section">
        <div class="dash-section-header">
          <h2>Informations personnelles</h2>
        </div>

        <div v-if="error" class="alert alert-error" style="margin-bottom:12px">{{ error }}</div>
        <div v-if="success" class="alert alert-success" style="margin-bottom:12px">{{ success }}</div>

        <form @submit.prevent="saveProfile">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input v-model="form.first_name" class="input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Nom</label>
              <input v-model="form.last_name" class="input" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email</label>
            <input :value="form.email" class="input" disabled />
          </div>

          <div class="form-group">
            <label class="form-label">Téléphone</label>
            <input v-model="form.phone" class="input" type="tel" placeholder="+228 90 00 00 00" />
          </div>

          <div class="form-group">
            <label class="form-label">Date de naissance</label>
            <input v-model="form.date_of_birth" class="input" type="date" />
          </div>

          <div class="form-group">
            <label class="form-label">Adresse</label>
            <input v-model="form.address" class="input" />
          </div>

          <div class="form-group">
            <label class="form-label">Ville</label>
            <input v-model="form.city" class="input" />
          </div>

          <div class="form-group">
            <label class="form-label">Contact d'urgence</label>
            <input v-model="form.emergency_contact_name" class="input" placeholder="Nom" />
          </div>

          <div class="form-group">
            <label class="form-label">Téléphone d'urgence</label>
            <input v-model="form.emergency_contact_phone" class="input" type="tel" />
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%" :disabled="saving">
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </form>
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
const saving = ref(false);
const error = ref('');
const success = ref('');

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  address: '',
  city: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
});

onMounted(async () => {
  if (!authStore.user) return;
  loading.value = true;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, patient_profiles(*)')
      .eq('id', authStore.user.id)
      .single();

    if (profile) {
      const pp = Array.isArray(profile.patient_profiles)
        ? profile.patient_profiles[0]
        : profile.patient_profiles;

      form.value = {
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        date_of_birth: pp?.date_of_birth ?? '',
        address: pp?.address ?? '',
        city: pp?.city ?? '',
        emergency_contact_name: pp?.emergency_contact_name ?? '',
        emergency_contact_phone: pp?.emergency_contact_phone ?? '',
      };
    }
  } finally {
    loading.value = false;
  }
});

async function saveProfile() {
  if (!authStore.user) return;
  error.value = '';
  success.value = '';
  saving.value = true;
  try {
    // Never update role from client
    const { error: pErr } = await supabase
      .from('profiles')
      .update({
        first_name: form.value.first_name,
        last_name: form.value.last_name,
        phone: form.value.phone || null,
      })
      .eq('id', authStore.user.id);

    if (pErr) throw pErr;

    const { error: ppErr } = await supabase
      .from('patient_profiles')
      .update({
        date_of_birth: form.value.date_of_birth || null,
        address: form.value.address || null,
        city: form.value.city || null,
        emergency_contact_name: form.value.emergency_contact_name || null,
        emergency_contact_phone: form.value.emergency_contact_phone || null,
      })
      .eq('profile_id', authStore.user.id);

    if (ppErr) throw ppErr;

    await authStore.fetchProfile();
    success.value = 'Profil mis à jour.';
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Erreur lors de la sauvegarde.';
  } finally {
    saving.value = false;
  }
}
</script>
