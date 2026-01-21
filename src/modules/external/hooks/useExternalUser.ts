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

      // First, fetch ALL active partner contacts for this user
      const { data: contactsData, error: contactsError } = await supabase
        .from("partner_contacts")
        .select(`
          id,
          name,
          email,
          partner_company_id,
          partner_companies!inner (
            id,
            name
          )
        `)
        .eq("profile_user_id", user.id)
        .eq("status", "active")
        .is("deleted_at", null);

      if (contactsError) {
        console.error("Error checking external user:", contactsError);
        return { contacts: [], allBuIds: [], primaryContact: null, isExternal: false };
      }

      if (!contactsData || contactsData.length === 0) {
        return { contacts: [], allBuIds: [], primaryContact: null, isExternal: false };
      }

      // Get contact IDs
      const contactIds = contactsData.map(c => c.id);

      // Now fetch all BU associations for these contacts
      const { data: associations, error: assocError } = await supabase
        .from("partner_contact_bu_associations")
        .select(`
          id,
          partner_contact_id,
          bu_id,
          is_active,
          bu_units!inner (
            id,
            name,
            legal_entity
          )
        `)
        .in("partner_contact_id", contactIds)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (assocError) {
        console.error("Error fetching BU associations:", assocError);
        // Fallback: use bu_id from contacts directly (legacy)
        const contacts: ExternalContactRecord[] = contactsData.map((record) => {
          const company = record.partner_companies as unknown as { id: string; name: string };
          return {
            contactId: record.id,
            name: record.name,
            email: record.email,
            companyId: company.id,
            companyName: company.name,
            buId: "", // Unknown without associations
            buName: "",
            buLegalName: null,
          };
        }).filter(c => c.buId); // Only include those with BU
        
        const allBuIds = [...new Set(contacts.map(c => c.buId))];
        return {
          contacts,
          allBuIds,
          primaryContact: contacts[0] ?? null,
          isExternal: contacts.length > 0,
        };
      }

      // Build contacts from associations
      const contacts: ExternalContactRecord[] = [];
      const seenKeys = new Set<string>();

      for (const assoc of associations || []) {
        const contact = contactsData.find(c => c.id === assoc.partner_contact_id);
        if (!contact) continue;

        const bu = assoc.bu_units as unknown as { id: string; name: string; legal_entity: string | null };
        const company = contact.partner_companies as unknown as { id: string; name: string };
        
        // Unique key to avoid duplicates
        const key = `${contact.id}-${bu.id}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        contacts.push({
          contactId: contact.id,
          name: contact.name,
          email: contact.email,
          companyId: company.id,
          companyName: company.name,
          buId: bu.id,
          buName: bu.name,
          buLegalName: bu.legal_entity,
        });
      }

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
