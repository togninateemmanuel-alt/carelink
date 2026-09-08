<template>
  <div class="app-shell">
    <!-- Sidebar -->
    <aside class="app-sidebar" :class="{ open: sidebarOpen }">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">CL</div>
        <div class="sidebar-logo-text">
          <span class="sidebar-logo-name">CareLink</span>
          <span class="sidebar-logo-role">Patient</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <div class="sidebar-nav-section">
          <span class="sidebar-nav-label">Principal</span>
          <RouterLink to="/dashboard" class="sidebar-link" :class="{ active: route.name === 'dashboard' }">
            <svg class="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="sidebar-link-text">Tableau de bord</span>
          </RouterLink>

          <RouterLink to="/dossier" class="sidebar-link" :class="{ active: route.name === 'dossier' }">
            <svg class="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="sidebar-link-text">Mon Dossier</span>
          </RouterLink>
        </div>

        <div class="sidebar-nav-section">
          <span class="sidebar-nav-label">Soins</span>
          <RouterLink to="/appointments" class="sidebar-link" :class="{ active: route.path.startsWith('/appointments') }">
            <svg class="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="sidebar-link-text">Rendez-vous</span>
          </RouterLink>

          <RouterLink to="/prescriptions" class="sidebar-link" :class="{ active: route.name === 'prescriptions' }">
            <svg class="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span class="sidebar-link-text">Ordonnances</span>
          </RouterLink>
        </div>

        <div class="sidebar-nav-section">
          <span class="sidebar-nav-label">Pharmacie</span>
          <RouterLink to="/marketplace" class="sidebar-link" :class="{ active: route.name === 'marketplace' }">
            <svg class="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span class="sidebar-link-text">Marketplace</span>
          </RouterLink>

          <RouterLink to="/cart" class="sidebar-link" :class="{ active: route.name === 'cart' }">
            <svg class="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span class="sidebar-link-text">Panier</span>
            <span v-if="cartCount > 0" class="sidebar-link-badge">{{ cartCount }}</span>
          </RouterLink>

          <RouterLink to="/orders" class="sidebar-link" :class="{ active: route.path.startsWith('/orders') }">
            <svg class="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span class="sidebar-link-text">Mes Commandes</span>
          </RouterLink>
        </div>
      </nav>

      <!-- User section -->
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">
          <img v-if="authStore.profile?.avatar_url" :src="authStore.profile.avatar_url as string" alt="Avatar" />
          <span v-else>{{ authStore.userInitials }}</span>
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">{{ authStore.fullName }}</div>
          <div class="sidebar-user-role">Patient</div>
        </div>
        <button class="btn btn-ghost btn-icon" title="Déconnexion" @click="authStore.signOut()">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Mobile sidebar overlay -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      style="position:fixed;inset:0;background:rgb(0 0 0 / 0.4);z-index:150"
      @click="sidebarOpen = false"
    />

    <!-- Main content area -->
    <main class="app-main">
      <!-- Top bar -->
      <header class="app-topbar">
        <button class="btn btn-ghost btn-icon" style="display:none" id="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="flex-1">
          <slot name="topbar-title">
            <h1 style="font-size:var(--font-size-lg);font-weight:700;">{{ pageTitle }}</h1>
          </slot>
        </div>
        <slot name="topbar-actions" />
      </header>

      <!-- Page content -->
      <div class="app-content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';

const props = withDefaults(defineProps<{
  pageTitle?: string;
}>(), {
  pageTitle: 'CareLink',
});

const route = useRoute();
const authStore = useAuthStore();
const cartStore = useCartStore();
const sidebarOpen = ref(false);
const cartCount = computed(() => cartStore.totalItems);
</script>

<style scoped>
@media (max-width: 1024px) {
  #sidebar-toggle {
    display: flex !important;
  }
}
</style>
