/**
 * Hook to detect and fetch external user info
 * External users are identified via partner_contacts table
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ExternalUserInfo } from "../types";

export function useExternalUser() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const {
    data: externalInfo,
    isLoading: isQueryLoading,
    error,
  } = useQuery({
    queryKey: ["external-user-info", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check if user is a partner contact
      const { data, error } = await supabase
        .from("partner_contacts")
        .select(`
          id,
          name,
          email,
          partner_company_id,
          partner_companies!inner (
            id,
            name
          ),
          bu_id,
          bu_units!inner (
            id,
            name,
            legal_entity
          )
        `)
        .eq("profile_user_id", user.id)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        console.error("Error checking external user:", error);
        return null;
      }

      if (!data) {
        return null; // Not an external user
      }

      // Type assertion for joined data
      const company = data.partner_companies as unknown as { id: string; name: string };
      const bu = data.bu_units as unknown as { id: string; name: string; legal_entity: string | null };

      return {
        contactId: data.id,
        name: data.name,
        email: data.email,
        companyId: company.id,
        companyName: company.name,
        buId: bu.id,
        buName: bu.name,
        buLegalName: bu.legal_entity,
      } as ExternalUserInfo;
    },
    enabled: !!user?.id && !isAuthLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isExternal = !!externalInfo;
  const isLoading = isAuthLoading || isQueryLoading;

  return {
    isExternal,
    externalInfo,
    isLoading,
    error,
  };
}
