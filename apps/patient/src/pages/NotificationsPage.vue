<template>
  <AppLayout page-title="Notifications">
    <div v-if="loading" class="dash-loading"><div class="spinner" /></div>

    <div v-else-if="items.length === 0" class="dash-section dash-empty">
      <p class="dash-empty-title">Aucune notification</p>
      <p class="dash-empty-desc">Les alertes RDV, ordonnances et commandes apparaîtront ici.</p>
    </div>

    <div v-else class="dash-list">
      <button
        v-for="n in items"
        :key="n.id"
        type="button"
        class="dash-section dash-list-item"
        style="width:100%;text-align:left;margin-bottom:8px;cursor:pointer"
        @click="markRead(n)"
      >
        <div class="dash-list-body">
          <div class="dash-list-title">{{ n.title }}</div>
          <div class="dash-list-sub">{{ n.message }}</div>
          <div class="dash-list-meta">{{ formatDate(n.created_at) }} · {{ n.notification_type }}</div>
        </div>
        <span v-if="!n.is_read" class="badge badge-blue">Nouveau</span>
      </button>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

const authStore = useAuthStore();
const loading = ref(true);
const items = ref<any[]>([]);

function formatDate(d: string) {
  return new Date(d).toLocaleString('fr', { dateStyle: 'short', timeStyle: 'short' });
}

async function load() {
  if (!authStore.user) return;
  loading.value = true;
  try {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    items.value = data ?? [];
  } finally {
    loading.value = false;
  }
}

async function markRead(n: any) {
  if (n.is_read) return;
  await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
  n.is_read = true;
}

onMounted(load);
</script>
