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
import { supabase } from '@/integrations/supabase/client';
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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole['role'] | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole['role'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener FIRST
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

    // THEN check for existing session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        if (error) {
          console.error('[useAuth] Error getting session:', error);
          // Clear any corrupted session state
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setIsLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        console.error('[useAuth] Critical error in getSession:', error);
        // Ensure we never get stuck in loading state
        setIsLoading(false);
      });

    // Safety timeout - ensure isLoading becomes false even if something hangs
    const safetyTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('[useAuth] Safety timeout triggered - forcing isLoading to false');
        setIsLoading(false);
      }
    }, 10000); // 10 seconds max

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
    
    try {
      // Call our custom edge function that uses SendGrid
      const response = await supabase.functions.invoke('request-magic-link', {
        body: { email, redirectTo: redirectUrl },
      });

      if (response.error) {
        console.error('Error from request-magic-link:', response.error);
        return { error: new Error(response.error.message || 'Erro ao enviar magic link') };
      }

      if (response.data?.error) {
        return { error: new Error(response.data.error) };
      }

      console.log('Magic link sent successfully via SendGrid to:', email);
      return { error: null };
    } catch (error: any) {
      console.error('Error calling request-magic-link:', error);
      return { error: error as Error };
    }
  }

  async function verifyOtp(email: string, token: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        return { error: new Error(error.message) };
      }

      console.log('OTP verified successfully for:', email);
      return { error: null };
    } catch (error: any) {
      console.error('Error in verifyOtp:', error);
      return { error: error as Error };
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
      verifyOtp,
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
