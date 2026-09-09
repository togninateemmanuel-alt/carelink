<template>
  <AppLayout page-title="Panier">
    <div v-if="cartStore.loading" class="dash-loading"><div class="spinner" /></div>
    <template v-else>
      <div v-if="cartStore.items.length===0" class="dash-section dash-empty"><p class="dash-empty-title">Panier vide</p><p class="dash-empty-desc">Ajoutez des produits depuis le marketplace.</p><RouterLink to="/marketplace" class="btn btn-primary btn-sm">Marketplace</RouterLink></div>
      <template v-else>
        <div class="dash-list" style="margin-bottom:14px"><div v-for="item in cartStore.items" :key="item.id" class="dash-section dash-list-item" style="margin-bottom:8px"><div class="dash-list-body"><div class="dash-list-title">{{item.products?.name||'Produit'}}</div><div class="dash-list-meta">{{formatPrice(item.unit_price)}} × {{item.quantity}}</div><div style="display:flex;gap:8px;margin-top:8px;align-items:center"><button class="btn btn-secondary btn-sm" @click="cartStore.updateQuantity(item.id,item.quantity-1)">−</button><b>{{item.quantity}}</b><button class="btn btn-secondary btn-sm" @click="cartStore.updateQuantity(item.id,item.quantity+1)">+</button><button class="btn btn-ghost btn-sm" style="margin-left:auto;color:var(--color-error-600)" @click="cartStore.removeItem(item.id)">Retirer</button></div></div></div></div>
        <section class="dash-section"><div style="display:flex;justify-content:space-between;margin-bottom:12px"><span>Total</span><strong>{{formatPrice(cartStore.totalAmount)}}</strong></div>
          <label class="form-label">Assurance</label>
          <select v-model="insuranceId" class="input" style="width:100%;margin-bottom:10px"><option value="">Sans assurance</option><option v-for="i in insurances" :key="i.id" :value="i.id">{{i.provider?.name||'Assurance'}} · {{i.policy_number}}</option></select>
          <p v-if="insurances.length===0" class="dash-list-meta">Aucune assurance vérifiée enregistrée. La commande sera facturée sans couverture.</p>
          <label class="form-label">Mode de retrait</label><select v-model="deliveryMode" class="input" style="width:100%;margin-bottom:10px"><option value="pickup">Retrait en pharmacie</option><option value="standard_delivery">Livraison standard</option><option value="express_delivery">Livraison express</option></select>
          <label class="form-label">Note (optionnel)</label><textarea v-model="notes" class="input" rows="2" placeholder="Information pour la commande"></textarea>
          <div v-if="error" class="alert alert-error" style="margin:12px 0">{{error}}</div><div v-if="success" class="alert alert-success" style="margin:12px 0">{{success}}</div>
          <button class="btn btn-primary" style="width:100%" :disabled="checkingOut" @click="doCheckout">{{checkingOut?'Validation…':'Créer la commande'}}</button>
        </section>
      </template>
    </template>
  </AppLayout>
</template>
<script setup lang="ts">
import {ref,onMounted} from 'vue';import {RouterLink,useRouter} from 'vue-router';import AppLayout from '@/components/layout/AppLayout.vue';import {useCartStore} from '@/stores/cart';import {supabase} from '@/lib/supabase';
const cartStore=useCartStore(),router=useRouter(),checkingOut=ref(false),error=ref(''),success=ref(''),insuranceId=ref(''),deliveryMode=ref('pickup'),notes=ref(''),insurances=ref<any[]>([]);
function formatPrice(n:number){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(n);}
async function loadInsurances(){const {data,error:e}=await supabase.from('patient_insurances').select('id,policy_number,coverage_rate_default,provider:insurance_providers(name)').eq('is_verified',true).lte('valid_from',new Date().toISOString().slice(0,10)).gte('valid_until',new Date().toISOString().slice(0,10));if(!e)insurances.value=data||[];}
onMounted(()=>{cartStore.fetchCart();loadInsurances();});
async function doCheckout(){checkingOut.value=true;error.value='';success.value='';try{const result=await cartStore.checkout(deliveryMode.value,undefined,undefined,insuranceId.value||undefined,notes.value||undefined);const first=result?.orders?.[0]?.order_id;if(first){success.value=`Commande créée : ${result.orders[0].order_number||''}`;setTimeout(()=>router.push(`/orders/${first}`),500);}else{success.value='Commande créée.';setTimeout(()=>router.push('/orders'),700);}}catch(e:any){error.value=e.message||'Échec du checkout.';}finally{checkingOut.value=false;}}
</script>
