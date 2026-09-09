import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const AuthPage = () => import('@/pages/AuthPage.vue');
const DashboardPage = () => import('@/pages/DashboardPage.vue');
const ProfilePage = () => import('@/pages/ProfilePage.vue');
const DossierPage = () => import('@/pages/DossierPage.vue');
const AppointmentsPage = () => import('@/pages/AppointmentsPage.vue');
const AppointmentBookingPage = () => import('@/pages/AppointmentBookingPage.vue');
const PrescriptionsPage = () => import('@/pages/PrescriptionsPage.vue');
const OrdonnanceMobilePage = () => import('@/pages/OrdonnanceMobilePage.vue');
const PrescriptionRequestsPage = () => import('@/pages/PrescriptionRequestsPage.vue');
const MarketplacePage = () => import('@/pages/MarketplacePage.vue');
const CartPage = () => import('@/pages/CartPage.vue');
const OrdersPage = () => import('@/pages/OrdersPage.vue');
const OrderDetailPage = () => import('@/pages/OrderDetailPage.vue');
const NotificationsPage = () => import('@/pages/NotificationsPage.vue');

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/auth', name: 'auth', component: AuthPage, meta: { public: true } },
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
    { path: '/dossier', name: 'dossier', component: DossierPage, meta: { requiresAuth: true } },
    { path: '/appointments', name: 'appointments', component: AppointmentsPage, meta: { requiresAuth: true } },
    { path: '/appointments/new', name: 'appointments-new', component: AppointmentBookingPage, meta: { requiresAuth: true } },
    { path: '/prescriptions', name: 'prescriptions', component: PrescriptionsPage, meta: { requiresAuth: true } },
    { path: '/ordonnance', name: 'ordonnance-mobile', component: OrdonnanceMobilePage, meta: { requiresAuth: true } },
    { path: '/prescriptions/new-request', redirect: '/ordonnance' },
    { path: '/prescription-requests', name: 'prescription-requests', component: PrescriptionRequestsPage, meta: { requiresAuth: true } },
    { path: '/marketplace', name: 'marketplace', component: MarketplacePage, meta: { requiresAuth: true } },
    { path: '/cart', name: 'cart', component: CartPage, meta: { requiresAuth: true } },
    { path: '/orders', name: 'orders', component: OrdersPage, meta: { requiresAuth: true } },
    { path: '/orders/:id', name: 'order-detail', component: OrderDetailPage, meta: { requiresAuth: true } },
    { path: '/notifications', name: 'notifications', component: NotificationsPage, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  if (!authStore.initialized) await authStore.initialize();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'auth', query: { redirect: to.fullPath } };
  }
  if (to.meta.public && authStore.isAuthenticated) return { name: 'dashboard' };
  return true;
});
