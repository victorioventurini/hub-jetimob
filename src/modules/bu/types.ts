import { Tables } from "@/integrations/supabase/types";

export type BuUnit = Tables<"bu_units"> & {
  // Extended fields from migration
  cnpj?: string | null;
  logo_url?: string | null;
  symbol_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

export type BuUserMembership = Tables<"bu_user_memberships">;

export interface BuUnitWithDetails extends BuUnit {
  member_count?: number;
}

export interface UserBuMembership extends BuUserMembership {
  bu_unit?: BuUnit;
}

export type BuStatus = "active" | "inactive";
