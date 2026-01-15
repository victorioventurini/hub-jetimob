import { Tables } from "@/integrations/supabase/types";

export type Team = Tables<"teams">;

export interface TeamWithRelations extends Team {
  leader?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  } | null;
  parent_team?: {
    id: string;
    name: string;
  } | null;
  child_teams?: {
    id: string;
    name: string;
    status: string;
  }[];
  area?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  // member_count now comes from Team base type
}

export interface TeamTreeNode {
  id: string;
  name: string;
  description: string | null;
  status: string;
  leader?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  } | null;
  member_count: number;
  children: TeamTreeNode[];
}

export interface TeamFormData {
  name: string;
  description: string;
  leader_user_id: string | null;
  parent_team_id: string | null;
  area_id: string | null;
  status: "active" | "inactive";
}

// Re-export squad types
export * from "./types/squad";
