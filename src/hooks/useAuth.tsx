/**
 * Authentication Context and Provider
 * 
 * SECURITY NOTE: Client-Side vs Server-Side Authorization
 * =========================================================
 * The `isAdmin` flag and `role` state in this hook are fetched client-side
 * and used ONLY for UI/UX purposes (showing/hiding admin navigation, etc.).
 * 
 * IMPORTANT: These client-side checks are NOT security controls.
 * All actual authorization is enforced server-side via:
 * 
 * 1. RLS Policies - All database tables have Row-Level Security policies
 *    that use the `is_platform_admin(auth.uid())` SECURITY DEFINER function
 *    to validate admin access at the database level.
 * 
 * 2. Database Functions - The `is_platform_admin()` and `is_bu_admin()` functions
 *    query the `user_roles` and `bu_user_memberships` tables directly with
 *    elevated privileges, making it impossible to bypass via client manipulation.
 * 
 * Even if an attacker manipulates the client-side `isAdmin` flag:
 * - They will see admin UI elements but cannot access admin data
 * - All data operations will fail due to RLS policy enforcement
 * - The backend remains secure regardless of client state
 * 
 * This follows the defense-in-depth principle where UI controls provide
 * good UX while RLS provides actual security.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/globalClient';
import { clearAuthSessionStorage, clearBuClientCache } from '@/integrations/supabase/buScopedClient';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  work_email: string;
  job_title: string | null;
  photo_url: string | null;
  onboarding_completed: boolean;
}

interface UserRole {
  role: 'super_admin' | 'admin' | 'collaborator' | 'external';
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole['role'] | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

/**
 * AuthContext - exported for optional consumption in PRE-BU hooks.
 * For standard usage, prefer the useAuth() hook which throws if outside AuthProvider.
 * For PRE-BU hooks (useExternalUser, useUserBus), use useContext(AuthContext) directly
 * with optional chaining to handle undefined gracefully.
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole['role'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Single source of truth: o listener emite INITIAL_SESSION no mount com
    // a sessão já hidratada do storage. Não chamamos getSession() em paralelo
    // para evitar disputa pelo Navigator Lock (deadlock observado na v3.x).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        // Keep BU-scoped clients in sync with the global auth session.
        // Otherwise, a BU client created pre-login can stay "unauth" forever due to caching.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          clearBuClientCache();
        }

        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            if (mounted) fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // Revalidação on focus: ao retornar para a aba (wake de sleep, troca de janela),
    // perguntamos ao GoTrue qual a sessão atual. Isso atualiza o estado local sem
    // bloquear a UI. Se o token foi revogado em outra aba ou pelo servidor, o próprio
    // listener acima emitirá SIGNED_OUT naturalmente.
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      supabase.auth.getSession().catch((err) => {
        console.warn('[useAuth] Revalidação on visibility falhou:', err);
      });
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Safety timeout — garante que isLoading nunca fica travado em true.
    // Elevado de 10s para 20s para cobrir wake de laptop em redes lentas
    // (ex: VPN reconectando, 3G fraco), evitando UI renderizar como deslogado
    // antes do INITIAL_SESSION chegar.
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setIsLoading((prev) => {
          if (prev) {
            console.warn('[useAuth] Safety timeout (20s) — forçando isLoading=false');
          }
          return false;
        });
      }
    }, 20_000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(safetyTimeout);
    };
  }, []);

  async function fetchUserData(userId: string) {
    try {
      // Fetch profile with job_title from job_titles table via FK job_title_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name, work_email, photo_url, onboarding_completed, job_title_rel:job_titles!job_title_id(name)')
        .eq('user_id', userId)
        .maybeSingle();
      
      // Map job_title from joined table, fallback para coluna legada se FK null
      const profile = profileData ? {
        id: profileData.id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        display_name: profileData.display_name,
        work_email: profileData.work_email,
        photo_url: profileData.photo_url,
        onboarding_completed: profileData.onboarding_completed,
        job_title: (profileData.job_title_rel as { name: string } | null)?.name ?? null,
      } : null;
      
      setProfile(profile);

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      setRole(roleData?.role ?? 'collaborator');
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithMagicLink(email: string, redirectTo?: string): Promise<{ error: Error | null }> {
    // Email domain validation is done by the edge function
    // Use provided redirectTo or fallback to root
    const redirectUrl = redirectTo || `${window.location.origin}/`;

    // Hardening v3.25.1 — magic link request hang mitigation
    // ------------------------------------------------------
    // Some clients (corporate proxies, stale service workers, slow networks)
    // observed `supabase.functions.invoke` hanging indefinitely without ever
    // resolving — leaving the UI stuck on "Enviando...". To guarantee the
    // user always gets feedback we:
    //   1) Race the SDK call against an explicit 15s timeout
    //   2) On timeout/network failure, fall back to a direct fetch() against
    //      the edge function URL — bypasses any SDK-level state corruption
    //   3) Always return a deterministic { error } payload
    const TIMEOUT_MS = 15_000;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const fnUrl = `${supabaseUrl}/functions/v1/request-magic-link`;

    const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
        p.then(
          (v) => {
            clearTimeout(t);
            resolve(v);
          },
          (e) => {
            clearTimeout(t);
            reject(e);
          },
        );
      });

    const directFetch = async (): Promise<{ ok: boolean; status: number; data: any }> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ email, redirectTo: redirectUrl }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      // 1) Try the SDK invoke (preferred — handles auth headers automatically)
      const response = await withTimeout(
        supabase.functions.invoke('request-magic-link', {
          body: { email, redirectTo: redirectUrl },
        }),
        TIMEOUT_MS,
        'invoke',
      );

      if (response.error) {
        console.error('[signInWithMagicLink] SDK invoke error:', response.error);
        return { error: new Error(response.error.message || 'Erro ao enviar magic link') };
      }
      if (response.data?.error) {
        return { error: new Error(response.data.error) };
      }
      return { error: null };
    } catch (sdkErr: any) {
      // 2) Fallback: direct fetch — bypasses SDK if it's hung or misconfigured
      console.warn(
        '[signInWithMagicLink] SDK invoke failed/timed out, falling back to direct fetch:',
        sdkErr?.message,
      );
      try {
        const { ok, status, data } = await directFetch();
        if (!ok) {
          const message =
            data?.error?.message ||
            data?.message ||
            (status === 403
              ? 'Esse e-mail não tem acesso ao Next.'
              : 'Erro ao enviar link de acesso. Tente novamente.');
          return { error: new Error(message) };
        }
        if (data?.error) {
          return { error: new Error(typeof data.error === 'string' ? data.error : 'Erro ao enviar link') };
        }
        return { error: null };
      } catch (fetchErr: any) {
        console.error('[signInWithMagicLink] Direct fetch also failed:', fetchErr);
        const isAbort = fetchErr?.name === 'AbortError' || /timeout/i.test(fetchErr?.message || '');
        return {
          error: new Error(
            isAbort
              ? 'A solicitação demorou demais. Verifique sua conexão e tente novamente.'
              : 'Não foi possível conectar ao servidor. Tente outra rede ou modo anônimo.',
          ),
        };
      }
    }
  }

  async function signOut() {
    // Prefer a guaranteed local sign-out to avoid getting stuck "logged in" when the server
    // session is already gone (e.g. refresh token revoked elsewhere, stale session id, etc.).
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore - we'll still clear local session below
    }

    // Defense-in-depth: ensure we remove any persisted auth session keys.
    clearAuthSessionStorage();
    clearBuClientCache();

    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  }

  /**
   * isAdmin flag for UI purposes only.
   * Actual authorization is enforced via RLS policies using is_platform_admin() function.
   * See security note at the top of this file.
   */
  const isAdmin = role === 'super_admin' || role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      isLoading,
      signInWithMagicLink,
      signOut,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
