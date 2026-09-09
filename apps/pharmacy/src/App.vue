<template>
  <div class="ph">
    <header><div><h1>💊 Pharmacie CareLink</h1><p>Ordonnances · Stock · Commandes</p></div><button v-if="session" @click="signOut">Déconnexion</button></header>
    <main>
      <section v-if="!session" class="card"><h2>Connexion pharmacie</h2><p v-if="error" class="error">{{ error }}</p><form @submit.prevent="signIn"><input v-model="email" type="email" placeholder="Email" required><input v-model="password" type="password" placeholder="Mot de passe" required><button :disabled="loading">{{ loading ? 'Connexion…' : 'Se connecter' }}</button></form></section>
      <template v-else>
        <section class="card"><h2>{{ pharmacyName || 'Officine' }}</h2><p>{{ staffLabel }}</p><p v-if="error" class="error">{{ error }}</p><p v-if="success" class="success">{{ success }}</p></section>
        <section class="card"><h2>📨 Ordonnances transférées</h2><button @click="loadTransfers">Actualiser</button><div v-if="!transfers.length">Aucun transfert.</div><article v-for="t in transfers" :key="t.id" class="item"><strong>{{ t.prescription_code }}</strong><p>{{ t.patient_name }} · {{ t.status }}</p><button v-if="t.status==='pending'" @click="respondTransfer(t.id,'accepted')">Accepter</button><button v-if="t.status==='pending'" @click="respondTransfer(t.id,'rejected')">Refuser</button><button v-if="t.status==='accepted'" @click="respondTransfer(t.id,'completed')">Délivrée</button></article></section>
        <section class="card"><h2>📦 Stock</h2><button @click="loadStocks">Actualiser</button><article v-for="s in stocks" :key="s.product_id" class="item"><strong>{{ s.product_name }}</strong><p>Stock : {{ s.current_quantity }}</p><button :disabled="s.current_quantity<=0" @click="dispenseOne(s)">Délivrer 1</button></article></section>
        <section class="card"><h2>🛒 Commandes</h2><button @click="loadFulfillments">Actualiser</button><article v-for="f in fulfillments" :key="f.id" class="item"><strong>{{ f.fulfillment_number }}</strong><p>{{ formatPrice(Number(f.subtotal_amount)) }} · {{ f.status }}</p><button v-if="f.status==='pending'" @click="advanceFulfillment(f.id,'preparing')">Préparer</button><button v-if="f.status==='preparing'" @click="advanceFulfillment(f.id,'ready_for_pickup')">Prête</button><button v-if="f.status==='ready_for_pickup'" @click="advanceFulfillment(f.id,'completed')">Remise</button></article></section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

