<template>
  <div class="auth-layout">
    <!-- Left branding panel -->
    <div class="auth-panel-left">
      <div style="position:relative;z-index:1;text-align:center">
        <div style="width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-6);font-size:2rem;font-weight:800;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.3)">
          CL
        </div>
        <h1 style="font-size:var(--font-size-3xl);font-weight:800;margin-bottom:var(--space-4);color:white">
          CareLink Patient
        </h1>
        <p style="font-size:var(--font-size-lg);opacity:0.85;max-width:380px;line-height:1.7;color:white">
          Votre santé, simplifiée. Prenez rendez-vous, gérez vos ordonnances et commandez vos médicaments depuis une seule plateforme.
        </p>

        <div style="margin-top:var(--space-12);display:grid;gap:var(--space-4)">
          <div v-for="feature in features" :key="feature.icon"
            style="display:flex;align-items:center;gap:var(--space-3);text-align:left;background:rgba(255,255,255,0.1);padding:var(--space-4);border-radius:var(--radius-lg);backdrop-filter:blur(4px)">
            <span style="font-size:1.5rem;flex-shrink:0">{{ feature.icon }}</span>
            <div>
              <div style="font-weight:600;font-size:var(--font-size-sm);color:white">{{ feature.title }}</div>
              <div style="font-size:var(--font-size-xs);opacity:0.75;color:white">{{ feature.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right form panel -->
    <div class="auth-panel-right">
      <div class="auth-form-container">
        <!-- Mobile logo -->
        <div style="text-align:center;margin-bottom:var(--space-8);">
          <div style="width:52px;height:52px;background:linear-gradient(135deg,var(--color-primary-500),var(--color-teal-500));border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:var(--font-size-xl);margin:0 auto var(--space-3)">CL</div>
        </div>

        <!-- Tab switch -->
        <div style="display:flex;background:var(--color-neutral-100);border-radius:var(--radius-lg);padding:var(--space-1);margin-bottom:var(--space-6)">
          <button
            id="tab-login"
            class="btn"
            :style="mode === 'login' ? 'flex:1;background:white;color:var(--color-text-main);box-shadow:var(--shadow-sm)' : 'flex:1;background:transparent;color:var(--color-text-sub)'"
            @click="switchToLogin()"
          >Connexion</button>
          <button
            id="tab-register"
            class="btn"
            :style="mode === 'register' ? 'flex:1;background:white;color:var(--color-text-main);box-shadow:var(--shadow-sm)' : 'flex:1;background:transparent;color:var(--color-text-sub)'"
            @click="mode = 'register'; error = ''; info = ''"
          >Inscription</button>
        </div>

        <!-- Error alert -->
        <div v-if="error" class="alert alert-error" style="margin-bottom:var(--space-4)">
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>

        <!-- Info / success alert -->
        <div v-if="info" class="alert alert-success" style="margin-bottom:var(--space-4)">
          <span>ℹ️</span>
          <span>{{ info }}</span>
        </div>

        <!-- Login Form -->
        <form v-if="mode === 'login'" id="form-login" @submit.prevent="handleLogin">
          <h2 style="font-size:var(--font-size-2xl);font-weight:800;margin-bottom:var(--space-2)">Bienvenue !</h2>
          <p style="color:var(--color-text-sub);margin-bottom:var(--space-6);font-size:var(--font-size-sm)">Connectez-vous à votre espace patient.</p>

          <div class="form-group">
            <label class="form-label" for="login-email">Adresse e-mail</label>
            <div class="input-group">
              <svg class="input-group-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input id="login-email" v-model="loginForm.email" type="email" class="input" placeholder="vous@exemple.com" required autocomplete="email" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">Mot de passe</label>
            <div class="input-group">
              <svg class="input-group-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input id="login-password" v-model="loginForm.password" type="password" class="input" placeholder="••••••••" required autocomplete="current-password" />
            </div>
          </div>

          <button id="btn-login" type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:var(--space-2)" :disabled="authStore.loading">
            <span v-if="authStore.loading" class="spinner" style="width:18px;height:18px;border-width:2px" />
            <span v-else>Se connecter</span>
          </button>
        </form>

        <!-- Register Form -->
        <form v-else id="form-register" @submit.prevent="handleRegister">
          <h2 style="font-size:var(--font-size-2xl);font-weight:800;margin-bottom:var(--space-2)">Créer un compte</h2>
          <p style="color:var(--color-text-sub);margin-bottom:var(--space-6);font-size:var(--font-size-sm)">Rejoignez CareLink et prenez en main votre santé.</p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
            <div class="form-group">
              <label class="form-label" for="reg-firstname">Prénom</label>
              <input id="reg-firstname" v-model="registerForm.firstName" type="text" class="input" placeholder="Jean" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-lastname">Nom</label>
              <input id="reg-lastname" v-model="registerForm.lastName" type="text" class="input" placeholder="Dupont" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-email">Adresse e-mail</label>
            <input id="reg-email" v-model="registerForm.email" type="email" class="input" placeholder="vous@exemple.com" required autocomplete="email" />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-phone">Téléphone (optionnel)</label>
            <input id="reg-phone" v-model="registerForm.phone" type="tel" class="input" placeholder="+228 90 00 00 00" />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-password">Mot de passe</label>
            <input id="reg-password" v-model="registerForm.password" type="password" class="input" placeholder="Au moins 8 caractères" required minlength="8" autocomplete="new-password" />
          </div>

          <button id="btn-register" type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:var(--space-2)" :disabled="authStore.loading">
            <span v-if="authStore.loading" class="spinner" style="width:18px;height:18px;border-width:2px" />
            <span v-else>Créer mon compte</span>
          </button>
        </form>

        <p style="text-align:center;margin-top:var(--space-6);font-size:var(--font-size-xs);color:var(--color-text-muted)">
          En continuant, vous acceptez les <a href="#">Conditions d'utilisation</a> et la <a href="#">Politique de confidentialité</a>.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const mode = ref<'login' | 'register'>('login');
const error = ref('');
const info = ref('');

const loginForm = ref({ email: '', password: '' });
const registerForm = ref({ firstName: '', lastName: '', email: '', phone: '', password: '' });

const features = [
  { icon: '📅', title: 'Rendez-vous en ligne', desc: 'Réservez avec un médecin en quelques clics' },
  { icon: '📋', title: 'Dossier médical personnel', desc: 'Centralisé, sécurisé et accessible partout' },
  { icon: '💊', title: 'Marketplace pharmaceutique', desc: 'Comparez et commandez auprès de pharmacies vérifiées' },
];

function switchToLogin(prefillEmail = '') {
  mode.value = 'login';
  error.value = '';
  info.value = '';
  if (prefillEmail) {
    loginForm.value.email = prefillEmail;
  }
}

async function handleLogin() {
  error.value = '';
  info.value = '';
  try {
    await authStore.signIn(loginForm.value.email, loginForm.value.password);
  } catch (e: unknown) {
    const msg = (e as Error).message || '';
    if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
      error.value = 'Email ou mot de passe incorrect.';
    } else {
      error.value = msg || 'Erreur de connexion. Vérifiez vos identifiants.';
    }
  }
}

async function handleRegister() {
  error.value = '';
  info.value = '';
  try {
    const result = await authStore.signUp(
      registerForm.value.email,
      registerForm.value.password,
      registerForm.value.firstName,
      registerForm.value.lastName,
      registerForm.value.phone || undefined
    );

    // If we already redirected (session created), nothing more to do
    if (result?.redirected) return;

    // Fallback message only if confirmation is still required
    info.value = 'Compte créé avec succès. Vous pouvez maintenant vous connecter.';
    switchToLogin(registerForm.value.email);
  } catch (e: unknown) {
    const err = e as Error;

    if (err.message === 'ACCOUNT_ALREADY_EXISTS') {
      // Account already exists → switch to login and prefill email
      info.value = 'Ce compte existe déjà. Connectez-vous avec votre email et votre mot de passe.';
      switchToLogin(registerForm.value.email);
      return;
    }

    error.value = err.message || 'Erreur lors de la création du compte.';
  }
}
</script>
