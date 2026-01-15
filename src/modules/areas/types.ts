/**
 * Types for the Areas module
 * Areas are strategic groupings that organize teams - they don't have their own OKRs
 */
import { Tables } from "@/integrations/supabase/types";

export type Area = Tables<"areas">;

export interface AreaWithRelations extends Area {
  leader?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  } | null;
  co_leader?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  } | null;
  teams?: {
    id: string;
    name: string;
    status: string;
    member_count: number;
  }[];
  team_count?: number;
}

export interface AreaFormData {
  name: string;
  description: string;
  leader_user_id: string | null;
  co_leader_user_id: string | null;
  status: "active" | "inactive";
  color: string | null;
  icon: string | null;
}

export type AreaStatus = "active" | "inactive";
