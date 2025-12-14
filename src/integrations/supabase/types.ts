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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      aas: {
        Row: {
          asset_id: string
          created_at: string
          description: string
          id: string
          id_short: string
          linked_rds_id: string | null
          linked_uns_node_id: string | null
          manufacturer: string | null
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          description: string
          id?: string
          id_short: string
          linked_rds_id?: string | null
          linked_uns_node_id?: string | null
          manufacturer?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          description?: string
          id?: string
          id_short?: string
          linked_rds_id?: string | null
          linked_uns_node_id?: string | null
          manufacturer?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aas_linked_uns_node_id_fkey"
            columns: ["linked_uns_node_id"]
            isOneToOne: false
            referencedRelation: "uns_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_aas_linked_rds"
            columns: ["linked_rds_id"]
            isOneToOne: false
            referencedRelation: "rds_designations"
            referencedColumns: ["id"]
          },
        ]
      }
      aas_properties: {
        Row: {
          created_at: string
          description: string | null
          id: string
          id_short: string
          submodel_id: string
          unit: string | null
          value: Json
          value_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          id_short: string
          submodel_id: string
          unit?: string | null
          value: Json
          value_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          id_short?: string
          submodel_id?: string
          unit?: string | null
          value?: Json
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "aas_properties_submodel_id_fkey"
            columns: ["submodel_id"]
            isOneToOne: false
            referencedRelation: "aas_submodels"
            referencedColumns: ["id"]
          },
        ]
      }
      aas_submodels: {
        Row: {
          aas_id: string
          created_at: string
          description: string
          id: string
          id_short: string
          semantic_id: string
        }
        Insert: {
          aas_id: string
          created_at?: string
          description: string
          id?: string
          id_short: string
          semantic_id: string
        }
        Update: {
          aas_id?: string
          created_at?: string
          description?: string
          id?: string
          id_short?: string
          semantic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aas_submodels_aas_id_fkey"
            columns: ["aas_id"]
            isOneToOne: false
            referencedRelation: "aas"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_location_history: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          moved_by: string | null
          new_designation: string | null
          new_location_aspect: string | null
          new_uns_node_id: string | null
          previous_designation: string | null
          previous_location_aspect: string | null
          previous_uns_node_id: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          moved_by?: string | null
          new_designation?: string | null
          new_location_aspect?: string | null
          new_uns_node_id?: string | null
          previous_designation?: string | null
          previous_location_aspect?: string | null
          previous_uns_node_id?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          moved_by?: string | null
          new_designation?: string | null
          new_location_aspect?: string | null
          new_uns_node_id?: string | null
          previous_designation?: string | null
          previous_location_aspect?: string | null
          previous_uns_node_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_location_history_new_uns_node_id_fkey"
            columns: ["new_uns_node_id"]
            isOneToOne: false
            referencedRelation: "uns_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_location_history_previous_uns_node_id_fkey"
            columns: ["previous_uns_node_id"]
            isOneToOne: false
            referencedRelation: "uns_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_links: {
        Row: {
          created_at: string
          id: string
          link_type: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_type: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          link_type?: string
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      rds_designations: {
        Row: {
          aspect_code: string
          created_at: string
          description: string
          designation: string
          function_aspect: string | null
          id: string
          is_instance: boolean
          linked_aas_id: string | null
          linked_uns_node_id: string | null
          location_aspect: string | null
          metadata: Json | null
          object_class: string
          parent_definition_id: string | null
          product_aspect: string | null
          updated_at: string
        }
        Insert: {
          aspect_code: string
          created_at?: string
          description: string
          designation: string
          function_aspect?: string | null
          id?: string
          is_instance?: boolean
          linked_aas_id?: string | null
          linked_uns_node_id?: string | null
          location_aspect?: string | null
          metadata?: Json | null
          object_class: string
          parent_definition_id?: string | null
          product_aspect?: string | null
          updated_at?: string
        }
        Update: {
          aspect_code?: string
          created_at?: string
          description?: string
          designation?: string
          function_aspect?: string | null
          id?: string
          is_instance?: boolean
          linked_aas_id?: string | null
          linked_uns_node_id?: string | null
          location_aspect?: string | null
          metadata?: Json | null
          object_class?: string
          parent_definition_id?: string | null
          product_aspect?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rds_designations_linked_aas_id_fkey"
            columns: ["linked_aas_id"]
            isOneToOne: false
            referencedRelation: "aas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rds_designations_linked_uns_node_id_fkey"
            columns: ["linked_uns_node_id"]
            isOneToOne: false
            referencedRelation: "uns_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rds_designations_parent_definition_id_fkey"
            columns: ["parent_definition_id"]
            isOneToOne: false
            referencedRelation: "rds_designations"
            referencedColumns: ["id"]
          },
        ]
      }
      uns_nodes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: string
          metadata: Json | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level: string
          metadata?: Json | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uns_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "uns_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_entity_links: {
        Args: never
        Returns: {
          description: string
          entity_id: string
          entity_type: string
          issue_type: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
