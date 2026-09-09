import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/lib/supabase';
import { router } from '@/router';
import type { User, Session } from '@supabase/supabase-js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const profile = ref<Record<string, unknown> | null>(null);
  const loading = ref(false);
  const initialized = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const userInitials = computed(() => {
    if (!profile.value) return '?';
    const first = (profile.value.first_name as string)?.[0] ?? '';
    const last = (profile.value.last_name as string)?.[0] ?? '';
    return (first + last).toUpperCase() || '?';
  });
  const fullName = computed(() => {
    if (!profile.value) return '';
    return `${profile.value.first_name} ${profile.value.last_name}`;
  });

  async function initialize() {
    if (initialized.value) return;

    const { data: { session: s } } = await supabase.auth.getSession();
    session.value = s;
    user.value = s?.user ?? null;

    if (user.value) {
      await fetchProfile();
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (_event, s) => {
      session.value = s;
      user.value = s?.user ?? null;
      if (user.value) {
        await fetchProfile();
      } else {
        profile.value = null;
        router.push('/auth');
      }
    });

    initialized.value = true;
  }

  async function fetchProfile() {
    if (!user.value) return;
    const { data } = await supabase
      .from('profiles')
      .select('*, patient_profiles(*)')
      .eq('id', user.value.id)
      .single();
    profile.value = data;
  }

  async function signIn(email: string, password: string) {
    loading.value = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await fetchProfile();
      router.push('/dashboard');
    } finally {
      loading.value = false;
    }
  }

  async function signUp(email: string, password: string, firstName: string, lastName: string, phone?: string) {
    loading.value = true;
    try {
      // Force redirect to the current origin (production Vercel URL or localhost)
      // so email confirmation never sends the user to a wrong localhost:3000
      const redirectTo = `${window.location.origin}/dashboard`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName, phone },
          emailRedirectTo: redirectTo,
        },
      });
      if (error) throw error;
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    user.value = null;
    session.value = null;
    profile.value = null;
    router.push('/auth');
  }

  return {
    user,
    session,
    profile,
    loading,
    initialized,
    isAuthenticated,
    userInitials,
    fullName,
    initialize,
    fetchProfile,
    signIn,
    signUp,
    signOut,
  };
});
