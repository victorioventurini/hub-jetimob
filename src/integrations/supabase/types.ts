export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cycles: {
        Row: {
          created_at: string
          end_date: string
          id: string
          name: string
          parent_cycle_id: string | null
          planning_date: string | null
          retro_date: string | null
          review_date: string | null
          start_date: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name: string
          parent_cycle_id?: string | null
          planning_date?: string | null
          retro_date?: string | null
          review_date?: string | null
          start_date: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          parent_cycle_id?: string | null
          planning_date?: string | null
          retro_date?: string | null
          review_date?: string | null
          start_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_parent_cycle_id_fkey"
            columns: ["parent_cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          scope: string | null
          slug: string
          status: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          scope?: string | null
          slug: string
          status?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          scope?: string | null
          slug?: string
          status?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          created_at: string
          definition: string
          deleted_at: string | null
          formula: string | null
          id: string
          name: string
          owner_user_id: string | null
          source: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition: string
          deleted_at?: string | null
          formula?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          source?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition?: string
          deleted_at?: string | null
          formula?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          source?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          description: string | null
          health_status: Database["public"]["Enums"]["module_health"]
          icon: string | null
          id: string
          name: string
          owner_user_id: string | null
          route: string | null
          slug: string
          status: Database["public"]["Enums"]["module_status"]
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          health_status?: Database["public"]["Enums"]["module_health"]
          icon?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          route?: string | null
          slug: string
          status?: Database["public"]["Enums"]["module_status"]
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          health_status?: Database["public"]["Enums"]["module_health"]
          icon?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          route?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["module_status"]
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          city: string
          created_at: string
          deleted_at: string | null
          display_name: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          id: string
          job_title: string
          last_name: string
          manager_user_id: string | null
          photo_url: string | null
          slack_id: string | null
          start_date: string
          state: string
          team_id: string | null
          updated_at: string
          user_id: string | null
          whatsapp_personal: string | null
          work_email: string
          work_mode: Database["public"]["Enums"]["work_mode"]
          work_phone: string | null
        }
        Insert: {
          birth_day?: number | null
          birth_month?: number | null
          city: string
          created_at?: string
          deleted_at?: string | null
          display_name: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name: string
          id?: string
          job_title: string
          last_name: string
          manager_user_id?: string | null
          photo_url?: string | null
          slack_id?: string | null
          start_date: string
          state: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_personal?: string | null
          work_email: string
          work_mode?: Database["public"]["Enums"]["work_mode"]
          work_phone?: string | null
        }
        Update: {
          birth_day?: number | null
          birth_month?: number | null
          city?: string
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name?: string
          id?: string
          job_title?: string
          last_name?: string
          manager_user_id?: string | null
          photo_url?: string | null
          slack_id?: string | null
          start_date?: string
          state?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_personal?: string | null
          work_email?: string
          work_mode?: Database["public"]["Enums"]["work_mode"]
          work_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          leader_user_id: string | null
          name: string
          parent_team_id: string | null
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          leader_user_id?: string | null
          name: string
          parent_team_id?: string | null
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          leader_user_id?: string | null
          name?: string
          parent_team_id?: string | null
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_ceo: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "ceo" | "admin" | "team_leader" | "collaborator"
      employment_status: "active" | "vacation" | "terminated"
      module_health: "healthy" | "degraded" | "down"
      module_status: "active" | "inactive" | "coming_soon"
      team_status: "active" | "inactive"
      work_mode: "onsite" | "hybrid" | "remote"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["ceo", "admin", "team_leader", "collaborator"],
      employment_status: ["active", "vacation", "terminated"],
      module_health: ["healthy", "degraded", "down"],
      module_status: ["active", "inactive", "coming_soon"],
      team_status: ["active", "inactive"],
      work_mode: ["onsite", "hybrid", "remote"],
    },
  },
} as const
