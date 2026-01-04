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
      ai_agent_documents: {
        Row: {
          agent_id: string
          created_at: string
          created_by: string | null
          description: string | null
          extracted_content: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          name: string
          processing_error: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          extracted_content?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          name: string
          processing_error?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          extracted_content?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          processing_error?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_logs: {
        Row: {
          action_context: string | null
          agent_id: string | null
          agent_name: string
          bu_id: string | null
          created_at: string
          error_message: string | null
          id: string
          input_tokens: number | null
          integration_key: string
          latency_ms: number | null
          model_used: string | null
          output_tokens: number | null
          scope: Database["public"]["Enums"]["agent_scope"]
          status: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          action_context?: string | null
          agent_id?: string | null
          agent_name: string
          bu_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          integration_key: string
          latency_ms?: number | null
          model_used?: string | null
          output_tokens?: number | null
          scope: Database["public"]["Enums"]["agent_scope"]
          status: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          action_context?: string | null
          agent_id?: string | null
          agent_name?: string
          bu_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          integration_key?: string
          latency_ms?: number | null
          model_used?: string | null
          output_tokens?: number | null
          scope?: Database["public"]["Enums"]["agent_scope"]
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_logs_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          allowed_tools: Json | null
          bu_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          integration_key: string
          is_active: boolean
          max_tokens: number | null
          model_name: string | null
          name: string
          output_format: Database["public"]["Enums"]["agent_output_format"]
          output_schema: Json | null
          scope: Database["public"]["Enums"]["agent_scope"]
          slug: string | null
          system_prompt: string
          temperature: number | null
          updated_at: string
        }
        Insert: {
          allowed_tools?: Json | null
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          integration_key: string
          is_active?: boolean
          max_tokens?: number | null
          model_name?: string | null
          name: string
          output_format?: Database["public"]["Enums"]["agent_output_format"]
          output_schema?: Json | null
          scope?: Database["public"]["Enums"]["agent_scope"]
          slug?: string | null
          system_prompt: string
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          allowed_tools?: Json | null
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          integration_key?: string
          is_active?: boolean
          max_tokens?: number | null
          model_name?: string | null
          name?: string
          output_format?: Database["public"]["Enums"]["agent_output_format"]
          output_schema?: Json | null
          scope?: Database["public"]["Enums"]["agent_scope"]
          slug?: string | null
          system_prompt?: string
          temperature?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_integration_key_fkey"
            columns: ["integration_key"]
            isOneToOne: false
            referencedRelation: "hub_integrations_catalog"
            referencedColumns: ["integration_key"]
          },
        ]
      }
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
      bu_agent_activations: {
        Row: {
          agent_id: string
          bu_id: string
          created_at: string
          custom_system_prompt: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          agent_id: string
          bu_id: string
          created_at?: string
          custom_system_prompt?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          agent_id?: string
          bu_id?: string
          created_at?: string
          custom_system_prompt?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bu_agent_activations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_agent_activations_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      bu_ia_config: {
        Row: {
          bu_id: string
          created_at: string
          ia_enabled: boolean
          ia_mode: string
          id: string
          max_calls_per_bu_day: number | null
          max_calls_per_user_day: number | null
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          ia_enabled?: boolean
          ia_mode?: string
          id?: string
          max_calls_per_bu_day?: number | null
          max_calls_per_user_day?: number | null
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          ia_enabled?: boolean
          ia_mode?: string
          id?: string
          max_calls_per_bu_day?: number | null
          max_calls_per_user_day?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bu_ia_config_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: true
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      bu_integrations_config: {
        Row: {
          bu_id: string
          config_mode: Database["public"]["Enums"]["integration_config_mode"]
          config_override_encrypted: Json | null
          created_at: string
          id: string
          integration_key: string
          is_enabled_in_bu: boolean
          last_test_at: string | null
          last_test_message: string | null
          last_test_status:
            | Database["public"]["Enums"]["integration_test_status"]
            | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bu_id: string
          config_mode?: Database["public"]["Enums"]["integration_config_mode"]
          config_override_encrypted?: Json | null
          created_at?: string
          id?: string
          integration_key: string
          is_enabled_in_bu?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?:
            | Database["public"]["Enums"]["integration_test_status"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bu_id?: string
          config_mode?: Database["public"]["Enums"]["integration_config_mode"]
          config_override_encrypted?: Json | null
          created_at?: string
          id?: string
          integration_key?: string
          is_enabled_in_bu?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?:
            | Database["public"]["Enums"]["integration_test_status"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bu_integrations_config_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_integrations_config_integration_key_fkey"
            columns: ["integration_key"]
            isOneToOne: false
            referencedRelation: "hub_integrations_catalog"
            referencedColumns: ["integration_key"]
          },
        ]
      }
      bu_module_configs: {
        Row: {
          bu_id: string
          created_at: string
          disabled_at: string | null
          disabled_by: string | null
          enabled_at: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean
          module_id: string
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          disabled_at?: string | null
          disabled_by?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module_id: string
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          disabled_at?: string | null
          disabled_by?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bu_module_configs_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_module_configs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      bu_units: {
        Row: {
          allowed_email_domains: string[]
          cnpj: string | null
          created_at: string
          description: string | null
          id: string
          legal_entity: string | null
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          status: Database["public"]["Enums"]["bu_status"]
          symbol_url: string | null
          updated_at: string
        }
        Insert: {
          allowed_email_domains?: string[]
          cnpj?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legal_entity?: string | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: Database["public"]["Enums"]["bu_status"]
          symbol_url?: string | null
          updated_at?: string
        }
        Update: {
          allowed_email_domains?: string[]
          cnpj?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legal_entity?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: Database["public"]["Enums"]["bu_status"]
          symbol_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bu_user_memberships: {
        Row: {
          bu_id: string
          created_at: string
          id: string
          is_default: boolean
          role_in_bu: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          role_in_bu?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          role_in_bu?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bu_user_memberships_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
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
      hub_integrations_catalog: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          documentation_url: string | null
          icon: string | null
          id: string
          integration_key: string
          name: string
          status: string
          supports_agents: boolean
          supports_bu_override: boolean
          supports_global_config: boolean
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          documentation_url?: string | null
          icon?: string | null
          id?: string
          integration_key: string
          name: string
          status?: string
          supports_agents?: boolean
          supports_bu_override?: boolean
          supports_global_config?: boolean
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          documentation_url?: string | null
          icon?: string | null
          id?: string
          integration_key?: string
          name?: string
          status?: string
          supports_agents?: boolean
          supports_bu_override?: boolean
          supports_global_config?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      hub_integrations_global_config: {
        Row: {
          config_encrypted: Json | null
          created_at: string
          id: string
          integration_key: string
          is_enabled_global: boolean
          last_test_at: string | null
          last_test_message: string | null
          last_test_status:
            | Database["public"]["Enums"]["integration_test_status"]
            | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_encrypted?: Json | null
          created_at?: string
          id?: string
          integration_key: string
          is_enabled_global?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?:
            | Database["public"]["Enums"]["integration_test_status"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_encrypted?: Json | null
          created_at?: string
          id?: string
          integration_key?: string
          is_enabled_global?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?:
            | Database["public"]["Enums"]["integration_test_status"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_integrations_global_config_integration_key_fkey"
            columns: ["integration_key"]
            isOneToOne: true
            referencedRelation: "hub_integrations_catalog"
            referencedColumns: ["integration_key"]
          },
        ]
      }
      kpi_metrics: {
        Row: {
          bu_id: string | null
          category: Database["public"]["Enums"]["kpi_category"]
          created_at: string
          deleted_at: string | null
          description: string | null
          direction: Database["public"]["Enums"]["kpi_direction"]
          frequency: Database["public"]["Enums"]["kpi_frequency"]
          id: string
          is_global: boolean
          name: string
          owner_user_id: string | null
          status: Database["public"]["Enums"]["kpi_status"]
          target_value: number | null
          team_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          bu_id?: string | null
          category: Database["public"]["Enums"]["kpi_category"]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["kpi_direction"]
          frequency?: Database["public"]["Enums"]["kpi_frequency"]
          id?: string
          is_global?: boolean
          name: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["kpi_status"]
          target_value?: number | null
          team_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          bu_id?: string | null
          category?: Database["public"]["Enums"]["kpi_category"]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["kpi_direction"]
          frequency?: Database["public"]["Enums"]["kpi_frequency"]
          id?: string
          is_global?: boolean
          name?: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["kpi_status"]
          target_value?: number | null
          team_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_metrics_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_metrics_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_values: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kpi_id: string
          notes: string | null
          reference_date: string
          source: Database["public"]["Enums"]["kpi_value_source"]
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kpi_id: string
          notes?: string | null
          reference_date: string
          source?: Database["public"]["Enums"]["kpi_value_source"]
          value: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kpi_id?: string
          notes?: string | null
          reference_date?: string
          source?: Database["public"]["Enums"]["kpi_value_source"]
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_values_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_metrics"
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
          dependencies: string[]
          description: string | null
          display_order: number
          health_status: Database["public"]["Enums"]["module_health"]
          icon: string | null
          id: string
          name: string
          owner_user_id: string | null
          route: string | null
          slug: string
          status: Database["public"]["Enums"]["module_status"]
          type: Database["public"]["Enums"]["module_type"]
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          dependencies?: string[]
          description?: string | null
          display_order?: number
          health_status?: Database["public"]["Enums"]["module_health"]
          icon?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          route?: string | null
          slug: string
          status?: Database["public"]["Enums"]["module_status"]
          type?: Database["public"]["Enums"]["module_type"]
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          dependencies?: string[]
          description?: string | null
          display_order?: number
          health_status?: Database["public"]["Enums"]["module_health"]
          icon?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          route?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["module_status"]
          type?: Database["public"]["Enums"]["module_type"]
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
      okr_audit_log: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      okr_checkins: {
        Row: {
          blockers: string | null
          comments: string | null
          confidence: Database["public"]["Enums"]["okr_confidence"]
          created_at: string
          current_value: number
          date: string
          id: string
          kr_id: string
          previous_value: number | null
          user_id: string
        }
        Insert: {
          blockers?: string | null
          comments?: string | null
          confidence?: Database["public"]["Enums"]["okr_confidence"]
          created_at?: string
          current_value: number
          date?: string
          id?: string
          kr_id: string
          previous_value?: number | null
          user_id: string
        }
        Update: {
          blockers?: string | null
          comments?: string | null
          confidence?: Database["public"]["Enums"]["okr_confidence"]
          created_at?: string
          current_value?: number
          date?: string
          id?: string
          kr_id?: string
          previous_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_checkins_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "okr_team_key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_dependencies: {
        Row: {
          created_at: string
          depends_on_kr_id: string | null
          depends_on_team_id: string | null
          description: string | null
          id: string
          kr_id: string
          status: Database["public"]["Enums"]["okr_dependency_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          depends_on_kr_id?: string | null
          depends_on_team_id?: string | null
          description?: string | null
          id?: string
          kr_id: string
          status?: Database["public"]["Enums"]["okr_dependency_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          depends_on_kr_id?: string | null
          depends_on_team_id?: string | null
          description?: string | null
          id?: string
          kr_id?: string
          status?: Database["public"]["Enums"]["okr_dependency_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_dependencies_depends_on_kr_id_fkey"
            columns: ["depends_on_kr_id"]
            isOneToOne: false
            referencedRelation: "okr_team_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_dependencies_depends_on_team_id_fkey"
            columns: ["depends_on_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_dependencies_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "okr_team_key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_notifications_log: {
        Row: {
          channel: Database["public"]["Enums"]["okr_channel"]
          error_message: string | null
          id: string
          payload: Json | null
          sent_at: string
          status: string
          target: string
          type: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["okr_channel"]
          error_message?: string | null
          id?: string
          payload?: Json | null
          sent_at?: string
          status?: string
          target: string
          type: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["okr_channel"]
          error_message?: string | null
          id?: string
          payload?: Json | null
          sent_at?: string
          status?: string
          target?: string
          type?: string
        }
        Relationships: []
      }
      okr_org_key_results: {
        Row: {
          baseline: number
          bu_id: string | null
          created_at: string
          current_value: number
          deleted_at: string | null
          direction: Database["public"]["Enums"]["okr_direction"]
          id: string
          metric_id: string | null
          org_objective_id: string
          owner_user_id: string | null
          status: Database["public"]["Enums"]["okr_rag_status"]
          target: number
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          baseline?: number
          bu_id?: string | null
          created_at?: string
          current_value?: number
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["okr_direction"]
          id?: string
          metric_id?: string | null
          org_objective_id: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["okr_rag_status"]
          target: number
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          baseline?: number
          bu_id?: string | null
          created_at?: string
          current_value?: number
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["okr_direction"]
          id?: string
          metric_id?: string | null
          org_objective_id?: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["okr_rag_status"]
          target?: number
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_org_key_results_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_org_key_results_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_org_key_results_org_objective_id_fkey"
            columns: ["org_objective_id"]
            isOneToOne: false
            referencedRelation: "okr_org_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_org_objectives: {
        Row: {
          bu_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          owner_user_id: string | null
          status: Database["public"]["Enums"]["okr_status"]
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          bu_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["okr_status"]
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          bu_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["okr_status"]
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "okr_org_objectives_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_reports_config: {
        Row: {
          audience: string[] | null
          channels: Database["public"]["Enums"]["okr_channel"]
          content_blocks: Json | null
          created_at: string
          created_by: string | null
          frequency: Database["public"]["Enums"]["okr_report_frequency"]
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          audience?: string[] | null
          channels?: Database["public"]["Enums"]["okr_channel"]
          content_blocks?: Json | null
          created_at?: string
          created_by?: string | null
          frequency?: Database["public"]["Enums"]["okr_report_frequency"]
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          audience?: string[] | null
          channels?: Database["public"]["Enums"]["okr_channel"]
          content_blocks?: Json | null
          created_at?: string
          created_by?: string | null
          frequency?: Database["public"]["Enums"]["okr_report_frequency"]
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      okr_team_key_results: {
        Row: {
          baseline: number
          bu_id: string | null
          co_responsibles: string[] | null
          created_at: string
          current_value: number
          deleted_at: string | null
          direction: Database["public"]["Enums"]["okr_direction"]
          evidence_url: string | null
          id: string
          linked_org_kr_id: string | null
          metric_id: string | null
          owner_user_id: string | null
          parent_kr_id: string | null
          status: Database["public"]["Enums"]["okr_rag_status"]
          target: number
          team_id: string
          team_objective_id: string | null
          title: string
          type: Database["public"]["Enums"]["okr_kr_type"]
          unit: string
          updated_at: string
        }
        Insert: {
          baseline?: number
          bu_id?: string | null
          co_responsibles?: string[] | null
          created_at?: string
          current_value?: number
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["okr_direction"]
          evidence_url?: string | null
          id?: string
          linked_org_kr_id?: string | null
          metric_id?: string | null
          owner_user_id?: string | null
          parent_kr_id?: string | null
          status?: Database["public"]["Enums"]["okr_rag_status"]
          target: number
          team_id: string
          team_objective_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["okr_kr_type"]
          unit?: string
          updated_at?: string
        }
        Update: {
          baseline?: number
          bu_id?: string | null
          co_responsibles?: string[] | null
          created_at?: string
          current_value?: number
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["okr_direction"]
          evidence_url?: string | null
          id?: string
          linked_org_kr_id?: string | null
          metric_id?: string | null
          owner_user_id?: string | null
          parent_kr_id?: string | null
          status?: Database["public"]["Enums"]["okr_rag_status"]
          target?: number
          team_id?: string
          team_objective_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["okr_kr_type"]
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_team_key_results_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_linked_org_kr_id_fkey"
            columns: ["linked_org_kr_id"]
            isOneToOne: false
            referencedRelation: "okr_org_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_parent_kr_id_fkey"
            columns: ["parent_kr_id"]
            isOneToOne: false
            referencedRelation: "okr_team_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_team_objective_id_fkey"
            columns: ["team_objective_id"]
            isOneToOne: false
            referencedRelation: "okr_team_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_team_objectives: {
        Row: {
          bu_id: string | null
          created_at: string
          cycle_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          org_objective_id: string
          owner_user_id: string | null
          status: Database["public"]["Enums"]["okr_status"]
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          bu_id?: string | null
          created_at?: string
          cycle_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          org_objective_id: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["okr_status"]
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          bu_id?: string | null
          created_at?: string
          cycle_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          org_objective_id?: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["okr_status"]
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_team_objectives_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_org_objective_id_fkey"
            columns: ["org_objective_id"]
            isOneToOne: false
            referencedRelation: "okr_org_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          bu_id: string | null
          city: string
          created_at: string
          deleted_at: string | null
          display_name: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          id: string
          instagram_id: string | null
          job_title: string
          last_name: string
          manager_user_id: string | null
          onboarding_completed: boolean
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
        }
        Insert: {
          birth_day?: number | null
          birth_month?: number | null
          bu_id?: string | null
          city: string
          created_at?: string
          deleted_at?: string | null
          display_name: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name: string
          id?: string
          instagram_id?: string | null
          job_title: string
          last_name: string
          manager_user_id?: string | null
          onboarding_completed?: boolean
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
        }
        Update: {
          birth_day?: number | null
          birth_month?: number | null
          bu_id?: string | null
          city?: string
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name?: string
          id?: string
          instagram_id?: string | null
          job_title?: string
          last_name?: string
          manager_user_id?: string | null
          onboarding_completed?: boolean
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
            foreignKeyName: "profiles_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
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
      squad_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["squad_role"]
          squad_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["squad_role"]
          squad_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["squad_role"]
          squad_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_memberships_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_teams: {
        Row: {
          created_at: string
          id: string
          squad_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          squad_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          squad_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_teams_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          bu_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          products: Database["public"]["Enums"]["squad_product"][]
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          products?: Database["public"]["Enums"]["squad_product"][]
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          products?: Database["public"]["Enums"]["squad_product"][]
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "squads_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          bu_id: string | null
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
          bu_id?: string | null
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
          bu_id?: string | null
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
            foreignKeyName: "teams_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
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
      user_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          slack_notifications: boolean
          theme: string
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          slack_notifications?: boolean
          theme?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          slack_notifications?: boolean
          theme?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
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
      user_team_memberships: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_kr_progress: {
        Args: {
          p_baseline: number
          p_current: number
          p_direction: Database["public"]["Enums"]["okr_direction"]
          p_target: number
        }
        Returns: number
      }
      count_bu_calls_today: { Args: { p_bu_id: string }; Returns: number }
      count_user_calls_today: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: number
      }
      get_bu_by_email_domain: { Args: { p_email: string }; Returns: string }
      get_enabled_modules_for_bu: {
        Args: { p_bu_id: string }
        Returns: {
          description: string
          display_order: number
          icon: string
          id: string
          is_enabled: boolean
          name: string
          route: string
          slug: string
          type: Database["public"]["Enums"]["module_type"]
        }[]
      }
      get_integration_config_for_bu: {
        Args: { p_bu_id: string; p_integration_key: string }
        Returns: Json
      }
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      get_user_bus: { Args: { p_user_id: string }; Returns: string[] }
      get_user_default_bu: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_ceo: { Args: { _user_id: string }; Returns: boolean }
      is_agent_enabled_for_bu: {
        Args: { p_agent_id: string; p_bu_id: string }
        Returns: boolean
      }
      is_bu_admin: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: boolean
      }
      is_email_domain_allowed: { Args: { p_email: string }; Returns: boolean }
      is_ia_enabled_for_bu: { Args: { p_bu_id: string }; Returns: boolean }
      is_module_enabled_for_bu: {
        Args: { p_bu_id: string; p_module_slug: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
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
      user_has_bu_access: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_output_format: "text" | "json"
      agent_scope: "global" | "bu"
      app_role: "super_admin" | "admin" | "team_leader" | "collaborator"
      bu_status: "active" | "inactive"
      employment_status: "active" | "vacation" | "terminated"
      integration_config_mode: "use_global" | "override"
      integration_test_status: "ok" | "error" | "pending"
      kpi_category:
        | "financeiro"
        | "growth"
        | "cs"
        | "produto"
        | "operacoes"
        | "pessoas"
      kpi_direction: "up" | "down"
      kpi_frequency: "daily" | "weekly" | "monthly" | "quarterly"
      kpi_status: "active" | "inactive"
      kpi_value_source: "manual" | "integration" | "calculation"
      module_health: "healthy" | "degraded" | "down"
      module_status: "active" | "inactive" | "coming_soon"
      module_type: "global" | "operational"
      okr_channel: "email" | "slack" | "both"
      okr_confidence: "high" | "medium" | "low"
      okr_dependency_status: "ok" | "blocked" | "at_risk"
      okr_direction: "up" | "down"
      okr_kr_type: "contribution" | "enabler" | "foundational"
      okr_rag_status: "green" | "yellow" | "red" | "not_started"
      okr_report_frequency: "weekly" | "monthly" | "quarterly" | "event"
      okr_status: "draft" | "active" | "completed" | "cancelled"
      squad_product: "crm" | "cms" | "erp"
      squad_role: "product_owner" | "tech_lead" | "ux_ui_lead" | "member"
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
      agent_output_format: ["text", "json"],
      agent_scope: ["global", "bu"],
      app_role: ["super_admin", "admin", "team_leader", "collaborator"],
      bu_status: ["active", "inactive"],
      employment_status: ["active", "vacation", "terminated"],
      integration_config_mode: ["use_global", "override"],
      integration_test_status: ["ok", "error", "pending"],
      kpi_category: [
        "financeiro",
        "growth",
        "cs",
        "produto",
        "operacoes",
        "pessoas",
      ],
      kpi_direction: ["up", "down"],
      kpi_frequency: ["daily", "weekly", "monthly", "quarterly"],
      kpi_status: ["active", "inactive"],
      kpi_value_source: ["manual", "integration", "calculation"],
      module_health: ["healthy", "degraded", "down"],
      module_status: ["active", "inactive", "coming_soon"],
      module_type: ["global", "operational"],
      okr_channel: ["email", "slack", "both"],
      okr_confidence: ["high", "medium", "low"],
      okr_dependency_status: ["ok", "blocked", "at_risk"],
      okr_direction: ["up", "down"],
      okr_kr_type: ["contribution", "enabler", "foundational"],
      okr_rag_status: ["green", "yellow", "red", "not_started"],
      okr_report_frequency: ["weekly", "monthly", "quarterly", "event"],
      okr_status: ["draft", "active", "completed", "cancelled"],
      squad_product: ["crm", "cms", "erp"],
      squad_role: ["product_owner", "tech_lead", "ux_ui_lead", "member"],
      team_status: ["active", "inactive"],
      work_mode: ["onsite", "hybrid", "remote"],
    },
  },
} as const
