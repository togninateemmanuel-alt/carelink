<template>
  <AppLayout :page-title="title">
    <section class="card" style="max-width:720px;margin:var(--space-8) auto;text-align:center;padding:var(--space-10)">
      <div style="font-size:3rem;margin-bottom:var(--space-4)">{{ icon }}</div>
      <h2 style="font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--space-3)">{{ title }}</h2>
      <p style="color:var(--color-text-sub);line-height:1.6;margin:0 auto var(--space-6);max-width:520px">
        Cette section est en cours de préparation. Le tableau de bord reste disponible dès maintenant.
      </p>
      <RouterLink to="/dashboard" class="btn btn-primary">Retour au tableau de bord</RouterLink>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';

const route = useRoute();
const pages: Record<string, { title: string; icon: string }> = {
  profile: { title: 'Mon profil', icon: '👤' },
  dossier: { title: 'Mon dossier médical', icon: '📋' },
  appointments: { title: 'Mes rendez-vous', icon: '📅' },
  'appointments-new': { title: 'Prendre un rendez-vous', icon: '📅' },
  prescriptions: { title: 'Mes ordonnances', icon: '💊' },
  marketplace: { title: 'Marketplace', icon: '🛍️' },
  cart: { title: 'Mon panier', icon: '🛒' },
  orders: { title: 'Mes commandes', icon: '📦' },
  'order-detail': { title: 'Détail de commande', icon: '📦' },
};

const page = computed(() => pages[String(route.name)] ?? { title: 'CareLink', icon: '✨' });
const title = computed(() => page.value.title);
const icon = computed(() => page.value.icon);
</script>
