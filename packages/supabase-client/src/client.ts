/**
 * Unified Typed Supabase Client Factory
 * Project: CareLink Healthcare Platform
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@carelink/shared';

export type CareLinkSupabaseClient = SupabaseClient<Database>;

let clientInstance: CareLinkSupabaseClient | null = null;

export interface ClientConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

/**
 * Resolves Supabase credentials from runtime environment (Node, Vite, Next.js, or direct args)
 */
export function getEnvCredentials(): { url: string; anonKey: string } {
  const url =
    (typeof process !== 'undefined' && process.env?.['SUPABASE_URL']) ||
    (typeof process !== 'undefined' && process.env?.['NEXT_PUBLIC_SUPABASE_URL']) ||
    (typeof process !== 'undefined' && process.env?.['VITE_SUPABASE_URL']) ||
    'https://placeholder-project.supabase.co';

  const anonKey =
    (typeof process !== 'undefined' && process.env?.['SUPABASE_ANON_KEY']) ||
    (typeof process !== 'undefined' && process.env?.['NEXT_PUBLIC_SUPABASE_ANON_KEY']) ||
    (typeof process !== 'undefined' && process.env?.['VITE_SUPABASE_ANON_KEY']) ||
    'placeholder-anon-key';

  return { url, anonKey };
}

/**
 * Initializes or returns the singleton Supabase client
 */
export function getCareLinkClient(config?: ClientConfig): CareLinkSupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  const { url: envUrl, anonKey: envKey } = getEnvCredentials();
  const url = config?.supabaseUrl || envUrl;
  const anonKey = config?.supabaseAnonKey || envKey;

  clientInstance = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return clientInstance;
}
