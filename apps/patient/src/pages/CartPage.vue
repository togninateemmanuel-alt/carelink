<template>
  <AppLayout page-title="Panier">
    <div v-if="cartStore.loading" class="dash-loading"><div class="spinner" /></div>

    <template v-else>
      <div v-if="cartStore.items.length === 0" class="dash-section dash-empty">
        <p class="dash-empty-title">Panier vide</p>
        <p class="dash-empty-desc">Ajoutez des produits depuis le marketplace.</p>
        <RouterLink to="/marketplace" class="btn btn-primary btn-sm">Marketplace</RouterLink>
      </div>

      <template v-else>
        <div class="dash-list" style="margin-bottom:14px">
          <div v-for="item in cartStore.items" :key="item.id" class="dash-section dash-list-item" style="margin-bottom:8px">
            <div class="dash-list-body">
              <div class="dash-list-title">{{ item.products?.name || 'Produit' }}</div>
              <div class="dash-list-meta">{{ formatPrice(item.unit_price) }} × {{ item.quantity }}</div>
              <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
                <button class="btn btn-secondary btn-sm" @click="cartStore.updateQuantity(item.id, item.quantity - 1)">−</button>
                <span style="font-weight:700">{{ item.quantity }}</span>
                <button class="btn btn-secondary btn-sm" @click="cartStore.updateQuantity(item.id, item.quantity + 1)">+</button>
                <button class="btn btn-ghost btn-sm" style="margin-left:auto;color:var(--color-error-600)" @click="cartStore.removeItem(item.id)">Retirer</button>
              </div>
            </div>
          </div>
        </div>

        <section class="dash-section">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px">
            <span>Total estimé</span>
            <strong>{{ formatPrice(cartStore.totalAmount) }}</strong>
          </div>
          <p style="font-size:12px;color:var(--color-text-muted);margin-bottom:12px">
            Le total définitif est calculé côté serveur au checkout (stocks + assurance).
          </p>

          <div v-if="error" class="alert alert-error" style="margin-bottom:12px">{{ error }}</div>
          <div v-if="success" class="alert alert-success" style="margin-bottom:12px">{{ success }}</div>

          <button class="btn btn-primary" style="width:100%" :disabled="checkingOut" @click="doCheckout">
            {{ checkingOut ? 'Validation…' : 'Commander' }}
          </button>
        </section>
      </template>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useCartStore } from '@/stores/cart';

const cartStore = useCartStore();
const router = useRouter();
const checkingOut = ref(false);
const error = ref('');
const success = ref('');

function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

onMounted(() => {
  cartStore.fetchCart();
});

async function doCheckout() {
  error.value = '';
  success.value = '';
  checkingOut.value = true;
  try {
    const result = await cartStore.checkout('pickup');
    success.value = `Commande créée${result?.order_number ? ' : ' + result.order_number : ''}.`;
    setTimeout(() => router.push('/orders'), 900);
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Échec du checkout.';
  } finally {
    checkingOut.value = false;
  }
}
</script>
