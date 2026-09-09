import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const AuthPage = () => import('@/pages/AuthPage.vue');
const DashboardPage = () => import('@/pages/DashboardPage.vue');
const ProfilePage = () => import('@/pages/ProfilePage.vue');
const AppointmentsPage = () => import('@/pages/AppointmentsPage.vue');
const AppointmentBookingPage = () => import('@/pages/AppointmentBookingPage.vue');
const MarketplacePage = () => import('@/pages/MarketplacePage.vue');
const CartPage = () => import('@/pages/CartPage.vue');
const OrdersPage = () => import('@/pages/OrdersPage.vue');
const PlaceholderPage = () => import('@/pages/PlaceholderPage.vue');

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/auth', name: 'auth', component: AuthPage, meta: { public: true } },
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
    { path: '/dossier', name: 'dossier', component: PlaceholderPage, meta: { requiresAuth: true } },
    { path: '/appointments', name: 'appointments', component: AppointmentsPage, meta: { requiresAuth: true } },
    { path: '/appointments/new', name: 'appointments-new', component: AppointmentBookingPage, meta: { requiresAuth: true } },
    { path: '/prescriptions', name: 'prescriptions', component: PlaceholderPage, meta: { requiresAuth: true } },
    { path: '/marketplace', name: 'marketplace', component: MarketplacePage, meta: { requiresAuth: true } },
    { path: '/cart', name: 'cart', component: CartPage, meta: { requiresAuth: true } },
    { path: '/orders', name: 'orders', component: OrdersPage, meta: { requiresAuth: true } },
    { path: '/orders/:id', name: 'order-detail', component: PlaceholderPage, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  if (!authStore.initialized) {
    await authStore.initialize();
  }
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'auth', query: { redirect: to.fullPath } };
  }
  if (to.meta.public && authStore.isAuthenticated) {
    return { name: 'dashboard' };
  }
  return true;
});
