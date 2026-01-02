import { Tables } from "@/integrations/supabase/types";

export type BuUnit = Tables<"bu_units">;
export type BuUserMembership = Tables<"bu_user_memberships">;

export interface BuUnitWithDetails extends BuUnit {
  member_count?: number;
}

export interface UserBuMembership extends BuUserMembership {
  bu_unit?: BuUnit;
}

export type BuStatus = "active" | "inactive";
