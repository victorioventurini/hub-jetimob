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
 *    that use the `is_admin_or_ceo(auth.uid())` SECURITY DEFINER function
 *    to validate admin access at the database level.
 * 
 * 2. Database Functions - The `is_admin_or_ceo()` function queries the
 *    `user_roles` table directly with elevated privileges, making it
 *    impossible to bypass via client manipulation.
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

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  work_email: string;
  job_title: string;
  photo_url: string | null;
  onboarding_completed: boolean;
}

interface UserRole {
  role: 'ceo' | 'admin' | 'team_leader' | 'collaborator';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole['role'] | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name, work_email, job_title, photo_url, onboarding_completed')
        .eq('user_id', userId)
        .maybeSingle();
      
      setProfile(profileData);

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

  async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    // Email domain validation is now done by the BU system
    // The Auth page checks against bu_units.allowed_email_domains
    // The edge function also validates domains against the database
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: true,
      },
    });

    if (error) {
      return { error: error as Error };
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  }

  /**
   * isAdmin flag for UI purposes only.
   * Actual authorization is enforced via RLS policies using is_admin_or_ceo() function.
   * See security note at the top of this file.
   */
  const isAdmin = role === 'admin' || role === 'ceo';

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
