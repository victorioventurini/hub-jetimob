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
          status:
            | Database["public"]["Enums"]["document_processing_status"]
            | null
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
          status?:
            | Database["public"]["Enums"]["document_processing_status"]
            | null
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
          status?:
            | Database["public"]["Enums"]["document_processing_status"]
            | null
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
          {
            foreignKeyName: "ai_agent_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "v_ai_agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ai_agent_documents_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ai_agent_documents_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ai_agent_documents_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_instruction_sources: {
        Row: {
          agent_id: string
          cached_content: string | null
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_enabled: boolean
          last_fetch_at: string | null
          last_fetch_error: string | null
          last_fetch_status: string | null
          name: string
          priority: number
          source_type: Database["public"]["Enums"]["instruction_source_type"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          cached_content?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_fetch_at?: string | null
          last_fetch_error?: string | null
          last_fetch_status?: string | null
          name: string
          priority?: number
          source_type: Database["public"]["Enums"]["instruction_source_type"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          cached_content?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_fetch_at?: string | null
          last_fetch_error?: string | null
          last_fetch_status?: string | null
          name?: string
          priority?: number
          source_type?: Database["public"]["Enums"]["instruction_source_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_instruction_sources_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_instruction_sources_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "v_ai_agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_instruction_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_instruction_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_instruction_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
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
          status: Database["public"]["Enums"]["ai_agent_log_status"]
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
          status: Database["public"]["Enums"]["ai_agent_log_status"]
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
          status?: Database["public"]["Enums"]["ai_agent_log_status"]
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
            foreignKeyName: "ai_agent_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "v_ai_agents_public"
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
          {
            foreignKeyName: "fk_ai_agents_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ai_agents_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ai_agents_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      app_error_logs: {
        Row: {
          action: string
          bu_id: string | null
          created_at: string
          error_code: string
          id: string
          message: string
          metadata: Json | null
          module: string
          stack: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          bu_id?: string | null
          created_at?: string
          error_code: string
          id?: string
          message: string
          metadata?: Json | null
          module: string
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          bu_id?: string | null
          created_at?: string
          error_code?: string
          id?: string
          message?: string
          metadata?: Json | null
          module?: string
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      areas: {
        Row: {
          bu_id: string
          co_leader_user_id: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          leader_user_id: string | null
          name: string
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        Insert: {
          bu_id: string
          co_leader_user_id?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          leader_user_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Update: {
          bu_id?: string
          co_leader_user_id?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          leader_user_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_co_leader_user_id_fkey"
            columns: ["co_leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_co_leader_user_id_fkey"
            columns: ["co_leader_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_co_leader_user_id_fkey"
            columns: ["co_leader_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          bu_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          status: Database["public"]["Enums"]["catalog_status"] | null
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["catalog_status"] | null
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["catalog_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_clavicularies: {
        Row: {
          bu_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["catalog_status"] | null
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["catalog_status"] | null
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["catalog_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_clavicularies_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_clavicularies_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "bu_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_gift_batches: {
        Row: {
          acquired_at: string | null
          batch_code: string | null
          bu_id: string
          campaign: string | null
          cost_center: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          gift_item_id: string
          id: string
          notes: string | null
          quantity_available: number
          quantity_in: number
          updated_at: string
        }
        Insert: {
          acquired_at?: string | null
          batch_code?: string | null
          bu_id: string
          campaign?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          gift_item_id: string
          id?: string
          notes?: string | null
          quantity_available?: number
          quantity_in?: number
          updated_at?: string
        }
        Update: {
          acquired_at?: string | null
          batch_code?: string | null
          bu_id?: string
          campaign?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          gift_item_id?: string
          id?: string
          notes?: string | null
          quantity_available?: number
          quantity_in?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_gift_batches_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_gift_batches_gift_item_id_fkey"
            columns: ["gift_item_id"]
            isOneToOne: false
            referencedRelation: "asset_gift_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_gift_batches_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_gift_batches_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_gift_batches_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_gift_items: {
        Row: {
          acquired_at: string | null
          acquisition_value: number | null
          bu_id: string
          category: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          home_location_id: string | null
          id: string
          name: string
          notes: string | null
          photos: string[] | null
          quantity_total: number | null
          status: Database["public"]["Enums"]["gift_item_status"]
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          acquired_at?: string | null
          acquisition_value?: number | null
          bu_id: string
          category?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          home_location_id?: string | null
          id?: string
          name: string
          notes?: string | null
          photos?: string[] | null
          quantity_total?: number | null
          status?: Database["public"]["Enums"]["gift_item_status"]
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          acquired_at?: string | null
          acquisition_value?: number | null
          bu_id?: string
          category?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          home_location_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          photos?: string[] | null
          quantity_total?: number | null
          status?: Database["public"]["Enums"]["gift_item_status"]
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_gift_items_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_gift_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_gift_items_home_location_id_fkey"
            columns: ["home_location_id"]
            isOneToOne: false
            referencedRelation: "bu_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_gift_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "external_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_gift_items_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_gift_items_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_gift_items_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_gift_movements: {
        Row: {
          batch_id: string | null
          bu_id: string
          created_at: string
          destination_description: string | null
          destination_type:
            | Database["public"]["Enums"]["gift_destination_type"]
            | null
          gift_item_id: string
          id: string
          movement_type: Database["public"]["Enums"]["gift_movement_type"]
          notes: string | null
          occurred_at: string
          performed_by_user_id: string
          quantity: number
        }
        Insert: {
          batch_id?: string | null
          bu_id: string
          created_at?: string
          destination_description?: string | null
          destination_type?:
            | Database["public"]["Enums"]["gift_destination_type"]
            | null
          gift_item_id: string
          id?: string
          movement_type: Database["public"]["Enums"]["gift_movement_type"]
          notes?: string | null
          occurred_at?: string
          performed_by_user_id: string
          quantity: number
        }
        Update: {
          batch_id?: string | null
          bu_id?: string
          created_at?: string
          destination_description?: string | null
          destination_type?:
            | Database["public"]["Enums"]["gift_destination_type"]
            | null
          gift_item_id?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["gift_movement_type"]
          notes?: string | null
          occurred_at?: string
          performed_by_user_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_gift_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "asset_gift_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_gift_movements_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_gift_movements_gift_item_id_fkey"
            columns: ["gift_item_id"]
            isOneToOne: false
            referencedRelation: "asset_gift_items"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_group_items: {
        Row: {
          asset_id: string
          bu_id: string
          created_at: string
          deleted_at: string | null
          group_id: string
          id: string
          is_required: boolean
          notes: string | null
          quantity: number
          role: Database["public"]["Enums"]["asset_group_item_role"]
          updated_at: string
        }
        Insert: {
          asset_id: string
          bu_id: string
          created_at?: string
          deleted_at?: string | null
          group_id: string
          id?: string
          is_required?: boolean
          notes?: string | null
          quantity?: number
          role?: Database["public"]["Enums"]["asset_group_item_role"]
          updated_at?: string
        }
        Update: {
          asset_id?: string
          bu_id?: string
          created_at?: string
          deleted_at?: string | null
          group_id?: string
          id?: string
          is_required?: boolean
          notes?: string | null
          quantity?: number
          role?: Database["public"]["Enums"]["asset_group_item_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_group_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_group_items_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "asset_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_groups: {
        Row: {
          bu_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          notes: string | null
          primary_asset_id: string | null
          status: Database["public"]["Enums"]["asset_group_status"]
          type: Database["public"]["Enums"]["asset_group_type"]
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          notes?: string | null
          primary_asset_id?: string | null
          status?: Database["public"]["Enums"]["asset_group_status"]
          type?: Database["public"]["Enums"]["asset_group_type"]
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          primary_asset_id?: string | null
          status?: Database["public"]["Enums"]["asset_group_status"]
          type?: Database["public"]["Enums"]["asset_group_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_groups_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_groups_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_groups_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_groups_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_groups_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_hooks: {
        Row: {
          claviculary_id: string
          created_at: string
          hook_number: number
          id: string
          notes: string | null
          occupied: boolean
        }
        Insert: {
          claviculary_id: string
          created_at?: string
          hook_number: number
          id?: string
          notes?: string | null
          occupied?: boolean
        }
        Update: {
          claviculary_id?: string
          created_at?: string
          hook_number?: number
          id?: string
          notes?: string | null
          occupied?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "asset_hooks_claviculary_id_fkey"
            columns: ["claviculary_id"]
            isOneToOne: false
            referencedRelation: "asset_clavicularies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_inventory: {
        Row: {
          acquired_at: string | null
          acquisition_value: number | null
          assigned_at: string | null
          brand: string | null
          bu_id: string
          category_id: string | null
          created_at: string
          created_by: string | null
          current_holder_type: Database["public"]["Enums"]["asset_holder_type"]
          current_location_id: string | null
          current_user_id: string | null
          deleted_at: string | null
          description: string | null
          documents: Json | null
          home_location_id: string | null
          id: string
          internal_code: string
          last_moved_at: string | null
          model: string | null
          name: string
          notes: string | null
          photos: Json | null
          quantity_available: number
          quantity_total: number
          recommendation_id: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_inventory_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acquired_at?: string | null
          acquisition_value?: number | null
          assigned_at?: string | null
          brand?: string | null
          bu_id: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          current_holder_type?: Database["public"]["Enums"]["asset_holder_type"]
          current_location_id?: string | null
          current_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          documents?: Json | null
          home_location_id?: string | null
          id?: string
          internal_code: string
          last_moved_at?: string | null
          model?: string | null
          name: string
          notes?: string | null
          photos?: Json | null
          quantity_available?: number
          quantity_total?: number
          recommendation_id?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_inventory_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acquired_at?: string | null
          acquisition_value?: number | null
          assigned_at?: string | null
          brand?: string | null
          bu_id?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          current_holder_type?: Database["public"]["Enums"]["asset_holder_type"]
          current_location_id?: string | null
          current_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          documents?: Json | null
          home_location_id?: string | null
          id?: string
          internal_code?: string
          last_moved_at?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          photos?: Json | null
          quantity_available?: number
          quantity_total?: number
          recommendation_id?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_inventory_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_inventory_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inventory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inventory_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "bu_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inventory_current_user_profile_fkey"
            columns: ["current_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inventory_current_user_profile_fkey"
            columns: ["current_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inventory_current_user_profile_fkey"
            columns: ["current_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inventory_home_location_id_fkey"
            columns: ["home_location_id"]
            isOneToOne: false
            referencedRelation: "bu_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inventory_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "asset_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_key_movements: {
        Row: {
          authorized_by_user_id: string | null
          bu_id: string
          created_at: string
          due_at: string | null
          from_claviculary_id: string | null
          from_hook_id: string | null
          id: string
          keyring_id: string
          movement_type: Database["public"]["Enums"]["key_movement_type"]
          notes: string | null
          occurred_at: string
          performed_by_user_id: string
          to_claviculary_id: string | null
          to_hook_id: string | null
          user_id: string | null
        }
        Insert: {
          authorized_by_user_id?: string | null
          bu_id: string
          created_at?: string
          due_at?: string | null
          from_claviculary_id?: string | null
          from_hook_id?: string | null
          id?: string
          keyring_id: string
          movement_type: Database["public"]["Enums"]["key_movement_type"]
          notes?: string | null
          occurred_at?: string
          performed_by_user_id: string
          to_claviculary_id?: string | null
          to_hook_id?: string | null
          user_id?: string | null
        }
        Update: {
          authorized_by_user_id?: string | null
          bu_id?: string
          created_at?: string
          due_at?: string | null
          from_claviculary_id?: string | null
          from_hook_id?: string | null
          id?: string
          keyring_id?: string
          movement_type?: Database["public"]["Enums"]["key_movement_type"]
          notes?: string | null
          occurred_at?: string
          performed_by_user_id?: string
          to_claviculary_id?: string | null
          to_hook_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_key_movements_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_key_movements_from_claviculary_id_fkey"
            columns: ["from_claviculary_id"]
            isOneToOne: false
            referencedRelation: "asset_clavicularies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_key_movements_from_hook_id_fkey"
            columns: ["from_hook_id"]
            isOneToOne: false
            referencedRelation: "asset_hooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_key_movements_keyring_id_fkey"
            columns: ["keyring_id"]
            isOneToOne: false
            referencedRelation: "asset_keyrings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_key_movements_to_claviculary_id_fkey"
            columns: ["to_claviculary_id"]
            isOneToOne: false
            referencedRelation: "asset_clavicularies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_key_movements_to_hook_id_fkey"
            columns: ["to_hook_id"]
            isOneToOne: false
            referencedRelation: "asset_hooks"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_keyrings: {
        Row: {
          bu_id: string
          claviculary_id: string | null
          created_at: string
          created_by: string | null
          current_user_id: string | null
          deleted_at: string | null
          hook_id: string | null
          id: string
          name: string
          notes: string | null
          photos: string[] | null
          status: Database["public"]["Enums"]["keyring_status"]
          tag_number: string
          updated_at: string
        }
        Insert: {
          bu_id: string
          claviculary_id?: string | null
          created_at?: string
          created_by?: string | null
          current_user_id?: string | null
          deleted_at?: string | null
          hook_id?: string | null
          id?: string
          name: string
          notes?: string | null
          photos?: string[] | null
          status?: Database["public"]["Enums"]["keyring_status"]
          tag_number: string
          updated_at?: string
        }
        Update: {
          bu_id?: string
          claviculary_id?: string | null
          created_at?: string
          created_by?: string | null
          current_user_id?: string | null
          deleted_at?: string | null
          hook_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          photos?: string[] | null
          status?: Database["public"]["Enums"]["keyring_status"]
          tag_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_keyrings_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_keyrings_claviculary_id_fkey"
            columns: ["claviculary_id"]
            isOneToOne: false
            referencedRelation: "asset_clavicularies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_keyrings_hook_id_fkey"
            columns: ["hook_id"]
            isOneToOne: false
            referencedRelation: "asset_hooks"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_keys: {
        Row: {
          access_type: Database["public"]["Enums"]["key_access_type"]
          bu_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          keyring_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["key_status"]
          tag_number: string
          updated_at: string
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["key_access_type"]
          bu_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          keyring_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["key_status"]
          tag_number: string
          updated_at?: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["key_access_type"]
          bu_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          keyring_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["key_status"]
          tag_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_keys_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_keys_keyring_id_fkey"
            columns: ["keyring_id"]
            isOneToOne: false
            referencedRelation: "asset_keyrings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_keys_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_keys_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_keys_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_movements: {
        Row: {
          asset_id: string
          authorized_by_user_id: string | null
          bu_id: string
          created_at: string
          due_at: string | null
          from_holder_type:
            | Database["public"]["Enums"]["asset_holder_type"]
            | null
          from_location_id: string | null
          from_user_id: string | null
          id: string
          movement_type: Database["public"]["Enums"]["asset_movement_type"]
          notes: string | null
          occurred_at: string
          performed_by_user_id: string
          returned_at: string | null
          to_holder_type:
            | Database["public"]["Enums"]["asset_holder_type"]
            | null
          to_location_id: string | null
          to_user_id: string | null
        }
        Insert: {
          asset_id: string
          authorized_by_user_id?: string | null
          bu_id: string
          created_at?: string
          due_at?: string | null
          from_holder_type?:
            | Database["public"]["Enums"]["asset_holder_type"]
            | null
          from_location_id?: string | null
          from_user_id?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["asset_movement_type"]
          notes?: string | null
          occurred_at?: string
          performed_by_user_id: string
          returned_at?: string | null
          to_holder_type?:
            | Database["public"]["Enums"]["asset_holder_type"]
            | null
          to_location_id?: string | null
          to_user_id?: string | null
        }
        Update: {
          asset_id?: string
          authorized_by_user_id?: string | null
          bu_id?: string
          created_at?: string
          due_at?: string | null
          from_holder_type?:
            | Database["public"]["Enums"]["asset_holder_type"]
            | null
          from_location_id?: string | null
          from_user_id?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["asset_movement_type"]
          notes?: string | null
          occurred_at?: string
          performed_by_user_id?: string
          returned_at?: string | null
          to_holder_type?:
            | Database["public"]["Enums"]["asset_holder_type"]
            | null
          to_location_id?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_movements_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_authorized_by_profile_fkey"
            columns: ["authorized_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_authorized_by_profile_fkey"
            columns: ["authorized_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_authorized_by_profile_fkey"
            columns: ["authorized_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "bu_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_from_user_profile_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_from_user_profile_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_from_user_profile_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_performed_by_profile_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_performed_by_profile_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_performed_by_profile_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "bu_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_to_user_profile_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_to_user_profile_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_to_user_profile_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_permissions: {
        Row: {
          bu_id: string
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["asset_permission_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["asset_permission_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["asset_permission_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_permissions_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_permissions_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_permissions_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asset_permissions_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_recommendations: {
        Row: {
          applicable_job_title_ids: string[]
          applicable_team_ids: string[]
          brand: string
          bu_id: string
          category_id: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          last_reviewed_at: string | null
          model: string | null
          name: string
          notes: string | null
          owner_user_id: string
          review_interval_months: number
          status: string
          updated_at: string
        }
        Insert: {
          applicable_job_title_ids?: string[]
          applicable_team_ids?: string[]
          brand: string
          bu_id: string
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          last_reviewed_at?: string | null
          model?: string | null
          name: string
          notes?: string | null
          owner_user_id: string
          review_interval_months?: number
          status?: string
          updated_at?: string
        }
        Update: {
          applicable_job_title_ids?: string[]
          applicable_team_ids?: string[]
          brand?: string
          bu_id?: string
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          last_reviewed_at?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          owner_user_id?: string
          review_interval_months?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_recommendations_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_recommendations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_recommendations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_recommendations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_recommendations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_recommendations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_recommendations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
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
      automation_action_catalog: {
        Row: {
          action_key: string
          action_version: string
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          payload_example: Json | null
          payload_schema: Json | null
          required_fields: string[] | null
          updated_at: string
        }
        Insert: {
          action_key: string
          action_version?: string
          category: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          name: string
          payload_example?: Json | null
          payload_schema?: Json | null
          required_fields?: string[] | null
          updated_at?: string
        }
        Update: {
          action_key?: string
          action_version?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          payload_example?: Json | null
          payload_schema?: Json | null
          required_fields?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      automation_connection_events: {
        Row: {
          connection_id: string
          created_at: string
          event_key: string
          id: string
          is_active: boolean
        }
        Insert: {
          connection_id: string
          created_at?: string
          event_key: string
          id?: string
          is_active?: boolean
        }
        Update: {
          connection_id?: string
          created_at?: string
          event_key?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "automation_connection_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "automation_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_connection_events_event_key_fkey"
            columns: ["event_key"]
            isOneToOne: false
            referencedRelation: "automation_event_catalog"
            referencedColumns: ["event_key"]
          },
        ]
      }
      automation_connections: {
        Row: {
          auth_config_encrypted: Json | null
          auth_type: string | null
          bu_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          headers_encrypted: Json | null
          http_method: string
          id: string
          is_active: boolean
          name: string
          retry_count: number
          scope: string
          timeout_ms: number
          updated_at: string
          webhook_url: string
        }
        Insert: {
          auth_config_encrypted?: Json | null
          auth_type?: string | null
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          headers_encrypted?: Json | null
          http_method?: string
          id?: string
          is_active?: boolean
          name: string
          retry_count?: number
          scope?: string
          timeout_ms?: number
          updated_at?: string
          webhook_url: string
        }
        Update: {
          auth_config_encrypted?: Json | null
          auth_type?: string | null
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          headers_encrypted?: Json | null
          http_method?: string
          id?: string
          is_active?: boolean
          name?: string
          retry_count?: number
          scope?: string
          timeout_ms?: number
          updated_at?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_connections_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_automation_connections_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_automation_connections_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_automation_connections_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_event_catalog: {
        Row: {
          category: string
          created_at: string
          description: string
          event_key: string
          event_version: string
          id: string
          is_active: boolean
          name: string
          payload_example: Json | null
          payload_schema: Json | null
          scope: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          event_key: string
          event_version?: string
          id?: string
          is_active?: boolean
          name: string
          payload_example?: Json | null
          payload_schema?: Json | null
          scope?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          event_key?: string
          event_version?: string
          id?: string
          is_active?: boolean
          name?: string
          payload_example?: Json | null
          payload_schema?: Json | null
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_incoming_tokens: {
        Row: {
          allowed_actions: string[] | null
          bu_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          rate_limit_per_minute: number
          scope: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          allowed_actions?: string[] | null
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          rate_limit_per_minute?: number
          scope?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          allowed_actions?: string[] | null
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          rate_limit_per_minute?: number
          scope?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_incoming_tokens_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_automation_incoming_tokens_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_automation_incoming_tokens_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_automation_incoming_tokens_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          action_key: string | null
          bu_id: string | null
          connection_id: string | null
          created_at: string
          error_message: string | null
          event_key: string | null
          id: string
          latency_ms: number | null
          request_payload: Json | null
          response_payload: Json | null
          retry_attempt: number | null
          status: string
          status_code: number | null
          token_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          action_key?: string | null
          bu_id?: string | null
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          event_key?: string | null
          id?: string
          latency_ms?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_attempt?: number | null
          status: string
          status_code?: number | null
          token_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          action_key?: string | null
          bu_id?: string | null
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          event_key?: string | null
          id?: string
          latency_ms?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_attempt?: number | null
          status?: string
          status_code?: number | null
          token_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "automation_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "automation_incoming_tokens"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "bu_agent_activations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "v_ai_agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_agent_activations_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_agent_activations_enabled_by"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_agent_activations_enabled_by"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_agent_activations_enabled_by"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
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
          {
            foreignKeyName: "fk_bu_integrations_config_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_integrations_config_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_integrations_config_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      bu_locations: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          bu_id: string
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          district: string | null
          formatted_address: string | null
          google_place_id: string | null
          id: string
          is_default: boolean
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          parent_location_id: string | null
          postal_code: string | null
          state: string | null
          status: Database["public"]["Enums"]["bu_location_status"]
          timezone: string | null
          type: Database["public"]["Enums"]["bu_location_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          bu_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          parent_location_id?: string | null
          postal_code?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["bu_location_status"]
          timezone?: string | null
          type?: Database["public"]["Enums"]["bu_location_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          bu_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          parent_location_id?: string | null
          postal_code?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["bu_location_status"]
          timezone?: string | null
          type?: Database["public"]["Enums"]["bu_location_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bu_locations_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "bu_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_locations_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_locations_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_locations_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_locations_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_locations_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_locations_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "fk_bu_module_configs_disabled_by"
            columns: ["disabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_module_configs_disabled_by"
            columns: ["disabled_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_module_configs_disabled_by"
            columns: ["disabled_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_module_configs_enabled_by"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_module_configs_enabled_by"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bu_module_configs_enabled_by"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      bu_notification_channels: {
        Row: {
          bu_id: string
          channel_slug: string
          config: Json | null
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          bu_id: string
          channel_slug: string
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          bu_id?: string
          channel_slug?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bu_notification_channels_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_notification_channels_channel_slug_fkey"
            columns: ["channel_slug"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["slug"]
          },
        ]
      }
      bu_notification_event_settings: {
        Row: {
          bu_id: string
          channel: string
          created_at: string
          event_slug: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          bu_id: string
          channel: string
          created_at?: string
          event_slug: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          bu_id?: string
          channel?: string
          created_at?: string
          event_slug?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bu_notification_event_settings_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
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
          deleted_at: string | null
          id: string
          is_default: boolean
          job_title_id: string | null
          profile_id: string | null
          role_in_bu: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bu_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          job_title_id?: string | null
          profile_id?: string | null
          role_in_bu?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bu_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          job_title_id?: string | null
          profile_id?: string | null
          role_in_bu?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bu_user_memberships_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      bu_user_permission_overrides: {
        Row: {
          bu_id: string
          created_at: string
          effect: Database["public"]["Enums"]["permission_effect"]
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          effect?: Database["public"]["Enums"]["permission_effect"]
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          effect?: Database["public"]["Enums"]["permission_effect"]
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bu_user_permission_overrides_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permission_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      bu_user_permission_templates_v2: {
        Row: {
          bu_id: string
          created_at: string
          created_by: string | null
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bu_user_permission_templates_v2_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_execution_logs: {
        Row: {
          correlation_id: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          health_alerts_created: number | null
          health_alerts_resolved: number | null
          id: string
          outbox_failed: number | null
          outbox_processed: number | null
          outbox_sent: number | null
          ran_at: string
          status: Database["public"]["Enums"]["cron_status"]
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          health_alerts_created?: number | null
          health_alerts_resolved?: number | null
          id?: string
          outbox_failed?: number | null
          outbox_processed?: number | null
          outbox_sent?: number | null
          ran_at?: string
          status: Database["public"]["Enums"]["cron_status"]
        }
        Update: {
          correlation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          health_alerts_created?: number | null
          health_alerts_resolved?: number | null
          id?: string
          outbox_failed?: number | null
          outbox_processed?: number | null
          outbox_sent?: number | null
          ran_at?: string
          status?: Database["public"]["Enums"]["cron_status"]
        }
        Relationships: []
      }
      cycles: {
        Row: {
          bu_id: string
          created_at: string
          end_date: string
          id: string
          name: string
          parent_cycle_id: string | null
          planning_date: string | null
          retro_date: string | null
          review_date: string | null
          start_date: string
          type: Database["public"]["Enums"]["cycle_type"]
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          end_date: string
          id?: string
          name: string
          parent_cycle_id?: string | null
          planning_date?: string | null
          retro_date?: string | null
          review_date?: string | null
          start_date: string
          type: Database["public"]["Enums"]["cycle_type"]
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          parent_cycle_id?: string | null
          planning_date?: string | null
          retro_date?: string | null
          review_date?: string | null
          start_date?: string
          type?: Database["public"]["Enums"]["cycle_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycles_parent_cycle_id_fkey"
            columns: ["parent_cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_companies: {
        Row: {
          allowed_domains: string[] | null
          bu_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document: string | null
          document_type: string | null
          id: string
          legal_name: string | null
          name: string
          notes: string | null
          person_type: string | null
          status: Database["public"]["Enums"]["partner_company_status"]
          updated_at: string
        }
        Insert: {
          allowed_domains?: string[] | null
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document?: string | null
          document_type?: string | null
          id?: string
          legal_name?: string | null
          name: string
          notes?: string | null
          person_type?: string | null
          status?: Database["public"]["Enums"]["partner_company_status"]
          updated_at?: string
        }
        Update: {
          allowed_domains?: string[] | null
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document?: string | null
          document_type?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          notes?: string | null
          person_type?: string | null
          status?: Database["public"]["Enums"]["partner_company_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_companies_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      external_company_bu_associations: {
        Row: {
          bu_id: string
          created_at: string
          created_by: string | null
          default_contact_ids: string[] | null
          deleted_at: string | null
          external_company_id: string
          id: string
          is_active: boolean
          notes: string | null
          role: string
          supervisor_contact_ids: string[] | null
          supervisor_profile_ids: string[] | null
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          created_by?: string | null
          default_contact_ids?: string[] | null
          deleted_at?: string | null
          external_company_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          role?: string
          supervisor_contact_ids?: string[] | null
          supervisor_profile_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          created_by?: string | null
          default_contact_ids?: string[] | null
          deleted_at?: string | null
          external_company_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          role?: string
          supervisor_contact_ids?: string[] | null
          supervisor_profile_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_company_bu_associations_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_company_bu_associations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_company_bu_associations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_company_bu_associations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_company_bu_associations_partner_company_id_fkey"
            columns: ["external_company_id"]
            isOneToOne: false
            referencedRelation: "external_companies"
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
          status: Database["public"]["Enums"]["catalog_status"]
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
          status?: Database["public"]["Enums"]["catalog_status"]
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
          status?: Database["public"]["Enums"]["catalog_status"]
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
      job_titles: {
        Row: {
          bu_ids: string[] | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          bu_ids?: string[] | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          bu_ids?: string[] | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_data_contributors: {
        Row: {
          bu_id: string
          contributor_user_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          kpi_id: string
          notes: string | null
          role: Database["public"]["Enums"]["kpi_contributor_role"]
        }
        Insert: {
          bu_id: string
          contributor_user_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kpi_id: string
          notes?: string | null
          role?: Database["public"]["Enums"]["kpi_contributor_role"]
        }
        Update: {
          bu_id?: string
          contributor_user_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kpi_id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["kpi_contributor_role"]
        }
        Relationships: [
          {
            foreignKeyName: "kpi_data_contributors_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_data_contributors_contributor_user_id_fkey"
            columns: ["contributor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_data_contributors_contributor_user_id_fkey"
            columns: ["contributor_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_data_contributors_contributor_user_id_fkey"
            columns: ["contributor_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_data_contributors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_data_contributors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_data_contributors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_data_contributors_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_metrics: {
        Row: {
          area_id: string | null
          bu_id: string | null
          category: Database["public"]["Enums"]["kpi_category"] | null
          created_at: string
          deleted_at: string | null
          description: string | null
          direction: Database["public"]["Enums"]["kpi_direction"]
          frequency: Database["public"]["Enums"]["kpi_frequency"]
          id: string
          indicator_type: Database["public"]["Enums"]["kpi_indicator_type"]
          is_global: boolean
          lifecycle_status: Database["public"]["Enums"]["kpi_lifecycle_status"]
          name: string
          owner_user_id: string | null
          recovery_protocol: string | null
          scope: Database["public"]["Enums"]["kpi_scope"]
          status: Database["public"]["Enums"]["kpi_status"]
          target_source: string | null
          target_value: number | null
          team_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          bu_id?: string | null
          category?: Database["public"]["Enums"]["kpi_category"] | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["kpi_direction"]
          frequency?: Database["public"]["Enums"]["kpi_frequency"]
          id?: string
          indicator_type?: Database["public"]["Enums"]["kpi_indicator_type"]
          is_global?: boolean
          lifecycle_status?: Database["public"]["Enums"]["kpi_lifecycle_status"]
          name: string
          owner_user_id?: string | null
          recovery_protocol?: string | null
          scope?: Database["public"]["Enums"]["kpi_scope"]
          status?: Database["public"]["Enums"]["kpi_status"]
          target_source?: string | null
          target_value?: number | null
          team_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          bu_id?: string | null
          category?: Database["public"]["Enums"]["kpi_category"] | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["kpi_direction"]
          frequency?: Database["public"]["Enums"]["kpi_frequency"]
          id?: string
          indicator_type?: Database["public"]["Enums"]["kpi_indicator_type"]
          is_global?: boolean
          lifecycle_status?: Database["public"]["Enums"]["kpi_lifecycle_status"]
          name?: string
          owner_user_id?: string | null
          recovery_protocol?: string | null
          scope?: Database["public"]["Enums"]["kpi_scope"]
          status?: Database["public"]["Enums"]["kpi_status"]
          target_source?: string | null
          target_value?: number | null
          team_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_metrics_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "kpi_metrics_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_metrics_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_target_history: {
        Row: {
          bu_id: string | null
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          kpi_id: string
          new_target_source: string | null
          new_target_value: number | null
          old_target_source: string | null
          old_target_value: number | null
        }
        Insert: {
          bu_id?: string | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          kpi_id: string
          new_target_source?: string | null
          new_target_value?: number | null
          old_target_source?: string | null
          old_target_value?: number | null
        }
        Update: {
          bu_id?: string | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          kpi_id?: string
          new_target_source?: string | null
          new_target_value?: number | null
          old_target_source?: string | null
          old_target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_target_history_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_target_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_target_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_target_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_target_history_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_values: {
        Row: {
          confidence: Database["public"]["Enums"]["kpi_confidence_level"]
          created_at: string
          created_by: string | null
          id: string
          kpi_id: string
          notes: string | null
          period_end: string | null
          period_label: string | null
          period_start: string | null
          rag_status: Database["public"]["Enums"]["kpi_rag_status"] | null
          reference_date: string
          source: Database["public"]["Enums"]["kpi_value_source"]
          value: number
        }
        Insert: {
          confidence?: Database["public"]["Enums"]["kpi_confidence_level"]
          created_at?: string
          created_by?: string | null
          id?: string
          kpi_id: string
          notes?: string | null
          period_end?: string | null
          period_label?: string | null
          period_start?: string | null
          rag_status?: Database["public"]["Enums"]["kpi_rag_status"] | null
          reference_date: string
          source?: Database["public"]["Enums"]["kpi_value_source"]
          value: number
        }
        Update: {
          confidence?: Database["public"]["Enums"]["kpi_confidence_level"]
          created_at?: string
          created_by?: string | null
          id?: string
          kpi_id?: string
          notes?: string | null
          period_end?: string | null
          period_label?: string | null
          period_start?: string | null
          rag_status?: Database["public"]["Enums"]["kpi_rag_status"] | null
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
            foreignKeyName: "kpi_values_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
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
      mentions: {
        Row: {
          bu_id: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          mentioned_contact_id: string | null
          mentioned_user_id: string | null
        }
        Insert: {
          bu_id: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          mentioned_contact_id?: string | null
          mentioned_user_id?: string | null
        }
        Update: {
          bu_id?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          mentioned_contact_id?: string | null
          mentioned_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_contact_id_fkey"
            columns: ["mentioned_contact_id"]
            isOneToOne: false
            referencedRelation: "partner_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
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
          {
            foreignKeyName: "modules_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          config_schema: Json | null
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          requires_configuration: boolean
          slug: string
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
        }
        Insert: {
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          requires_configuration?: boolean
          slug: string
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Update: {
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          requires_configuration?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          error_message: string | null
          id: string
          notification_id: string
          retry_count: number
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id: string
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          audience: Database["public"]["Enums"]["notification_audience"]
          created_at: string
          default_channels: string[]
          description: string | null
          icon: string | null
          id: string
          is_mandatory: boolean
          module: string
          name: string
          severity: Database["public"]["Enums"]["notification_severity"]
          slug: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          created_at?: string
          default_channels?: string[]
          description?: string | null
          icon?: string | null
          id?: string
          is_mandatory?: boolean
          module: string
          name: string
          severity?: Database["public"]["Enums"]["notification_severity"]
          slug: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          created_at?: string
          default_channels?: string[]
          description?: string | null
          icon?: string | null
          id?: string
          is_mandatory?: boolean
          module?: string
          name?: string
          severity?: Database["public"]["Enums"]["notification_severity"]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_health_alert_actions: {
        Row: {
          action: string
          actor_profile_id: string | null
          alert_id: string
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          alert_id: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          alert_id?: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_health_alert_actions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_health_alert_actions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_health_alert_actions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_health_alert_actions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "notification_health_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_health_alerts: {
        Row: {
          alert_type: string
          bu_id: string
          consecutive_occurrences: number
          cooldown_minutes: number
          created_at: string
          detected_at: string
          escalation_level: string
          id: string
          is_active: boolean
          last_notified_at: string | null
          metadata: Json
          resolved_at: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          bu_id: string
          consecutive_occurrences?: number
          cooldown_minutes?: number
          created_at?: string
          detected_at?: string
          escalation_level?: string
          id?: string
          is_active?: boolean
          last_notified_at?: string | null
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          bu_id?: string
          consecutive_occurrences?: number
          cooldown_minutes?: number
          created_at?: string
          detected_at?: string
          escalation_level?: string
          id?: string
          is_active?: boolean
          last_notified_at?: string | null
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_health_alerts_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_health_runbooks: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          markdown_content: string
          severity: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          markdown_content: string
          severity?: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          markdown_content?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_outbox: {
        Row: {
          bu_id: string
          channel_slug: string
          created_at: string
          dedupe_key: string | null
          event_slug: string
          id: string
          last_error: string | null
          max_retries: number
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          provider: string | null
          retries: number
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_outbox_status"]
          user_id: string
        }
        Insert: {
          bu_id: string
          channel_slug: string
          created_at?: string
          dedupe_key?: string | null
          event_slug: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string | null
          retries?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_outbox_status"]
          user_id: string
        }
        Update: {
          bu_id?: string
          channel_slug?: string
          created_at?: string
          dedupe_key?: string | null
          event_slug?: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string | null
          retries?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_outbox_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_channel_slug_fkey"
            columns: ["channel_slug"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "notification_outbox_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["slug"]
          },
        ]
      }
      notification_template_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          created_at: string
          id: string
          template_id: string
          version_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          template_id: string
          version_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          template_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_template_audit_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_template_audit_log_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "notification_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_template_variables: {
        Row: {
          created_at: string
          description: string | null
          event_slug: string
          example_value: string | null
          id: string
          is_required: boolean
          variable_key: string
          variable_label: string
          variable_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_slug: string
          example_value?: string | null
          id?: string
          is_required?: boolean
          variable_key: string
          variable_label: string
          variable_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_slug?: string
          example_value?: string | null
          id?: string
          is_required?: boolean
          variable_key?: string
          variable_label?: string
          variable_type?: string
        }
        Relationships: []
      }
      notification_template_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_approved: boolean
          subject: string | null
          template_id: string
          variables_used: string[]
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_approved?: boolean
          subject?: string | null
          template_id: string
          variables_used?: string[]
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_approved?: boolean
          subject?: string | null
          template_id?: string
          variables_used?: string[]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          bu_id: string | null
          channel: string
          created_at: string
          current_version_id: string | null
          event_slug: string
          id: string
          is_active: boolean
          subject_template: string | null
          updated_at: string
          version: number
        }
        Insert: {
          body_template: string
          bu_id?: string | null
          channel: string
          created_at?: string
          current_version_id?: string | null
          event_slug: string
          id?: string
          is_active?: boolean
          subject_template?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          body_template?: string
          bu_id?: string | null
          channel?: string
          created_at?: string
          current_version_id?: string | null
          event_slug?: string
          id?: string
          is_active?: boolean
          subject_template?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          bu_id: string | null
          context_id: string | null
          context_type: string | null
          context_url: string | null
          created_at: string
          event_slug: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          bu_id?: string | null
          context_id?: string | null
          context_type?: string | null
          context_url?: string | null
          created_at?: string
          event_slug?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          bu_id?: string | null
          context_id?: string | null
          context_type?: string | null
          context_url?: string | null
          created_at?: string
          event_slug?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
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
      okr_cancellation_reasons: {
        Row: {
          applies_to: string[] | null
          code: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
        }
        Insert: {
          applies_to?: string[] | null
          code: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
        }
        Update: {
          applies_to?: string[] | null
          code?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
        }
        Relationships: []
      }
      okr_checkins: {
        Row: {
          blockers: string | null
          bu_id: string
          comments: string | null
          confidence: Database["public"]["Enums"]["okr_confidence"]
          created_at: string
          current_value: number
          date: string
          id: string
          kr_id: string
          previous_value: number | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blockers?: string | null
          bu_id: string
          comments?: string | null
          confidence?: Database["public"]["Enums"]["okr_confidence"]
          created_at?: string
          current_value: number
          date?: string
          id?: string
          kr_id: string
          previous_value?: number | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blockers?: string | null
          bu_id?: string
          comments?: string | null
          confidence?: Database["public"]["Enums"]["okr_confidence"]
          created_at?: string
          current_value?: number
          date?: string
          id?: string
          kr_id?: string
          previous_value?: number | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_checkins_author_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_checkins_author_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_checkins_author_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_checkins_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_checkins_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "okr_team_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_checkins_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "v_pending_checkins"
            referencedColumns: ["kr_id"]
          },
          {
            foreignKeyName: "okr_checkins_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_checkins_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_coaching_events: {
        Row: {
          agent_slug: string | null
          bu_id: string
          context_id: string | null
          context_type: string
          created_at: string | null
          deleted_at: string | null
          event_type: string
          id: string
          insight_id: string | null
          payload: Json | null
          user_id: string
        }
        Insert: {
          agent_slug?: string | null
          bu_id: string
          context_id?: string | null
          context_type: string
          created_at?: string | null
          deleted_at?: string | null
          event_type: string
          id?: string
          insight_id?: string | null
          payload?: Json | null
          user_id: string
        }
        Update: {
          agent_slug?: string | null
          bu_id?: string
          context_id?: string | null
          context_type?: string
          created_at?: string | null
          deleted_at?: string | null
          event_type?: string
          id?: string
          insight_id?: string | null
          payload?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_coaching_events_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_coaching_events_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "okr_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_coaching_events_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "v_okr_insights_active"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_contributions: {
        Row: {
          bu_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          from_id: string
          from_type: Database["public"]["Enums"]["okr_contribution_entity_type"]
          id: string
          to_id: string
          to_type: Database["public"]["Enums"]["okr_contribution_entity_type"]
        }
        Insert: {
          bu_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          from_id: string
          from_type: Database["public"]["Enums"]["okr_contribution_entity_type"]
          id?: string
          to_id: string
          to_type: Database["public"]["Enums"]["okr_contribution_entity_type"]
        }
        Update: {
          bu_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          from_id?: string
          from_type?: Database["public"]["Enums"]["okr_contribution_entity_type"]
          id?: string
          to_id?: string
          to_type?: Database["public"]["Enums"]["okr_contribution_entity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "okr_contributions_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
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
            foreignKeyName: "okr_dependencies_depends_on_kr_id_fkey"
            columns: ["depends_on_kr_id"]
            isOneToOne: false
            referencedRelation: "v_pending_checkins"
            referencedColumns: ["kr_id"]
          },
          {
            foreignKeyName: "okr_dependencies_depends_on_team_id_fkey"
            columns: ["depends_on_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_dependencies_depends_on_team_id_fkey"
            columns: ["depends_on_team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_dependencies_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "okr_team_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_dependencies_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "v_pending_checkins"
            referencedColumns: ["kr_id"]
          },
        ]
      }
      okr_initiatives: {
        Row: {
          bu_id: string
          contributors: string[] | null
          created_at: string
          deleted_at: string | null
          description: string | null
          expected_end_date: string | null
          id: string
          kr_id: string
          name: string
          notes: string | null
          owner_user_id: string
          priority: Database["public"]["Enums"]["initiative_priority"] | null
          progress: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["initiative_status"]
          updated_at: string
        }
        Insert: {
          bu_id: string
          contributors?: string[] | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expected_end_date?: string | null
          id?: string
          kr_id: string
          name: string
          notes?: string | null
          owner_user_id: string
          priority?: Database["public"]["Enums"]["initiative_priority"] | null
          progress?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          updated_at?: string
        }
        Update: {
          bu_id?: string
          contributors?: string[] | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expected_end_date?: string | null
          id?: string
          kr_id?: string
          name?: string
          notes?: string | null
          owner_user_id?: string
          priority?: Database["public"]["Enums"]["initiative_priority"] | null
          progress?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_initiatives_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_initiatives_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "okr_team_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_initiatives_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "v_pending_checkins"
            referencedColumns: ["kr_id"]
          },
          {
            foreignKeyName: "okr_initiatives_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_initiatives_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_initiatives_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_insights: {
        Row: {
          bu_id: string
          code: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          message: string
          scope_id: string
          scope_type: string
          severity: string
          source: string
          suggested_actions: Json | null
          title: string
        }
        Insert: {
          bu_id: string
          code: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          message: string
          scope_id: string
          scope_type: string
          severity: string
          source: string
          suggested_actions?: Json | null
          title: string
        }
        Update: {
          bu_id?: string
          code?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          message?: string
          scope_id?: string
          scope_type?: string
          severity?: string
          source?: string
          suggested_actions?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_insights_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_kr_metrics: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          kpi_id: string
          kr_id: string
          kr_type: string
          role: Database["public"]["Enums"]["okr_metric_role"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kpi_id: string
          kr_id: string
          kr_type: string
          role?: Database["public"]["Enums"]["okr_metric_role"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kpi_id?: string
          kr_id?: string
          kr_type?: string
          role?: Database["public"]["Enums"]["okr_metric_role"]
        }
        Relationships: [
          {
            foreignKeyName: "okr_kr_metrics_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_metrics"
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
      okr_objective_reviews: {
        Row: {
          bu_id: string | null
          changes_summary: string | null
          created_at: string
          id: string
          notes: string | null
          objective_id: string
          objective_type: string
          review_type: string
          reviewed_at: string
          reviewed_by: string | null
        }
        Insert: {
          bu_id?: string | null
          changes_summary?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          objective_id: string
          objective_type: string
          review_type: string
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Update: {
          bu_id?: string | null
          changes_summary?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          objective_id?: string
          objective_type?: string
          review_type?: string
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_objective_reviews_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_org_key_results: {
        Row: {
          baseline: number
          bu_id: string
          cancellation_learning: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
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
          bu_id: string
          cancellation_learning?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
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
          bu_id?: string
          cancellation_learning?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
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
            foreignKeyName: "okr_org_key_results_org_objective_id_fkey"
            columns: ["org_objective_id"]
            isOneToOne: false
            referencedRelation: "okr_org_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_org_key_results_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_org_key_results_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_org_key_results_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_org_objectives: {
        Row: {
          bu_id: string
          cancellation_learning: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          cycle_id: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          health_score: number | null
          health_status: string | null
          id: string
          last_health_calculated_at: string | null
          owner_user_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["okr_status"]
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          bu_id: string
          cancellation_learning?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          cycle_id?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          last_health_calculated_at?: string | null
          owner_user_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["okr_status"]
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          bu_id?: string
          cancellation_learning?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          cycle_id?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          last_health_calculated_at?: string | null
          owner_user_id?: string | null
          start_date?: string | null
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
          {
            foreignKeyName: "okr_org_objectives_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_org_objectives_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_org_objectives_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_org_objectives_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
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
          bu_id: string
          cancellation_learning: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          co_responsibles: string[] | null
          created_at: string
          current_value: number
          deleted_at: string | null
          direction: Database["public"]["Enums"]["okr_direction"]
          evidence_url: string | null
          id: string
          last_checkin_at: string | null
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
          bu_id: string
          cancellation_learning?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          co_responsibles?: string[] | null
          created_at?: string
          current_value?: number
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["okr_direction"]
          evidence_url?: string | null
          id?: string
          last_checkin_at?: string | null
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
          bu_id?: string
          cancellation_learning?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          co_responsibles?: string[] | null
          created_at?: string
          current_value?: number
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["okr_direction"]
          evidence_url?: string | null
          id?: string
          last_checkin_at?: string | null
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
            foreignKeyName: "okr_team_key_results_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
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
            foreignKeyName: "okr_team_key_results_parent_kr_id_fkey"
            columns: ["parent_kr_id"]
            isOneToOne: false
            referencedRelation: "v_pending_checkins"
            referencedColumns: ["kr_id"]
          },
          {
            foreignKeyName: "okr_team_key_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_team_objective_id_fkey"
            columns: ["team_objective_id"]
            isOneToOne: false
            referencedRelation: "okr_team_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_team_objective_id_fkey"
            columns: ["team_objective_id"]
            isOneToOne: false
            referencedRelation: "v_pending_checkins"
            referencedColumns: ["objective_id"]
          },
          {
            foreignKeyName: "okr_team_key_results_team_objective_id_fkey"
            columns: ["team_objective_id"]
            isOneToOne: false
            referencedRelation: "v_shared_okrs_summary"
            referencedColumns: ["objective_id"]
          },
          {
            foreignKeyName: "okr_team_key_results_team_objective_id_fkey"
            columns: ["team_objective_id"]
            isOneToOne: false
            referencedRelation: "v_team_contributed_okrs"
            referencedColumns: ["objective_id"]
          },
        ]
      }
      okr_team_objective_contributors: {
        Row: {
          created_at: string
          id: string
          objective_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          objective_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          objective_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_team_objective_contributors_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "okr_team_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objective_contributors_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "v_pending_checkins"
            referencedColumns: ["objective_id"]
          },
          {
            foreignKeyName: "okr_team_objective_contributors_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "v_shared_okrs_summary"
            referencedColumns: ["objective_id"]
          },
          {
            foreignKeyName: "okr_team_objective_contributors_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "v_team_contributed_okrs"
            referencedColumns: ["objective_id"]
          },
          {
            foreignKeyName: "okr_team_objective_contributors_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objective_contributors_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_team_objectives: {
        Row: {
          avg_progress: number | null
          bu_id: string
          cancellation_learning: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          cycle_id: string | null
          cycle_type: string | null
          deleted_at: string | null
          description: string | null
          health_score: number | null
          health_status: string | null
          id: string
          is_shared: boolean
          kr_count: number | null
          last_health_calculated_at: string | null
          last_reviewed_at: string | null
          next_review_due: string | null
          org_objective_id: string
          owner_user_id: string | null
          responsibility_model: string | null
          review_notes: string | null
          status: Database["public"]["Enums"]["okr_status"]
          team_id: string
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          avg_progress?: number | null
          bu_id: string
          cancellation_learning?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          cycle_id?: string | null
          cycle_type?: string | null
          deleted_at?: string | null
          description?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          is_shared?: boolean
          kr_count?: number | null
          last_health_calculated_at?: string | null
          last_reviewed_at?: string | null
          next_review_due?: string | null
          org_objective_id: string
          owner_user_id?: string | null
          responsibility_model?: string | null
          review_notes?: string | null
          status?: Database["public"]["Enums"]["okr_status"]
          team_id: string
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          avg_progress?: number | null
          bu_id?: string
          cancellation_learning?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          cycle_id?: string | null
          cycle_type?: string | null
          deleted_at?: string | null
          description?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          is_shared?: boolean
          kr_count?: number | null
          last_health_calculated_at?: string | null
          last_reviewed_at?: string | null
          next_review_due?: string | null
          org_objective_id?: string
          owner_user_id?: string | null
          responsibility_model?: string | null
          review_notes?: string | null
          status?: Database["public"]["Enums"]["okr_status"]
          team_id?: string
          title?: string
          updated_at?: string
          year?: number | null
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
            foreignKeyName: "okr_team_objectives_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_wizard_kr_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          kr_id: string
          notes: string | null
          session_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          kr_id: string
          notes?: string | null
          session_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          kr_id?: string
          notes?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_wizard_kr_actions_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "okr_team_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_wizard_kr_actions_kr_id_fkey"
            columns: ["kr_id"]
            isOneToOne: false
            referencedRelation: "v_pending_checkins"
            referencedColumns: ["kr_id"]
          },
          {
            foreignKeyName: "okr_wizard_kr_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "okr_wizard_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_wizard_sessions: {
        Row: {
          action_items: Json | null
          ai_insights_shown: Json | null
          bu_id: string
          completed_at: string | null
          created_at: string
          cycle_id: string | null
          decisions: Json | null
          id: string
          meeting_notes: string | null
          reflection_data: Json | null
          started_at: string
          started_by: string
          status: Database["public"]["Enums"]["wizard_session_status"] | null
          summary_sent_at: string | null
          team_id: string | null
          updated_at: string
          wizard_type: string
        }
        Insert: {
          action_items?: Json | null
          ai_insights_shown?: Json | null
          bu_id: string
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          decisions?: Json | null
          id?: string
          meeting_notes?: string | null
          reflection_data?: Json | null
          started_at?: string
          started_by: string
          status?: Database["public"]["Enums"]["wizard_session_status"] | null
          summary_sent_at?: string | null
          team_id?: string | null
          updated_at?: string
          wizard_type: string
        }
        Update: {
          action_items?: Json | null
          ai_insights_shown?: Json | null
          bu_id?: string
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          decisions?: Json | null
          id?: string
          meeting_notes?: string | null
          reflection_data?: Json | null
          started_at?: string
          started_by?: string
          status?: Database["public"]["Enums"]["wizard_session_status"] | null
          summary_sent_at?: string | null
          team_id?: string | null
          updated_at?: string
          wizard_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_wizard_sessions_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_wizard_sessions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_wizard_sessions_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_wizard_sessions_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_wizard_sessions_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_wizard_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_wizard_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_contact_bu_associations: {
        Row: {
          bu_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          partner_contact_id: string
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          partner_contact_id: string
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          partner_contact_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_partner_contact_bu_assoc_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_partner_contact_bu_assoc_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_partner_contact_bu_assoc_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contact_bu_associations_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contact_bu_associations_partner_contact_id_fkey"
            columns: ["partner_contact_id"]
            isOneToOne: false
            referencedRelation: "partner_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_contact_capabilities: {
        Row: {
          bu_id: string
          category_id: string
          contact_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          external_company_id: string
          id: string
          is_active: boolean
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          bu_id: string
          category_id: string
          contact_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          external_company_id: string
          id?: string
          is_active?: boolean
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          bu_id?: string
          category_id?: string
          contact_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          external_company_id?: string
          id?: string
          is_active?: boolean
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_contact_capabilities_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contact_capabilities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contact_capabilities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "partner_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contact_capabilities_partner_company_id_fkey"
            columns: ["external_company_id"]
            isOneToOne: false
            referencedRelation: "external_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contact_capabilities_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "ticket_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_contacts: {
        Row: {
          bu_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string
          external_company_id: string
          id: string
          name: string
          phone: string | null
          profile_user_id: string | null
          status: Database["public"]["Enums"]["partner_contact_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email: string
          external_company_id: string
          id?: string
          name: string
          phone?: string | null
          profile_user_id?: string | null
          status?: Database["public"]["Enums"]["partner_contact_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bu_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string
          external_company_id?: string
          id?: string
          name?: string
          phone?: string | null
          profile_user_id?: string | null
          status?: Database["public"]["Enums"]["partner_contact_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_contacts_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contacts_partner_company_id_fkey"
            columns: ["external_company_id"]
            isOneToOne: false
            referencedRelation: "external_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_service_mappings: {
        Row: {
          bu_id: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          external_company_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["partner_service_status"]
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          bu_id?: string | null
          category_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          external_company_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["partner_service_status"]
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          bu_id?: string | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          external_company_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["partner_service_status"]
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_service_mappings_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_service_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_service_mappings_partner_company_id_fkey"
            columns: ["external_company_id"]
            isOneToOne: false
            referencedRelation: "external_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_service_mappings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "ticket_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_metrics_snapshots: {
        Row: {
          collected_at: string
          created_by: string
          id: string
          metrics: Json
          summary: Json
        }
        Insert: {
          collected_at?: string
          created_by?: string
          id?: string
          metrics: Json
          summary: Json
        }
        Update: {
          collected_at?: string
          created_by?: string
          id?: string
          metrics?: Json
          summary?: Json
        }
        Relationships: []
      }
      permission_audit_log: {
        Row: {
          action: string
          actor_id: string
          after_state: Json | null
          before_state: Json | null
          bu_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          reason: string
          target_user_id: string
        }
        Insert: {
          action: string
          actor_id: string
          after_state?: Json | null
          before_state?: Json | null
          bu_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          reason: string
          target_user_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          after_state?: Json | null
          before_state?: Json | null
          bu_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          reason?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_log_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_catalog: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          key: string
          module: string
          resource: string
          scope: Database["public"]["Enums"]["permission_scope"]
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          module: string
          resource: string
          scope: Database["public"]["Enums"]["permission_scope"]
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          module?: string
          resource?: string
          scope?: Database["public"]["Enums"]["permission_scope"]
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Relationships: []
      }
      permission_migrations: {
        Row: {
          bu_id: string
          created_at: string | null
          id: string
          migrated_at: string | null
          migrated_by: string | null
          notes: string | null
          status: Database["public"]["Enums"]["permission_migration_status"]
          updated_at: string | null
          user_id: string
          v1_groups_snapshot: Json | null
          v2_templates_applied: Json | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          bu_id: string
          created_at?: string | null
          id?: string
          migrated_at?: string | null
          migrated_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["permission_migration_status"]
          updated_at?: string | null
          user_id: string
          v1_groups_snapshot?: Json | null
          v2_templates_applied?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          bu_id?: string
          created_at?: string | null
          id?: string
          migrated_at?: string | null
          migrated_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["permission_migration_status"]
          updated_at?: string | null
          user_id?: string
          v1_groups_snapshot?: Json | null
          v2_templates_applied?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_migrations_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_migrations_migrated_by_fkey"
            columns: ["migrated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_migrations_migrated_by_fkey"
            columns: ["migrated_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_migrations_migrated_by_fkey"
            columns: ["migrated_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_migrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_migrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_migrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_migrations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_migrations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_migrations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_presets: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          module: string | null
          name: string
          slug: string
          sort_order: number | null
          surface: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          module?: string | null
          name: string
          slug: string
          sort_order?: number | null
          surface?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          module?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
          surface?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      permission_template_items_v2: {
        Row: {
          created_at: string
          permission_key: string
          template_id: string
        }
        Insert: {
          created_at?: string
          permission_key: string
          template_id: string
        }
        Update: {
          created_at?: string
          permission_key?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_template_items_v2_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_templates_v2: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          module: string | null
          name: string
          slug: string
          surface: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          module?: string | null
          name: string
          slug: string
          surface?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          module?: string | null
          name?: string
          slug?: string
          surface?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          bu_id: string | null
          city: string
          created_at: string
          deleted_at: string | null
          discord_id: string | null
          display_name: string
          email: string | null
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          global_status: string | null
          id: string
          instagram_id: string | null
          job_title_id: string | null
          last_name: string
          manager_user_id: string | null
          onboarding_completed: boolean
          photo_url: string | null
          start_date: string
          state: string
          team_id: string | null
          updated_at: string
          user_id: string | null
          user_type: string | null
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
          discord_id?: string | null
          display_name: string
          email?: string | null
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name: string
          global_status?: string | null
          id?: string
          instagram_id?: string | null
          job_title_id?: string | null
          last_name: string
          manager_user_id?: string | null
          onboarding_completed?: boolean
          photo_url?: string | null
          start_date: string
          state: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: string | null
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
          discord_id?: string | null
          display_name?: string
          email?: string | null
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name?: string
          global_status?: string | null
          id?: string
          instagram_id?: string | null
          job_title_id?: string | null
          last_name?: string
          manager_user_id?: string | null
          onboarding_completed?: boolean
          photo_url?: string | null
          start_date?: string
          state?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: string | null
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
            foreignKeyName: "fk_profiles_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
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
            foreignKeyName: "profiles_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_memberships: {
        Row: {
          bu_id: string
          created_at: string
          deleted_at: string | null
          id: string
          role: Database["public"]["Enums"]["squad_role"]
          squad_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["squad_role"]
          squad_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["squad_role"]
          squad_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_memberships_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "squad_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
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
          {
            foreignKeyName: "squad_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
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
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      teams: {
        Row: {
          area_id: string | null
          bu_id: string
          checkin_day: number
          checkin_deadline_hour: number
          checkin_frequency: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          leader_user_id: string | null
          member_count: number | null
          name: string
          parent_team_id: string | null
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          bu_id: string
          checkin_day?: number
          checkin_deadline_hour?: number
          checkin_frequency?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          leader_user_id?: string | null
          member_count?: number | null
          name: string
          parent_team_id?: string | null
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          bu_id?: string
          checkin_day?: number
          checkin_deadline_hour?: number
          checkin_frequency?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          leader_user_id?: string | null
          member_count?: number | null
          name?: string
          parent_team_id?: string | null
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "teams_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          bu_id: string
          created_at: string
          deleted_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          message_id: string | null
          mime_type: string | null
          ticket_id: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          bu_id: string
          created_at?: string
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          ticket_id: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          bu_id?: string
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          ticket_id?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_profile_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_profile_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_profile_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          bu_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          scope: Database["public"]["Enums"]["ticket_category_scope"]
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          scope?: Database["public"]["Enums"]["ticket_category_scope"]
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          scope?: Database["public"]["Enums"]["ticket_category_scope"]
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_categories_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_internal_routing_rules: {
        Row: {
          assignee_squad_ids: string[] | null
          assignee_team_ids: string[] | null
          assignee_user_ids: string[] | null
          bu_id: string
          category_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          priority: number
          subcategory_id: string | null
          updated_at: string
          watcher_squad_ids: string[] | null
          watcher_team_ids: string[] | null
          watcher_user_ids: string[] | null
        }
        Insert: {
          assignee_squad_ids?: string[] | null
          assignee_team_ids?: string[] | null
          assignee_user_ids?: string[] | null
          bu_id: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          priority?: number
          subcategory_id?: string | null
          updated_at?: string
          watcher_squad_ids?: string[] | null
          watcher_team_ids?: string[] | null
          watcher_user_ids?: string[] | null
        }
        Update: {
          assignee_squad_ids?: string[] | null
          assignee_team_ids?: string[] | null
          assignee_user_ids?: string[] | null
          bu_id?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          priority?: number
          subcategory_id?: string | null
          updated_at?: string
          watcher_squad_ids?: string[] | null
          watcher_team_ids?: string[] | null
          watcher_user_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_internal_routing_rules_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_internal_routing_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_internal_routing_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_internal_routing_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_internal_routing_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_internal_routing_rules_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "ticket_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author_contact_id: string | null
          author_type: Database["public"]["Enums"]["ticket_author_type"]
          author_user_id: string | null
          body_richtext: Json
          bu_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean
          pinned_at: string | null
          pinned_by_user_id: string | null
          reply_to_message_id: string | null
          ticket_id: string
        }
        Insert: {
          author_contact_id?: string | null
          author_type: Database["public"]["Enums"]["ticket_author_type"]
          author_user_id?: string | null
          body_richtext?: Json
          bu_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          pinned_at?: string | null
          pinned_by_user_id?: string | null
          reply_to_message_id?: string | null
          ticket_id: string
        }
        Update: {
          author_contact_id?: string | null
          author_type?: Database["public"]["Enums"]["ticket_author_type"]
          author_user_id?: string | null
          body_richtext?: Json
          bu_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          pinned_at?: string | null
          pinned_by_user_id?: string | null
          reply_to_message_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_contact_id_fkey"
            columns: ["author_contact_id"]
            isOneToOne: false
            referencedRelation: "partner_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_author_profile_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_author_profile_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_author_profile_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_pinned_by_user_id_fkey"
            columns: ["pinned_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_pinned_by_user_id_fkey"
            columns: ["pinned_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_pinned_by_user_id_fkey"
            columns: ["pinned_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_participants: {
        Row: {
          bu_id: string
          created_at: string
          id: string
          is_active: boolean
          participant_type: Database["public"]["Enums"]["ticket_participant_type"]
          partner_contact_id: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["ticket_participant_role"]
          ticket_id: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          participant_type: Database["public"]["Enums"]["ticket_participant_type"]
          partner_contact_id?: string | null
          profile_id?: string | null
          role: Database["public"]["Enums"]["ticket_participant_role"]
          ticket_id: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          participant_type?: Database["public"]["Enums"]["ticket_participant_type"]
          partner_contact_id?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["ticket_participant_role"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_participants_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_participants_partner_contact_id_fkey"
            columns: ["partner_contact_id"]
            isOneToOne: false
            referencedRelation: "partner_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_participants_profile_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_participants_profile_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_participants_profile_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_participants_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_routing_rules: {
        Row: {
          assignee_contact_ids: string[] | null
          bu_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          external_company_id: string | null
          id: string
          notes: string | null
          subcategory_id: string | null
          updated_at: string
          watcher_contact_ids: string[] | null
        }
        Insert: {
          assignee_contact_ids?: string[] | null
          bu_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          external_company_id?: string | null
          id?: string
          notes?: string | null
          subcategory_id?: string | null
          updated_at?: string
          watcher_contact_ids?: string[] | null
        }
        Update: {
          assignee_contact_ids?: string[] | null
          bu_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          external_company_id?: string | null
          id?: string
          notes?: string | null
          subcategory_id?: string | null
          updated_at?: string
          watcher_contact_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_routing_rules_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_routing_rules_partner_company_id_fkey"
            columns: ["external_company_id"]
            isOneToOne: false
            referencedRelation: "external_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_routing_rules_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "ticket_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_subcategories: {
        Row: {
          bu_id: string
          category_id: string
          created_at: string
          created_by: string | null
          default_initial_message: string | null
          deleted_at: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
        }
        Insert: {
          bu_id: string
          category_id: string
          created_at?: string
          created_by?: string | null
          default_initial_message?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Update: {
          bu_id?: string
          category_id?: string
          created_at?: string
          created_by?: string | null
          default_initial_message?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_subcategories_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_contact_id: string | null
          assignment_source: string | null
          bu_id: string
          category_id: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          expected_due_at: string | null
          external_assignee_contact_ids: string[] | null
          external_company_id: string | null
          id: string
          owner_user_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subcategory_id: string | null
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["ticket_visibility"]
          visibility_squad_ids: string[] | null
          visibility_team_ids: string[] | null
          visibility_user_ids: string[] | null
        }
        Insert: {
          assigned_contact_id?: string | null
          assignment_source?: string | null
          bu_id: string
          category_id?: string | null
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          expected_due_at?: string | null
          external_assignee_contact_ids?: string[] | null
          external_company_id?: string | null
          id?: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subcategory_id?: string | null
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["ticket_visibility"]
          visibility_squad_ids?: string[] | null
          visibility_team_ids?: string[] | null
          visibility_user_ids?: string[] | null
        }
        Update: {
          assigned_contact_id?: string | null
          assignment_source?: string | null
          bu_id?: string
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          expected_due_at?: string | null
          external_assignee_contact_ids?: string[] | null
          external_company_id?: string | null
          id?: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subcategory_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["ticket_visibility"]
          visibility_squad_ids?: string[] | null
          visibility_team_ids?: string[] | null
          visibility_user_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_contact_id_fkey"
            columns: ["assigned_contact_id"]
            isOneToOne: false
            referencedRelation: "partner_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_profile_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_profile_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_profile_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_partner_company_id_fkey"
            columns: ["external_company_id"]
            isOneToOne: false
            referencedRelation: "external_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "ticket_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences_v2: {
        Row: {
          bu_id: string
          channel_slug: string
          created_at: string
          enabled: boolean
          event_slug: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bu_id: string
          channel_slug: string
          created_at?: string
          enabled?: boolean
          event_slug: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bu_id?: string
          channel_slug?: string
          created_at?: string
          enabled?: boolean
          event_slug?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_v2_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_v2_channel_slug_fkey"
            columns: ["channel_slug"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_notification_preferences_v2_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["slug"]
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
      user_saved_links: {
        Row: {
          bu_id: string
          created_at: string
          id: string
          is_favorite: boolean
          label: string
          module_slug: string
          path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bu_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          label: string
          module_slug: string
          path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bu_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          label?: string
          module_slug?: string
          path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_links_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "user_team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      identity_rls_violations: {
        Row: {
          policyname: unknown
          problematic_column: string | null
          recommendation: string | null
          schemaname: unknown
          tablename: unknown
          violation_type: string | null
        }
        Relationships: []
      }
      users_without_v2_permissions: {
        Row: {
          bu_id: string | null
          bu_name: string | null
          display_name: string | null
          membership_id: string | null
          profile_id: string | null
          work_email: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bu_user_memberships_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ai_agents_public: {
        Row: {
          bu_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          integration_key: string | null
          is_active: boolean | null
          name: string | null
          output_format:
            | Database["public"]["Enums"]["agent_output_format"]
            | null
          scope: Database["public"]["Enums"]["agent_scope"] | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          bu_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          integration_key?: string | null
          is_active?: boolean | null
          name?: string | null
          output_format?:
            | Database["public"]["Enums"]["agent_output_format"]
            | null
          scope?: Database["public"]["Enums"]["agent_scope"] | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          bu_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          integration_key?: string | null
          is_active?: boolean | null
          name?: string | null
          output_format?:
            | Database["public"]["Enums"]["agent_output_format"]
            | null
          scope?: Database["public"]["Enums"]["agent_scope"] | null
          slug?: string | null
          updated_at?: string | null
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
      v_all_participants: {
        Row: {
          auth_user_id: string | null
          bu_id: string | null
          company_id: string | null
          company_name: string | null
          display_name: string | null
          email: string | null
          job_title: string | null
          participant_id: string | null
          photo_url: string | null
          status: string | null
          team_name: string | null
          user_type: string | null
        }
        Relationships: []
      }
      v_bu_active_profiles: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          bu_id: string | null
          city: string | null
          created_at: string | null
          display_name: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          first_name: string | null
          has_bu_membership: boolean | null
          id: string | null
          job_title_id: string | null
          job_title_name: string | null
          last_name: string | null
          manager_user_id: string | null
          onboarding_completed: boolean | null
          photo_url: string | null
          start_date: string | null
          state: string | null
          team_id: string | null
          team_name: string | null
          user_id: string | null
          user_type: string | null
          work_email: string | null
          work_mode: Database["public"]["Enums"]["work_mode"] | null
        }
        Relationships: []
      }
      v_bu_all_profiles_admin: {
        Row: {
          active_membership_count: number | null
          active_memberships: Json | null
          computed_status: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          first_name: string | null
          global_status: string | null
          id: string | null
          job_title_id: string | null
          job_title_name: string | null
          last_name: string | null
          onboarding_completed: boolean | null
          photo_url: string | null
          primary_bu_id: string | null
          profile_deleted_at: string | null
          start_date: string | null
          team_id: string | null
          team_name: string | null
          user_id: string | null
          user_type: string | null
          work_email: string | null
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
            foreignKeyName: "fk_profiles_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_bu_id_fkey"
            columns: ["primary_bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bu_id_null_report: {
        Row: {
          count_null: number | null
          table_name: string | null
          total: number | null
        }
        Relationships: []
      }
      v_bu_memberships_active: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          bu_id: string | null
          bu_name: string | null
          display_name: string | null
          email: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          first_name: string | null
          global_status: string | null
          is_default: boolean | null
          job_title_id: string | null
          job_title_name: string | null
          last_name: string | null
          membership_created_at: string | null
          membership_id: string | null
          onboarding_completed: boolean | null
          photo_url: string | null
          profile_created_at: string | null
          profile_id: string | null
          role_in_bu: Database["public"]["Enums"]["app_role"] | null
          start_date: string | null
          team_id: string | null
          team_name: string | null
          user_id: string | null
          user_type: string | null
          work_email: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bu_user_memberships_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_identity_health_check: {
        Row: {
          bu_id: string | null
          description: string | null
          email: string | null
          issue_type: string | null
          profile_id: string | null
          record_id: string | null
        }
        Relationships: []
      }
      v_notification_delivery_health: {
        Row: {
          avg_retries: number | null
          bu_id: string | null
          bu_name: string | null
          channel_slug: string | null
          last_1h: number | null
          last_24h: number | null
          status:
            | Database["public"]["Enums"]["notification_outbox_status"]
            | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_channel_slug_fkey"
            columns: ["channel_slug"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["slug"]
          },
        ]
      }
      v_notification_failures: {
        Row: {
          bu_id: string | null
          bu_name: string | null
          channel_slug: string | null
          created_at: string | null
          event_slug: string | null
          id: string | null
          last_error: string | null
          processed_at: string | null
          retries: number | null
          status:
            | Database["public"]["Enums"]["notification_outbox_status"]
            | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_channel_slug_fkey"
            columns: ["channel_slug"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "notification_outbox_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["slug"]
          },
        ]
      }
      v_notification_slo_by_channel_daily: {
        Row: {
          avg_delivery_time_ms: number | null
          bu_id: string | null
          channel_slug: string | null
          day: string | null
          pending_count: number | null
          success_rate: number | null
          total: number | null
          total_failed: number | null
          total_success: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_channel_slug_fkey"
            columns: ["channel_slug"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["slug"]
          },
        ]
      }
      v_notification_slo_by_event_daily: {
        Row: {
          bu_id: string | null
          day: string | null
          event_slug: string | null
          success_rate: number | null
          total: number | null
          total_failed: number | null
          total_success: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["slug"]
          },
        ]
      }
      v_notification_slo_summary_7d: {
        Row: {
          avg_delivery_time_ms: number | null
          bu_id: string | null
          channel_slug: string | null
          pending_count: number | null
          slo_compliant: boolean | null
          success_rate: number | null
          total: number | null
          total_failed: number | null
          total_success: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_channel_slug_fkey"
            columns: ["channel_slug"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["slug"]
          },
        ]
      }
      v_objective_health: {
        Row: {
          bu_id: string | null
          health_score: number | null
          health_status: string | null
          last_health_calculated_at: string | null
          objective_id: string | null
          objective_type: string | null
        }
        Relationships: []
      }
      v_okr_insights_active: {
        Row: {
          bu_id: string | null
          code: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string | null
          message: string | null
          scope_id: string | null
          scope_type: string | null
          severity: string | null
          source: string | null
          suggested_actions: Json | null
          title: string | null
        }
        Insert: {
          bu_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string | null
          message?: string | null
          scope_id?: string | null
          scope_type?: string | null
          severity?: string | null
          source?: string | null
          suggested_actions?: Json | null
          title?: string | null
        }
        Update: {
          bu_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string | null
          message?: string | null
          scope_id?: string | null
          scope_type?: string | null
          severity?: string | null
          source?: string | null
          suggested_actions?: Json | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_insights_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
        ]
      }
      v_partner_services: {
        Row: {
          bu_id: string | null
          category_id: string | null
          category_name: string | null
          category_scope:
            | Database["public"]["Enums"]["ticket_category_scope"]
            | null
          created_at: string | null
          external_company_id: string | null
          external_company_name: string | null
          id: string | null
          is_generalist: boolean | null
          notes: string | null
          status: Database["public"]["Enums"]["partner_service_status"] | null
          subcategory_id: string | null
          subcategory_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_service_mappings_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_service_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_service_mappings_partner_company_id_fkey"
            columns: ["external_company_id"]
            isOneToOne: false
            referencedRelation: "external_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_service_mappings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "ticket_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      v_partner_services_by_bu: {
        Row: {
          bu_id: string | null
          category_id: string | null
          category_name: string | null
          company_name: string | null
          document: string | null
          document_type: string | null
          external_company_id: string | null
          id: string | null
          person_type: string | null
          status: Database["public"]["Enums"]["partner_service_status"] | null
          subcategory_id: string | null
          subcategory_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_company_bu_associations_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_service_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_service_mappings_partner_company_id_fkey"
            columns: ["external_company_id"]
            isOneToOne: false
            referencedRelation: "external_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_service_mappings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "ticket_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pending_checkins: {
        Row: {
          baseline: number | null
          checkin_day: number | null
          checkin_deadline_hour: number | null
          checkin_frequency: string | null
          co_responsibles: string[] | null
          current_value: number | null
          days_since_checkin: number | null
          direction: Database["public"]["Enums"]["okr_direction"] | null
          is_overdue: boolean | null
          kr_id: string | null
          kr_title: string | null
          last_checkin_at: string | null
          objective_id: string | null
          objective_title: string | null
          owner_user_id: string | null
          status: Database["public"]["Enums"]["okr_rag_status"] | null
          target: number | null
          team_id: string | null
          team_name: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_team_key_results_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_key_results_owner_profile_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
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
            foreignKeyName: "okr_team_key_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      v_perf_indexes_report: {
        Row: {
          indexdef: string | null
          indexname: unknown
          tablename: unknown
        }
        Relationships: []
      }
      v_permission_risk_report: {
        Row: {
          bu_id: string | null
          permission_count: number | null
          risk_level: string | null
          risk_reasons: string[] | null
          template_count: number | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bu_user_permission_templates_v2_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_permission_templates_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      v_permissions_without_explanation: {
        Row: {
          action: string | null
          module: string | null
          permission_key: string | null
          resource: string | null
          status: Database["public"]["Enums"]["catalog_status"] | null
        }
        Relationships: []
      }
      v_profiles_directory: {
        Row: {
          created_at: string | null
          display_name: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          first_name: string | null
          global_status: string | null
          has_any_active_membership: boolean | null
          id: string | null
          job_title_id: string | null
          job_title_name: string | null
          last_name: string | null
          onboarding_completed: boolean | null
          photo_url: string | null
          primary_bu_id: string | null
          start_date: string | null
          team_id: string | null
          team_name: string | null
          user_id: string | null
          user_type: string | null
          work_email: string | null
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
            foreignKeyName: "fk_profiles_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_bu_id_fkey"
            columns: ["primary_bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_shared_okrs_summary: {
        Row: {
          contributor_count: number | null
          contributor_team_ids: string[] | null
          contributor_team_names: string[] | null
          created_at: string | null
          description: string | null
          is_shared: boolean | null
          objective_id: string | null
          primary_team_id: string | null
          primary_team_name: string | null
          responsibility_model: string | null
          status: Database["public"]["Enums"]["okr_status"] | null
          title: string | null
          updated_at: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_team_objectives_team_id_fkey"
            columns: ["primary_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_team_id_fkey"
            columns: ["primary_team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      v_team_contributed_okrs: {
        Row: {
          contributor_team_id: string | null
          contributor_team_name: string | null
          created_at: string | null
          is_shared: boolean | null
          objective_id: string | null
          objective_status: Database["public"]["Enums"]["okr_status"] | null
          objective_title: string | null
          primary_team_id: string | null
          primary_team_name: string | null
          responsibility_model: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_team_objective_contributors_team_id_fkey"
            columns: ["contributor_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objective_contributors_team_id_fkey"
            columns: ["contributor_team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_team_id_fkey"
            columns: ["primary_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_team_objectives_team_id_fkey"
            columns: ["primary_team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      v_teams_clean: {
        Row: {
          area_id: string | null
          bu_id: string | null
          checkin_day: number | null
          checkin_deadline_hour: number | null
          checkin_frequency: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string | null
          leader_profile_id: string | null
          member_count: number | null
          name: string | null
          parent_team_id: string | null
          status: Database["public"]["Enums"]["team_status"] | null
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          bu_id?: string | null
          checkin_day?: number | null
          checkin_deadline_hour?: number | null
          checkin_frequency?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string | null
          leader_profile_id?: string | null
          member_count?: number | null
          name?: string | null
          parent_team_id?: string | null
          status?: Database["public"]["Enums"]["team_status"] | null
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          bu_id?: string | null
          checkin_day?: number | null
          checkin_deadline_hour?: number | null
          checkin_frequency?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string | null
          leader_profile_id?: string | null
          member_count?: number | null
          name?: string | null
          parent_team_id?: string | null
          status?: Database["public"]["Enums"]["team_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_user_id_fkey"
            columns: ["leader_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_user_id_fkey"
            columns: ["leader_profile_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_user_id_fkey"
            columns: ["leader_profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      v_users_without_templates: {
        Row: {
          bu_id: string | null
          display_name: string | null
          membership_created_at: string | null
          profile_id: string | null
          role_in_bu: Database["public"]["Enums"]["app_role"] | null
          work_email: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bu_user_memberships_bu_id_fkey"
            columns: ["bu_id"]
            isOneToOne: false
            referencedRelation: "bu_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_bu_all_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bu_user_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acknowledge_health_alert: {
        Args: { p_alert_id: string; p_notes?: string }
        Returns: boolean
      }
      activate_template_version: {
        Args: { p_reason?: string; p_template_id: string; p_version_id: string }
        Returns: boolean
      }
      add_user_bu_access: {
        Args: {
          p_is_default?: boolean
          p_role_in_bu?: string
          target_bu_id: string
          target_user_id: string
        }
        Returns: undefined
      }
      assert_bu_scope: { Args: { p_bu_id: string }; Returns: boolean }
      assert_profile_identity: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      calculate_kr_progress: {
        Args: {
          p_baseline: number
          p_current: number
          p_direction: Database["public"]["Enums"]["okr_direction"]
          p_target: number
        }
        Returns: number
      }
      calculate_objective_health: {
        Args: {
          p_bu_id: string
          p_objective_id: string
          p_objective_type: string
        }
        Returns: Json
      }
      can_manage_asset_inventory: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_gifts: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_inventory: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_keys: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_team_okr: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_team_okr_by_profile: {
        Args: { p_profile_id: string; p_team_id: string }
        Returns: boolean
      }
      can_pin_ticket_message: {
        Args: { p_profile_id: string; p_ticket_id: string }
        Returns: boolean
      }
      can_update_ticket_status: {
        Args: { p_profile_id: string; p_ticket_id: string }
        Returns: boolean
      }
      can_view_ticket: {
        Args: { p_profile_id?: string; p_ticket_id: string }
        Returns: boolean
      }
      check_permission_scope_access: {
        Args: {
          p_bu_id: string
          p_ctx?: Json
          p_scope: Database["public"]["Enums"]["permission_scope"]
          p_user_id: string
        }
        Returns: boolean
      }
      check_scope_access: {
        Args: { p_ctx?: Json; p_scope: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_audit_logs: {
        Args: { p_retention_days?: number }
        Returns: {
          deleted_count: number
          table_name: string
        }[]
      }
      cleanup_old_logs: {
        Args: {
          p_agent_logs_days?: number
          p_audit_logs_days?: number
          p_cron_days?: number
          p_perf_days?: number
          p_wizard_days?: number
        }
        Returns: {
          rows_deleted: number
          table_name: string
        }[]
      }
      cleanup_orphan_memberships: { Args: never; Returns: Json }
      collect_perf_metrics: { Args: never; Returns: Json }
      count_bu_calls_today: { Args: { p_bu_id: string }; Returns: number }
      count_user_calls_today: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: number
      }
      create_bu_template: {
        Args: {
          p_body: string
          p_bu_id: string
          p_channel: string
          p_event_slug: string
          p_reason?: string
          p_subject: string
        }
        Returns: string
      }
      create_mention_notification: {
        Args: {
          p_author_id: string
          p_author_name: string
          p_bu_id: string
          p_context_id: string
          p_context_type: string
          p_context_url: string
          p_mentioned_user_id: string
          p_parent_id: string
          p_parent_type: string
        }
        Returns: string
      }
      create_template_version: {
        Args: {
          p_body: string
          p_reason?: string
          p_subject: string
          p_template_id: string
        }
        Returns: string
      }
      current_bu_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      debug_rls_ticket_insert: {
        Args: { p_bu_id: string; p_created_by_user_id: string }
        Returns: Json
      }
      emit_notification_event: {
        Args: {
          p_actor_id?: string
          p_bu_id: string
          p_context_id?: string
          p_context_type?: string
          p_context_url?: string
          p_event_slug: string
          p_message?: string
          p_metadata?: Json
          p_recipient_user_ids: string[]
          p_title?: string
        }
        Returns: string[]
      }
      ensure_default_v2_template_for_membership: {
        Args: { p_auth_user_id: string; p_bu_id: string; p_role_in_bu?: string }
        Returns: undefined
      }
      evaluate_notification_health: {
        Args: never
        Returns: {
          alerts_created: number
          alerts_resolved: number
          details: Json
        }[]
      }
      explain_permission: {
        Args: { p_bu_id: string; p_permission_key: string; p_user_id: string }
        Returns: {
          granted_at: string
          granted_by: string
          granted_by_name: string
          is_auto_assigned: boolean
          source_id: string
          source_name: string
          source_type: string
        }[]
      }
      f_unaccent: { Args: { "": string }; Returns: string }
      find_partner_by_document: {
        Args: { p_document: string }
        Returns: {
          allowed_domains: string[]
          document: string
          document_type: string
          id: string
          legal_name: string
          name: string
          notes: string
          person_type: string
          status: string
        }[]
      }
      generate_okr_insights_for_objective: {
        Args: {
          p_bu_id: string
          p_objective_id: string
          p_objective_type: string
        }
        Returns: number
      }
      get_asset_kit: {
        Args: { p_asset_id: string }
        Returns: {
          group_id: string
          group_name: string
          group_type: string
          is_primary: boolean
          primary_asset_id: string
          primary_asset_name: string
        }[]
      }
      get_auth_user_id: { Args: { p_profile_id: string }; Returns: string }
      get_bu_by_email_domain: { Args: { p_email: string }; Returns: string }
      get_bu_migration_status: {
        Args: { p_bu_id: string }
        Returns: {
          migrated_users: number
          migration_percentage: number
          not_started_users: number
          total_users: number
          verified_users: number
        }[]
      }
      get_bu_users_by_membership: {
        Args: {
          p_bu_id: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
          p_team_id?: string
        }
        Returns: {
          city: string
          display_name: string
          employment_status: string
          first_name: string
          is_default_bu: boolean
          job_title_id: string
          job_title_name: string
          last_name: string
          manager_user_id: string
          photo_url: string
          profile_id: string
          role_in_bu: string
          state: string
          team_id: string
          team_name: string
          total_count: number
          user_id: string
          work_email: string
          work_mode: string
        }[]
      }
      get_cycle_checkins: {
        Args: { p_cycle_id: string; p_filters?: Json }
        Returns: Json
      }
      get_descendant_team_ids: {
        Args: { p_team_id: string }
        Returns: string[]
      }
      get_effective_permissions_v2: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: {
          action: string
          bu_id: string
          module: string
          permission_id: string
          permission_key: string
          resource: string
          scope: string
          source: string
          source_name: string
          user_id: string
        }[]
      }
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
      get_global_users_admin:
        | {
            Args: {
              p_bu_id?: string
              p_onboarding_status?: string
              p_search?: string
              p_user_type?: string
            }
            Returns: {
              bu_accesses: Json
              display_name: string
              global_role: string
              last_sign_in_at: string
              onboarding_completed: boolean
              primary_bu_id: string
              primary_bu_name: string
              profile_id: string
              user_id: string
              user_type: string
              work_email: string
            }[]
          }
        | {
            Args: {
              p_bu_id?: string
              p_include_terminated?: boolean
              p_onboarding_status?: string
              p_search?: string
              p_user_type?: string
            }
            Returns: {
              bu_accesses: Json
              deleted_at: string
              display_name: string
              employment_status: string
              global_role: string
              last_sign_in_at: string
              onboarding_completed: boolean
              primary_bu_id: string
              primary_bu_name: string
              profile_id: string
              user_id: string
              user_type: string
              work_email: string
            }[]
          }
      get_integration_config_for_bu: {
        Args: { p_bu_id: string; p_integration_key: string }
        Returns: Json
      }
      get_kit_required_accessories: {
        Args: { p_asset_id: string }
        Returns: {
          asset_id: string
          asset_name: string
          current_holder_type: string
          current_location_id: string
          current_user_id: string
          internal_code: string
          is_available: boolean
          status: string
        }[]
      }
      get_leader_teams: {
        Args: { p_bu_id?: string }
        Returns: {
          member_count: number
          parent_team_id: string
          team_description: string
          team_id: string
          team_name: string
        }[]
      }
      get_leader_teams_for_impersonation: {
        Args: { p_bu_id: string; p_target_profile_id: string }
        Returns: {
          member_count: number
          team_id: string
          team_name: string
        }[]
      }
      get_manageable_teams: {
        Args: { p_bu_id?: string; p_user_id?: string }
        Returns: {
          can_manage: boolean
          team_id: string
          team_name: string
        }[]
      }
      get_my_permissions: { Args: { p_bu_id: string }; Returns: string[] }
      get_okr_manageable_team_ids: {
        Args: { p_bu_id?: string; p_user_id?: string }
        Returns: string[]
      }
      get_okr_manageable_team_ids_for_impersonation: {
        Args: { p_bu_id: string; p_target_profile_id: string }
        Returns: string[]
      }
      get_partner_categories: {
        Args: { p_external_company_id: string }
        Returns: {
          category_id: string
          category_name: string
          is_generalist: boolean
          subcategory_count: number
        }[]
      }
      get_partner_company_with_privacy: {
        Args: { p_company_id: string }
        Returns: {
          allowed_domains: string[]
          bu_id: string
          created_at: string
          created_by: string
          document: string
          document_type: string
          id: string
          legal_name: string
          name: string
          notes: string
          person_type: string
          status: string
          updated_at: string
        }[]
      }
      get_partner_contact_ticket_stats: {
        Args: { p_contact_id: string }
        Returns: Json
      }
      get_partner_subcategories: {
        Args: { p_category_id: string; p_external_company_id: string }
        Returns: {
          subcategory_id: string
          subcategory_name: string
        }[]
      }
      get_permission_diff: {
        Args: {
          p_bu_id: string
          p_new_template_ids: string[]
          p_user_id: string
        }
        Returns: {
          change_type: string
          permission_key: string
          source_name: string
        }[]
      }
      get_permission_scope: {
        Args: { p_permission_key: string }
        Returns: Database["public"]["Enums"]["permission_scope"]
      }
      get_profile_bus: {
        Args: { p_profile_id: string }
        Returns: {
          bu_id: string
          bu_name: string
          is_default: boolean
          role_in_bu: string
        }[]
      }
      get_profile_default_bu: {
        Args: { p_profile_id: string }
        Returns: string
      }
      get_profile_id: { Args: { p_user_id: string }; Returns: string }
      get_profile_with_privacy: {
        Args: { p_profile_id: string }
        Returns: {
          birth_day: number
          birth_month: number
          bu_id: string
          city: string
          discord_id: string
          display_name: string
          employment_status: string
          first_name: string
          id: string
          instagram_id: string
          job_title_id: string
          last_name: string
          manager_user_id: string
          photo_url: string
          start_date: string
          state: string
          team_id: string
          user_id: string
          whatsapp_personal: string
          work_email: string
          work_mode: string
        }[]
      }
      get_system_setting: { Args: { p_key: string }; Returns: Json }
      get_team_member_ids: {
        Args: { p_include_subtree?: boolean; p_team_id: string }
        Returns: string[]
      }
      get_ticket_for_impersonation: {
        Args: { p_impersonated_profile_id: string; p_ticket_id: string }
        Returns: {
          assigned_contact_id: string
          bu_id: string
          can_view: boolean
          category_id: string
          created_at: string
          created_by_user_id: string
          expected_due_at: string
          external_company_id: string
          id: string
          owner_user_id: string
          status: string
          subcategory_id: string
          title: string
          type: string
          updated_at: string
          visibility: string
        }[]
      }
      get_user_bus: { Args: { p_user_id: string }; Returns: string[] }
      get_user_default_bu: { Args: { p_user_id: string }; Returns: string }
      get_user_job_title_in_bu: {
        Args: { p_bu_id: string; p_profile_id: string }
        Returns: {
          job_title_id: string
          job_title_name: string
        }[]
      }
      get_user_notification_settings: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: {
          channel_name: string
          channel_slug: string
          enabled: boolean
          event_description: string
          event_module: string
          event_name: string
          event_severity: Database["public"]["Enums"]["notification_severity"]
          event_slug: string
          is_mandatory: boolean
        }[]
      }
      get_user_partner_contact_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_permissions_for_impersonation: {
        Args: { p_bu_id: string; p_target_profile_id: string }
        Returns: string[]
      }
      get_user_role_for_impersonation: {
        Args: { p_bu_id: string; p_target_profile_id: string }
        Returns: string
      }
      get_vacuum_instructions: { Args: never; Returns: string }
      get_visible_ticket_ids_for_impersonation: {
        Args: { p_profile_id: string }
        Returns: string[]
      }
      has_any_asset_permission: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      has_asset_permission: {
        Args: {
          p_bu_id: string
          p_roles: Database["public"]["Enums"]["asset_permission_role"][]
          p_user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { p_bu_id: string; p_permission_key: string; p_user_id: string }
        Returns: boolean
      }
      has_permission_key: {
        Args: { p_bu_id: string; p_permission_key: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_counting_columns: {
        Args: never
        Returns: {
          objectives_updated: number
          teams_updated: number
        }[]
      }
      is_agent_enabled_for_bu: {
        Args: { p_agent_id: string; p_bu_id: string }
        Returns: boolean
      }
      is_allowed_partner_email: { Args: { p_email: string }; Returns: boolean }
      is_bu_admin: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: boolean
      }
      is_bu_member: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: boolean
      }
      is_current_bu: { Args: { p_bu_id: string }; Returns: boolean }
      is_email_domain_allowed: { Args: { p_email: string }; Returns: boolean }
      is_ia_enabled_for_bu: { Args: { p_bu_id: string }; Returns: boolean }
      is_module_enabled_for_bu: {
        Args: { p_bu_id: string; p_module_slug: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_profile_bu_admin: {
        Args: { p_bu_id: string; p_profile_id: string }
        Returns: boolean
      }
      is_profile_bu_member: {
        Args: { p_bu_id: string; p_profile_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_leader: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_team_leader_by_profile: {
        Args: { p_profile_id: string; p_team_id: string }
        Returns: boolean
      }
      is_ticket_contact_participant: {
        Args: { p_contact_id: string; p_ticket_id: string }
        Returns: boolean
      }
      is_ticket_participant: {
        Args: { p_ticket_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_leader: { Args: { p_user_id?: string }; Returns: boolean }
      job_title_belongs_to_bu: {
        Args: { p_bu_id: string; p_job_title_id: string }
        Returns: boolean
      }
      kpi_calculate_period: {
        Args: {
          p_frequency: Database["public"]["Enums"]["kpi_frequency"]
          p_reference_date: string
        }
        Returns: Record<string, unknown>
      }
      kpi_calculate_rag: {
        Args: {
          p_direction: Database["public"]["Enums"]["kpi_direction"]
          p_target: number
          p_value: number
        }
        Returns: Database["public"]["Enums"]["kpi_rag_status"]
      }
      list_partner_companies_with_privacy: {
        Args: { p_bu_id: string }
        Returns: {
          allowed_domains: string[]
          bu_id: string
          created_at: string
          created_by: string
          document: string
          document_type: string
          id: string
          legal_name: string
          name: string
          notes: string
          person_type: string
          status: string
          updated_at: string
        }[]
      }
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
      log_permission_change: {
        Args: {
          p_action: string
          p_after_state?: Json
          p_before_state?: Json
          p_bu_id: string
          p_entity_id?: string
          p_entity_name?: string
          p_entity_type: string
          p_reason?: string
          p_target_user_id: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_user_migrated: {
        Args: {
          p_bu_id: string
          p_notes?: string
          p_user_id: string
          p_v1_snapshot?: Json
          p_v2_templates?: Json
        }
        Returns: string
      }
      my_profile_id: { Args: never; Returns: string }
      my_profile_id_strict: { Args: never; Returns: string }
      normalize_asset_code: { Args: { code_text: string }; Returns: string }
      profile_has_bu_access: {
        Args: { p_bu_id: string; p_profile_id: string }
        Returns: boolean
      }
      profile_id_from_user_id: { Args: { p_user_id: string }; Returns: string }
      reactivate_user: {
        Args: { target_profile_id: string }
        Returns: undefined
      }
      refresh_objective_health: {
        Args: {
          p_bu_id: string
          p_objective_id: string
          p_objective_type: string
        }
        Returns: undefined
      }
      remove_user_bu_access: {
        Args: { target_bu_id: string; target_user_id: string }
        Returns: undefined
      }
      reset_user_onboarding: {
        Args: { target_profile_id: string }
        Returns: undefined
      }
      resolve_asset_by_code_for_bu: {
        Args: { code_text: string; p_bu_id: string }
        Returns: string
      }
      resolve_asset_by_code_global: {
        Args: { code_text: string }
        Returns: {
          asset_id: string
          bu_id: string
        }[]
      }
      resolve_health_alert: {
        Args: { p_alert_id: string; p_notes?: string }
        Returns: boolean
      }
      resolve_notification_recipient: {
        Args: { p_auth_user_id: string }
        Returns: Json
      }
      resolve_notification_template: {
        Args: { p_bu_id?: string; p_channel: string; p_event_slug: string }
        Returns: {
          body: string
          is_bu_override: boolean
          subject: string
          template_id: string
          variables_used: string[]
          version_id: string
        }[]
      }
      resolve_participant_identity: {
        Args: { p_bu_id?: string; p_participant_id: string }
        Returns: {
          display_name: string
          email: string
          external_company_id: string
          external_company_name: string
          id: string
          job_title: string
          participant_type: string
          photo_url: string
          team_name: string
          user_id: string
        }[]
      }
      resolve_ticket_assignee: {
        Args: {
          p_bu_id: string
          p_category_id: string
          p_external_company_id: string
          p_subcategory_id?: string
        }
        Returns: string
      }
      resolve_work_email: { Args: { p_auth_user_id: string }; Returns: string }
      rpc_home_dashboard_data: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: Json
      }
      rpc_leader_dashboard_focus: { Args: { p_team_id: string }; Returns: Json }
      rpc_leader_dashboard_summary: {
        Args: { p_team_id: string }
        Returns: Json
      }
      rpc_okr_dashboard_data: {
        Args: {
          p_bu_id: string
          p_team_id?: string
          p_view?: string
          p_year: number
        }
        Returns: Json
      }
      rpc_tickets_summary: {
        Args: { p_bu_id: string; p_team_id?: string }
        Returns: Json
      }
      search_bu_users_for_mention: {
        Args: { p_bu_id: string; p_limit?: number; p_search_term?: string }
        Returns: {
          display_name: string
          email: string
          id: string
          photo_url: string
          team_name: string
          user_id: string
          user_type: string
        }[]
      }
      search_mention_candidates: {
        Args: {
          p_bu_id: string
          p_external_company_id?: string
          p_limit?: number
          p_search_term?: string
        }
        Returns: {
          display_name: string
          email: string
          entity_id: string
          entity_type: string
          external_company_name: string
          id: string
          photo_url: string
          team_name: string
        }[]
      }
      send_test_notification: {
        Args: {
          p_bu_id: string
          p_channels?: string[]
          p_target_user_id: string
        }
        Returns: {
          channel: string
          notification_id: string
          outbox_id: string
          status: string
        }[]
      }
      send_test_notification_v2: {
        Args: {
          p_bu_id: string
          p_channels?: string[]
          p_target_profile_id: string
        }
        Returns: {
          channel: string
          error_message: string
          notification_id: string
          outbox_id: string
          status: string
        }[]
      }
      set_user_notification_preference: {
        Args: {
          p_bu_id: string
          p_channel_slug: string
          p_enabled: boolean
          p_event_slug: string
          p_user_id: string
        }
        Returns: boolean
      }
      sync_profile_bu_to_default_membership: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      team_is_ancestor: {
        Args: { p_ancestor_team_id: string; p_team_id: string }
        Returns: boolean
      }
      team_is_descendant: {
        Args: { p_ancestor_team_id: string; p_team_id: string }
        Returns: boolean
      }
      update_user_global_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      user_can_manage_team: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_bu_access: {
        Args: { p_bu_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { p_bu_id: string; p_permission_key: string; p_user_id: string }
        Returns: boolean
      }
      user_has_permission_ctx: {
        Args: {
          p_bu_id: string
          p_ctx?: Json
          p_permission_key: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_id_from_profile_id: {
        Args: { p_profile_id: string }
        Returns: string
      }
      validate_template_variables: {
        Args: { p_body: string; p_event_slug: string; p_subject?: string }
        Returns: {
          invalid_variables: string[]
          is_valid: boolean
          missing_required: string[]
        }[]
      }
      verify_user_migration: {
        Args: { p_bu_id: string; p_notes?: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_output_format: "text" | "json"
      agent_scope: "global" | "bu"
      ai_agent_log_status: "pending" | "success" | "error" | "timeout"
      app_role: "super_admin" | "admin" | "collaborator" | "external"
      asset_group_item_role: "primary" | "accessory"
      asset_group_status: "active" | "inactive"
      asset_group_type: "kit" | "bundle"
      asset_holder_type: "location" | "user"
      asset_inventory_status:
        | "available"
        | "loaned"
        | "maintenance"
        | "written_off"
      asset_movement_type:
        | "checkout"
        | "return"
        | "transfer"
        | "maintenance_start"
        | "maintenance_end"
        | "write_off"
      asset_permission_role:
        | "assets_admin"
        | "inventory_admin"
        | "inventory_manager"
        | "keys_admin"
        | "keys_manager"
        | "gifts_admin"
        | "gifts_manager"
        | "viewer"
      automation_log_status: "pending" | "success" | "error" | "timeout"
      automation_log_type: "webhook" | "incoming" | "scheduled"
      bu_location_status: "active" | "inactive"
      bu_location_type:
        | "headquarters"
        | "office"
        | "warehouse"
        | "remote_hub"
        | "other"
        | "room"
      bu_status: "active" | "inactive"
      catalog_status: "active" | "inactive" | "deprecated"
      cron_status: "started" | "success" | "failed" | "error" | "timeout"
      cycle_type: "year" | "quarter" | "month" | "sprint" | "custom"
      document_processing_status:
        | "pending"
        | "processing"
        | "completed"
        | "error"
      employment_status: "active" | "vacation" | "terminated" | "external"
      gift_destination_type: "event" | "campaign" | "person" | "other"
      gift_item_status: "active" | "inactive"
      gift_movement_type: "in" | "out" | "adjustment"
      initiative_priority: "low" | "medium" | "high"
      initiative_status: "planned" | "in_progress" | "blocked" | "completed"
      instruction_source_type: "api" | "document" | "hub_context" | "template"
      integration_config_mode: "use_global" | "override"
      integration_test_status: "ok" | "error" | "pending"
      key_access_type: "door" | "padlock" | "gate" | "other"
      key_movement_type: "checkout" | "return" | "transfer" | "lost" | "retired"
      key_status: "in_claviculary" | "loaned" | "lost" | "retired"
      keyring_status: "available" | "loaned" | "lost" | "retired"
      kpi_category:
        | "financeiro"
        | "growth"
        | "cs"
        | "produto"
        | "operacoes"
        | "pessoas"
      kpi_confidence_level: "high" | "medium" | "low"
      kpi_contributor_role: "data_entry" | "reviewer"
      kpi_direction: "up" | "down"
      kpi_frequency: "daily" | "weekly" | "monthly" | "quarterly"
      kpi_indicator_type: "kpi" | "metric"
      kpi_lifecycle_status: "proposed" | "active" | "observing" | "deprecated"
      kpi_rag_status: "on_track" | "at_risk" | "off_track" | "no_data"
      kpi_scope: "team" | "area" | "org"
      kpi_status: "active" | "inactive"
      kpi_value_source:
        | "manual"
        | "integration"
        | "calculation"
        | "api"
        | "webhook"
        | "spreadsheet"
        | "database"
      migration_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "failed"
        | "rolled_back"
      module_health: "healthy" | "degraded" | "down"
      module_status: "active" | "inactive" | "coming_soon"
      module_type: "global" | "operational"
      notification_audience: "internal" | "external" | "both"
      notification_channel: "internal" | "email" | "slack" | "whatsapp"
      notification_delivery_status: "pending" | "sent" | "failed" | "skipped"
      notification_outbox_status:
        | "pending"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      notification_severity: "info" | "warning" | "critical"
      notification_type:
        | "mention"
        | "checkin_created"
        | "checkin_overdue"
        | "kr_status_changed"
        | "shared_okr_update"
        | "info"
        | "system"
        | "alert"
      okr_channel: "email" | "slack" | "both"
      okr_confidence: "high" | "medium" | "low"
      okr_contribution_entity_type: "objective" | "kr"
      okr_dependency_status: "ok" | "blocked" | "at_risk"
      okr_direction: "up" | "down" | "maintain"
      okr_kr_type: "contribution" | "enabler" | "foundational"
      okr_metric_role: "primary" | "guardrail"
      okr_rag_status: "green" | "yellow" | "red" | "not_started"
      okr_report_frequency: "weekly" | "monthly" | "quarterly" | "event"
      okr_status: "draft" | "active" | "completed" | "cancelled" | "discarded"
      partner_company_status: "active" | "inactive"
      partner_contact_status: "active" | "inactive"
      partner_service_status: "active" | "inactive"
      permission_effect: "allow" | "deny"
      permission_migration_status: "not_started" | "migrated" | "verified"
      permission_scope:
        | "self"
        | "self_or_owner"
        | "team"
        | "team_tree"
        | "squad"
        | "bu"
        | "global"
        | "public"
      squad_product: "crm" | "cms" | "erp"
      squad_role: "product_owner" | "tech_lead" | "ux_ui_lead" | "member"
      team_status: "active" | "inactive"
      ticket_author_type: "internal_user" | "partner_contact" | "system"
      ticket_category_scope: "internal" | "external" | "both"
      ticket_participant_role: "requester" | "assignee" | "watcher"
      ticket_participant_type: "internal_user" | "partner_contact"
      ticket_status: "waiting" | "paused" | "in_progress" | "done" | "discarded"
      ticket_type: "internal" | "external"
      ticket_visibility: "bu_all" | "teams" | "users" | "private"
      wizard_session_status: "draft" | "in_progress" | "completed" | "abandoned"
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
      ai_agent_log_status: ["pending", "success", "error", "timeout"],
      app_role: ["super_admin", "admin", "collaborator", "external"],
      asset_group_item_role: ["primary", "accessory"],
      asset_group_status: ["active", "inactive"],
      asset_group_type: ["kit", "bundle"],
      asset_holder_type: ["location", "user"],
      asset_inventory_status: [
        "available",
        "loaned",
        "maintenance",
        "written_off",
      ],
      asset_movement_type: [
        "checkout",
        "return",
        "transfer",
        "maintenance_start",
        "maintenance_end",
        "write_off",
      ],
      asset_permission_role: [
        "assets_admin",
        "inventory_admin",
        "inventory_manager",
        "keys_admin",
        "keys_manager",
        "gifts_admin",
        "gifts_manager",
        "viewer",
      ],
      automation_log_status: ["pending", "success", "error", "timeout"],
      automation_log_type: ["webhook", "incoming", "scheduled"],
      bu_location_status: ["active", "inactive"],
      bu_location_type: [
        "headquarters",
        "office",
        "warehouse",
        "remote_hub",
        "other",
        "room",
      ],
      bu_status: ["active", "inactive"],
      catalog_status: ["active", "inactive", "deprecated"],
      cron_status: ["started", "success", "failed", "error", "timeout"],
      cycle_type: ["year", "quarter", "month", "sprint", "custom"],
      document_processing_status: [
        "pending",
        "processing",
        "completed",
        "error",
      ],
      employment_status: ["active", "vacation", "terminated", "external"],
      gift_destination_type: ["event", "campaign", "person", "other"],
      gift_item_status: ["active", "inactive"],
      gift_movement_type: ["in", "out", "adjustment"],
      initiative_priority: ["low", "medium", "high"],
      initiative_status: ["planned", "in_progress", "blocked", "completed"],
      instruction_source_type: ["api", "document", "hub_context", "template"],
      integration_config_mode: ["use_global", "override"],
      integration_test_status: ["ok", "error", "pending"],
      key_access_type: ["door", "padlock", "gate", "other"],
      key_movement_type: ["checkout", "return", "transfer", "lost", "retired"],
      key_status: ["in_claviculary", "loaned", "lost", "retired"],
      keyring_status: ["available", "loaned", "lost", "retired"],
      kpi_category: [
        "financeiro",
        "growth",
        "cs",
        "produto",
        "operacoes",
        "pessoas",
      ],
      kpi_confidence_level: ["high", "medium", "low"],
      kpi_contributor_role: ["data_entry", "reviewer"],
      kpi_direction: ["up", "down"],
      kpi_frequency: ["daily", "weekly", "monthly", "quarterly"],
      kpi_indicator_type: ["kpi", "metric"],
      kpi_lifecycle_status: ["proposed", "active", "observing", "deprecated"],
      kpi_rag_status: ["on_track", "at_risk", "off_track", "no_data"],
      kpi_scope: ["team", "area", "org"],
      kpi_status: ["active", "inactive"],
      kpi_value_source: [
        "manual",
        "integration",
        "calculation",
        "api",
        "webhook",
        "spreadsheet",
        "database",
      ],
      migration_status: [
        "pending",
        "in_progress",
        "completed",
        "failed",
        "rolled_back",
      ],
      module_health: ["healthy", "degraded", "down"],
      module_status: ["active", "inactive", "coming_soon"],
      module_type: ["global", "operational"],
      notification_audience: ["internal", "external", "both"],
      notification_channel: ["internal", "email", "slack", "whatsapp"],
      notification_delivery_status: ["pending", "sent", "failed", "skipped"],
      notification_outbox_status: [
        "pending",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
      notification_severity: ["info", "warning", "critical"],
      notification_type: [
        "mention",
        "checkin_created",
        "checkin_overdue",
        "kr_status_changed",
        "shared_okr_update",
        "info",
        "system",
        "alert",
      ],
      okr_channel: ["email", "slack", "both"],
      okr_confidence: ["high", "medium", "low"],
      okr_contribution_entity_type: ["objective", "kr"],
      okr_dependency_status: ["ok", "blocked", "at_risk"],
      okr_direction: ["up", "down", "maintain"],
      okr_kr_type: ["contribution", "enabler", "foundational"],
      okr_metric_role: ["primary", "guardrail"],
      okr_rag_status: ["green", "yellow", "red", "not_started"],
      okr_report_frequency: ["weekly", "monthly", "quarterly", "event"],
      okr_status: ["draft", "active", "completed", "cancelled", "discarded"],
      partner_company_status: ["active", "inactive"],
      partner_contact_status: ["active", "inactive"],
      partner_service_status: ["active", "inactive"],
      permission_effect: ["allow", "deny"],
      permission_migration_status: ["not_started", "migrated", "verified"],
      permission_scope: [
        "self",
        "self_or_owner",
        "team",
        "team_tree",
        "squad",
        "bu",
        "global",
        "public",
      ],
      squad_product: ["crm", "cms", "erp"],
      squad_role: ["product_owner", "tech_lead", "ux_ui_lead", "member"],
      team_status: ["active", "inactive"],
      ticket_author_type: ["internal_user", "partner_contact", "system"],
      ticket_category_scope: ["internal", "external", "both"],
      ticket_participant_role: ["requester", "assignee", "watcher"],
      ticket_participant_type: ["internal_user", "partner_contact"],
      ticket_status: ["waiting", "paused", "in_progress", "done", "discarded"],
      ticket_type: ["internal", "external"],
      ticket_visibility: ["bu_all", "teams", "users", "private"],
      wizard_session_status: ["draft", "in_progress", "completed", "abandoned"],
      work_mode: ["onsite", "hybrid", "remote"],
    },
  },
} as const
