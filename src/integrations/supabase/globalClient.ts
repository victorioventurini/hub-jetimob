/**
 * Global Supabase Client - Singleton Pattern
 * 
 * This file provides a properly configured global Supabase client that:
 * 1. Uses `detectSessionInUrl: false` to prevent "Multiple GoTrueClient instances" warnings
 * 2. Delegates session URL detection to a single point (AuthCallback page)
 * 3. Ensures compatibility with the BU-scoped singleton client
 * 
 * IMPORTANT: All auth operations (signIn, signOut, getSession) should use this client.
 * The auto-generated client.ts does NOT have detectSessionInUrl: false, causing conflicts.
 * 
 * @see docs/engineering/TECHNICAL_CONTEXT_REGISTRY.md
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { sharedSessionStorage } from "./sharedSessionStorage";


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Singleton instance (HMR-safe)
// Vite HMR can re-evaluate modules without a full page reload, which would otherwise
// create multiple GoTrueClient instances under the same storage key.
type GlobalThisWithSupabaseSingleton = typeof globalThis & {
  __hubJet_globalSupabaseClient?: SupabaseClient<Database> | null;
};

function getGlobalSingleton(): SupabaseClient<Database> | null {
  return (globalThis as GlobalThisWithSupabaseSingleton).__hubJet_globalSupabaseClient ?? null;
}

function setGlobalSingleton(client: SupabaseClient<Database> | null): void {
  (globalThis as GlobalThisWithSupabaseSingleton).__hubJet_globalSupabaseClient = client;
}

/**
 * Returns the singleton global Supabase client.
 * 
 * Key configuration:
 * - detectSessionInUrl: false - Prevents multiple clients from competing to detect session in URL
 * - The AuthCallback page explicitly handles URL session detection via supabase.auth.getSession()
 */
function createGlobalClient(): SupabaseClient<Database> {
  const existing = getGlobalSingleton();
  if (existing) return existing;

  const created = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      // SSO: em *.jetimob.com a sessão vai para cookie no domínio raiz,
      // permitindo que os satélites VibeCoding leiam a mesma sessão.
      // Fora do domínio (preview/localhost) cai para localStorage.
      storage: sharedSessionStorage(),
      persistSession: true,

      autoRefreshToken: true,
      // CRITICAL: Disable URL detection to prevent competing with BU-scoped client
      // The AuthCallback page handles session extraction from URL explicitly
      detectSessionInUrl: false,
      // Lock nativo do GoTrue (Navigator LockManager) HABILITADO — coordena
      // refresh de token entre múltiplas abas no desktop. Versões anteriores
      // usavam um lock no-op para contornar um deadlock interno do useAuth
      // (getSession() concorrente com onAuthStateChange). Esse deadlock foi
      // eliminado simplificando o useAuth para confiar apenas em INITIAL_SESSION,
      // permitindo restaurar o lock nativo e estancar o sign-out silencioso
      // que ocorria quando duas abas tentavam consumir o mesmo refresh token.
      // Ver: docs/qa/QA_AUTH_DESKTOP_SESSION.md
    },
  });

  setGlobalSingleton(created);
  return created;
}

/**
 * The singleton global Supabase client.
 * 
 * Use this for:
 * - Authentication operations (signIn, signOut, getSession)
 * - PRE-BU data access (profiles, bu_units, bu_user_memberships)
 * - Edge function invocations
 * 
 * DO NOT use for BU-scoped operational data - use useBuScopedSupabase() instead.
 */
export const supabase = createGlobalClient();
