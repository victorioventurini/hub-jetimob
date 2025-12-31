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
  member_count?: number;
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
  status: "active" | "inactive";
}