const session=ref<Session|null>(null), profile=ref<any>(null), staff=ref<any>(null), loading=ref(false), error=ref(''), success=ref(''), email=ref(''), password=ref('');
const transfers=ref<any[]>([]), stocks=ref<any[]>([]), fulfillments=ref<any[]>([]), busy=ref(false);
const pharmacyId=computed(()=>staff.value?.pharmacy_id as string|undefined);
const pharmacyName=computed(()=>staff.value?.pharmacies?.name || '');
const staffLabel=computed(()=>profile.value ? `${profile.value.first_name||''} ${profile.value.last_name||''}`.trim() : '');
function formatPrice(n:number){return `${Math.round(n).toLocaleString('fr-FR')} F CFA`;}
async function loadContext(){
  if(!session.value?.user)return;
  const {data:p}=await supabase.from('profiles').select('*').eq('id',session.value.user.id).single(); profile.value=p;
  const {data:s}=await supabase.from('pharmacy_staff').select('*, pharmacies(*)').eq('profile_id',session.value.user.id).eq('is_active',true).limit(1).maybeSingle(); staff.value=s;
  if(!s){error.value='Ce compte n’est pas rattaché à une pharmacie active.';return;}
  await Promise.all([loadTransfers(),loadStocks(),loadFulfillments()]);
}
async function loadTransfers(){if(!pharmacyId.value)return;const {data,error:e}=await supabase.from('prescription_pharmacy_transfers').select('id,status,transferred_at,patient:profiles!prescription_pharmacy_transfers_patient_id_fkey(first_name,last_name),prescriptions(prescription_code)').eq('pharmacy_id',pharmacyId.value).order('transferred_at',{ascending:false}).limit(30);if(e){error.value=e.message;return;}transfers.value=(data||[]).map((t:any)=>({id:t.id,status:t.status,prescription_code:t.prescriptions?.prescription_code||'RX',patient_name:`${t.patient?.first_name||''} ${t.patient?.last_name||''}`.trim()||'Patient'}));}
async function loadStocks(){if(!pharmacyId.value)return;const {data,error:e}=await supabase.from('products').select('id,name,product_stocks!inner(current_quantity,pharmacy_id)').eq('pharmacy_id',pharmacyId.value).eq('is_active',true).limit(50);if(e){error.value=e.message;return;}stocks.value=(data||[]).map((p:any)=>({product_id:p.id,product_name:p.name,current_quantity:p.product_stocks?.[0]?.current_quantity??0}));}
async function loadFulfillments(){if(!pharmacyId.value)return;const {data,error:e}=await supabase.from('order_fulfillments').select('id,fulfillment_number,status,subtotal_amount,created_at').eq('pharmacy_id',pharmacyId.value).order('created_at',{ascending:false}).limit(30);if(e){error.value=e.message;return;}fulfillments.value=data||[];}
async function respondTransfer(id:string,status:'accepted'|'rejected'|'completed'){busy.value=true;error.value='';try{const {error:e}=await supabase.rpc('respond_to_prescription_transfer',{p_transfer_id:id,p_status:status,p_response_notes:null});if(e)throw e;success.value=`Transfert ${status}.`;await loadTransfers();}catch(e:any){error.value=e.message||'Action impossible.';}finally{busy.value=false;}}
async function dispenseOne(s:any){busy.value=true;error.value='';try{const {data,e}=await (async()=>{const r=await supabase.rpc('dispense_stock_item',{p_stock_id:s.product_id,p_quantity:1});return {data:r.data,e:r.error};})();if(e)throw e;s.current_quantity=Number(data);success.value=`Délivrance enregistrée. Stock restant : ${s.current_quantity}.`;await loadStocks();}catch(e:any){error.value=e.message||'Délivrance impossible.';}finally{busy.value=false;}}
async function advanceFulfillment(id:string,status:string){const {error:e}=await supabase.from('order_fulfillments').update({status}).eq('id',id);if(e)error.value=e.message;else{success.value='Commande mise à jour.';await loadFulfillments();}}
async function signIn(){loading.value=true;error.value='';try{const {data,error:e}=await supabase.auth.signInWithPassword({email:email.value,password:password.value});if(e)throw e;session.value=data.session;await loadContext();}catch(e:any){error.value=e.message||'Connexion impossible.';}finally{loading.value=false;}}
async function signOut(){await supabase.auth.signOut();session.value=null;profile.value=null;staff.value=null;transfers.value=[];stocks.value=[];fulfillments.value=[];}
onMounted(async()=>{const {data}=await supabase.auth.getSession();session.value=data.session;if(session.value)await loadContext();supabase.auth.onAuthStateChange((_e,s)=>{session.value=s;});});
</script>

<style scoped>
:global(body){margin:0;font-family:Arial,sans-serif;background:#f4f7fb;color:#222}.ph header{background:#198754;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}.ph main{max-width:760px;margin:auto;padding:16px;display:grid;gap:14px}.card{background:#fff;border-radius:14px;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,.08)}input{display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0;border:1px solid #ccc;border-radius:8px}button{padding:10px 14px;border:0;border-radius:8px;margin:4px;cursor:pointer}.item{border:1px solid #ddd;border-radius:10px;padding:12px;margin-top:10px}.error{color:#b42318}.success{color:#067647}
</style>
