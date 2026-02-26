/**
 * Hook to get BU memberships for external users
 * Converts partner_contacts records into a format compatible with UserBuMembership[]
 */
import { useMemo } from "react";
import { useExternalUser } from "./useExternalUser";
import type { UserBuMembership, BuUnit } from "@/modules/bu/types";

export interface ExternalBuMembership {
  bu_id: string;
  user_id: string;
  role_in_bu: "external";
  is_default: boolean;
  bu_unit: BuUnit;
  created_at: string;
  updated_at: string;
  id: string;
}

/**
 * Returns BU memberships derived from partner_contacts for external users.
 * The returned format is compatible with UserBuMembership[] used in BuContext.
 */
export function useExternalUserBus() {
  const { externalContacts, isLoading, error } = useExternalUser();

  const externalBus = useMemo((): ExternalBuMembership[] => {
    if (!externalContacts || externalContacts.length === 0) return [];

    // Group by BU to avoid duplicates (one user might have multiple contacts in same BU)
    const buMap = new Map<string, ExternalBuMembership>();

    externalContacts.forEach((contact, index) => {
      if (!buMap.has(contact.buId)) {
        buMap.set(contact.buId, {
          id: `external-${contact.buId}`,
          bu_id: contact.buId,
          user_id: "", // Will be filled by context
          role_in_bu: "external",
          is_default: index === 0,
          bu_unit: {
            id: contact.buId,
            name: contact.buName,
            legal_entity: contact.buLegalName,
            // Minimal BuUnit fields - others are optional
            allowed_email_domains: [],
            status: "active",
            created_at: "",
            updated_at: "",
            description: null,
            cnpj: null,
            logo_url: null,
            symbol_url: null,
            primary_color: null,
            secondary_color: null,
            member_display_name: null,
          },
          created_at: "",
          updated_at: "",
        });
      }
    });

    return Array.from(buMap.values());
  }, [externalContacts]);

  return {
    data: externalBus,
    isLoading,
    error,
  };
}
