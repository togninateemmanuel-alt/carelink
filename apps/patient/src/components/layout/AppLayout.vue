<template>
  <div class="app-shell">
    <!-- Top header (mobile) -->
    <header class="mobile-header">
      <div class="mobile-header-left">
        <div class="mobile-logo">CL</div>
        <div class="mobile-header-titles">
          <span class="mobile-app-name">CareLink</span>
          <span class="mobile-page-title">{{ pageTitle }}</span>
        </div>
      </div>
      <div class="mobile-header-actions">
        <button class="icon-btn" type="button" aria-label="Notifications">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <button class="icon-btn" type="button" aria-label="Déconnexion" @click="authStore.signOut()">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="app-main">
      <div class="app-content">
        <slot />
      </div>
    </main>

    <!-- Bottom navigation (mobile-first) -->
    <nav class="bottom-nav" aria-label="Navigation principale">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="bottom-nav-item"
        :class="{ active: isActive(item) }"
      >
        <span class="bottom-nav-icon" v-html="item.icon" />
        <span class="bottom-nav-label">{{ item.label }}</span>
        <span v-if="item.badge && cartCount > 0" class="bottom-nav-badge">{{ cartCount }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';

withDefaults(defineProps<{ pageTitle?: string }>(), {
  pageTitle: 'CareLink',
});

const route = useRoute();
const authStore = useAuthStore();
const cartStore = useCartStore();
const cartCount = computed(() => cartStore.totalItems);

const navItems = [
  {
    to: '/dashboard',
    label: 'Accueil',
    match: ['dashboard'],
    icon: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
  },
  {
    to: '/appointments',
    label: 'RDV',
    match: ['appointments', 'appointments-new'],
    icon: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
  },
  {
    to: '/prescriptions',
    label: 'Ordonnances',
    match: ['prescriptions'],
    icon: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
  },
  {
    to: '/marketplace',
    label: 'Pharmacie',
    match: ['marketplace', 'cart', 'orders', 'order-detail'],
    badge: true,
    icon: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>`,
  },
  {
    to: '/profile',
    label: 'Profil',
    match: ['profile', 'dossier'],
    icon: `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
  },
];

function isActive(item: { match: string[] }) {
  return item.match.includes(String(route.name));
}
</script>
