/**
 * Hook to detect and fetch external user info
 * External users are identified via partner_contacts table
 * Supports multi-BU: returns all active contacts across BUs
 * 
 * NOTE: Uses global supabase client (not bu-scoped) because this runs
 * BEFORE BuProvider is initialized - it's used to populate BuContext itself.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import type { ExternalContactRecord, ExternalUserData, ExternalUserInfo } from "../types";

export function useExternalUser() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const {
    data: externalData,
    isLoading: isQueryLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.external.userInfo(user?.id ?? null),
    queryFn: async (): Promise<ExternalUserData> => {
      if (!user?.id) {
        return { contacts: [], allBuIds: [], primaryContact: null, isExternal: false };
      }

      // Fetch ALL active partner contacts for this user (multi-BU support)
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
        .is("deleted_at", null);

      if (error) {
        console.error("Error checking external user:", error);
        return { contacts: [], allBuIds: [], primaryContact: null, isExternal: false };
      }

      if (!data || data.length === 0) {
        return { contacts: [], allBuIds: [], primaryContact: null, isExternal: false };
      }

      // Map to ExternalContactRecord array
      const contacts: ExternalContactRecord[] = data.map((record) => {
        const company = record.partner_companies as unknown as { id: string; name: string };
        const bu = record.bu_units as unknown as { id: string; name: string; legal_entity: string | null };

        return {
          contactId: record.id,
          name: record.name,
          email: record.email,
          companyId: company.id,
          companyName: company.name,
          buId: bu.id,
          buName: bu.name,
          buLegalName: bu.legal_entity,
        };
      });

      // Extract unique BU IDs
      const allBuIds = [...new Set(contacts.map(c => c.buId))];

      return {
        contacts,
        allBuIds,
        primaryContact: contacts[0] ?? null,
        isExternal: contacts.length > 0,
      };
    },
    enabled: !!user?.id && !isAuthLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isLoading = isAuthLoading || isQueryLoading;

  // Backward compatibility: externalInfo returns the primary contact
  const externalInfo: ExternalUserInfo | null = externalData?.primaryContact ?? null;
  const isExternal = externalData?.isExternal ?? false;

  return {
    /** True if user has any active partner_contact records */
    isExternal,
    /** Primary contact info (for backward compatibility) */
    externalInfo,
    /** All contacts across all BUs */
    externalContacts: externalData?.contacts ?? [],
    /** All BU IDs the external user has access to */
    allBuIds: externalData?.allBuIds ?? [],
    /** Full external user data */
    externalData: externalData ?? null,
    isLoading,
    error,
  };
}
