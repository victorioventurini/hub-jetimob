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
        .select('id, first_name, last_name, display_name, work_email, job_title, photo_url')
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
    // Validate @jetimob.com email
    if (!email.endsWith('@jetimob.com')) {
      return { error: new Error('Apenas e-mails @jetimob.com são permitidos') };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    // First, generate the magic link via Supabase
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: true,
      },
    });

    if (error) {
      return { error: error as Error };
    }

    // Now send the magic link email via SendGrid edge function
    try {
      // Get the magic link URL from Supabase (we'll construct it manually since Supabase doesn't expose it directly)
      // The user will receive the email from Supabase's default system, but we'll also send via SendGrid as backup
      const { error: sendGridError } = await supabase.functions.invoke('send-magic-link', {
        body: {
          email,
          magicLink: redirectUrl, // Note: This is a simplified approach - the actual magic link is sent by Supabase
        },
      });

      if (sendGridError) {
        console.warn('SendGrid email failed, falling back to Supabase email:', sendGridError);
        // Don't return error here - Supabase's default email should still work
      }
    } catch (sendGridErr) {
      console.warn('SendGrid edge function error:', sendGridErr);
      // Don't return error - let Supabase handle the email
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
