// ============================================================
// USE EXTERNAL PROFILE REDIRECT - Hub da Jet
// ============================================================
// Defensive redirect: when /users/:id points to an external user,
// automatically redirects to /contacts/:contactId.
// ============================================================

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';

/**
 * Hook that checks if a profile ID belongs to an external user.
 * If so, looks up the corresponding partner_contacts.id and
 * redirects to /contacts/:contactId.
 *
 * This is a safety net for residual links from when external users
 * could be mentioned as internal users.
 */
export function useExternalProfileRedirect(profileId: string | undefined) {
  const navigate = useNavigate();
  const supabase = useOptionalBuScopedSupabase();

  useEffect(() => {
    if (!profileId || !supabase) return;

    let cancelled = false;

    async function checkAndRedirect() {
      // Step 1: Check if profile is external
      const { data: profile } = await supabase!
        .from('profiles')
        .select('id, user_type, user_id')
        .eq('id', profileId!)
        .maybeSingle();

      if (cancelled || !profile || profile.user_type !== 'external') return;

      // Step 2: Find corresponding partner_contacts record
      const { data: contact } = await supabase!
        .from('partner_contacts')
        .select('id')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (cancelled || !contact) return;

      // Step 3: Redirect
      navigate(`/contacts/${contact.id}`, { replace: true });
    }

    checkAndRedirect();

    return () => { cancelled = true; };
  }, [profileId, supabase, navigate]);
}
