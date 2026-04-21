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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_schedules: {
        Row: {
          created_at: string
          cron_expression: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cron_expression?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cron_expression?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "automation_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_issues: {
        Row: {
          automation_name: string
          business_impact: string
          created_at: string
          id: string
          name: string
          profile_id: string
          recommendation: string
          resolved_at: string | null
          severity: string
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          automation_name: string
          business_impact: string
          created_at?: string
          id?: string
          name: string
          profile_id: string
          recommendation: string
          resolved_at?: string | null
          severity: string
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          automation_name?: string
          business_impact?: string
          created_at?: string
          id?: string
          name?: string
          profile_id?: string
          recommendation?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_issues_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "automation_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_profiles: {
        Row: {
          created_at: string
          description: string | null
          health_score: number
          id: string
          industry: string | null
          last_audit_at: string | null
          name: string
          platform: string
          scenario_count: number
          snoozed_until: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          health_score?: number
          id?: string
          industry?: string | null
          last_audit_at?: string | null
          name: string
          platform: string
          scenario_count?: number
          snoozed_until?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          health_score?: number
          id?: string
          industry?: string | null
          last_audit_at?: string | null
          name?: string
          platform?: string
          scenario_count?: number
          snoozed_until?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          connection_id: string
          created_at: string
          external_id: string
          failed_runs: number
          id: string
          last_run_at: string | null
          name: string
          profile_id: string
          raw_data: Json | null
          status: string
          success_rate: number | null
          total_runs: number
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          external_id: string
          failed_runs?: number
          id?: string
          last_run_at?: string | null
          name: string
          profile_id: string
          raw_data?: Json | null
          status: string
          success_rate?: number | null
          total_runs?: number
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          external_id?: string
          failed_runs?: number
          id?: string
          last_run_at?: string | null
          name?: string
          profile_id?: string
          raw_data?: Json | null
          status?: string
          success_rate?: number | null
          total_runs?: number
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "automation_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_interest: {
        Row: {
          created_at: string
          id: string
          platform_slug: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform_slug: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform_slug?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_interest_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          platform_slug: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          platform_slug: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          platform_slug?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_reports: {
        Row: {
          created_at: string
          id: string
          model_used: string
          most_dangerous: string
          overall_health: string
          profile_id: string
          recommendations: string
          tokens_used: number | null
          triggered_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_used: string
          most_dangerous: string
          overall_health: string
          profile_id: string
          recommendations: string
          tokens_used?: number | null
          triggered_by: string
        }
        Update: {
          created_at?: string
          id?: string
          model_used?: string
          most_dangerous?: string
          overall_health?: string
          profile_id?: string
          recommendations?: string
          tokens_used?: number | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "automation_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_logs: {
        Row: {
          automation_id: string
          created_at: string
          data_in: Json | null
          data_out: Json | null
          error_message: string | null
          external_id: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          data_in?: Json | null
          data_out?: Json | null
          error_message?: string | null
          external_id?: string | null
          finished_at?: string | null
          id?: string
          started_at: string
          status: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          data_in?: Json | null
          data_out?: Json | null
          error_message?: string | null
          external_id?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      ltd_allocations: {
        Row: {
          id: number
          seats_sold: number
          total_seats: number
          updated_at: string
        }
        Insert: {
          id: number
          seats_sold?: number
          total_seats?: number
          updated_at?: string
        }
        Update: {
          id?: number
          seats_sold?: number
          total_seats?: number
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel: string
          config: Json
          is_enabled: boolean
          user_id: string
          workspace_id: string
        }
        Insert: {
          channel: string
          config?: Json
          is_enabled?: boolean
          user_id: string
          workspace_id: string
        }
        Update: {
          channel?: string
          config?: Json
          is_enabled?: boolean
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          related_issue_id: string | null
          related_profile_id: string | null
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_issue_id?: string | null
          related_profile_id?: string | null
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_issue_id?: string | null
          related_profile_id?: string | null
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_issue_id_fkey"
            columns: ["related_issue_id"]
            isOneToOne: false
            referencedRelation: "automation_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_profile_id_fkey"
            columns: ["related_profile_id"]
            isOneToOne: false
            referencedRelation: "automation_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token_encrypted: string | null
          api_key_encrypted: string | null
          auth_type: string
          created_at: string
          credentials_vault_id: string | null
          display_name: string
          error_message: string | null
          id: string
          instance_url: string | null
          last_synced_at: string | null
          last_tested_at: string | null
          platform: string
          refresh_token_encrypted: string | null
          status: string
          team_id: number | null
          token_expires_at: string | null
          updated_at: string
          workspace_id: string
          zone: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          api_key_encrypted?: string | null
          auth_type: string
          created_at?: string
          credentials_vault_id?: string | null
          display_name?: string
          error_message?: string | null
          id?: string
          instance_url?: string | null
          last_synced_at?: string | null
          last_tested_at?: string | null
          platform: string
          refresh_token_encrypted?: string | null
          status?: string
          team_id?: number | null
          token_expires_at?: string | null
          updated_at?: string
          workspace_id: string
          zone?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          api_key_encrypted?: string | null
          auth_type?: string
          created_at?: string
          credentials_vault_id?: string | null
          display_name?: string
          error_message?: string | null
          id?: string
          instance_url?: string | null
          last_synced_at?: string | null
          last_tested_at?: string | null
          platform?: string
          refresh_token_encrypted?: string | null
          status?: string
          team_id?: number | null
          token_expires_at?: string | null
          updated_at?: string
          workspace_id?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_health_snapshots: {
        Row: {
          automation_count: number
          captured_on: string
          created_at: string
          critical_issue_count: number
          health_score: number
          open_issue_count: number
          profile_id: string
        }
        Insert: {
          automation_count?: number
          captured_on?: string
          created_at?: string
          critical_issue_count?: number
          health_score: number
          open_issue_count?: number
          profile_id: string
        }
        Update: {
          automation_count?: number
          captured_on?: string
          created_at?: string
          critical_issue_count?: number
          health_score?: number
          open_issue_count?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_health_snapshots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "automation_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          id: string
          received_at: string
          type: string
        }
        Insert: {
          id: string
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          received_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_country: string | null
          billing_email: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_ltd: boolean
          ltd_purchased_at: string | null
          plan: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          tax_id: string | null
          tax_id_country: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_country?: string | null
          billing_email?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_ltd?: boolean
          ltd_purchased_at?: string | null
          plan?: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          tax_id?: string | null
          tax_id_country?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          billing_country?: string | null
          billing_email?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_ltd?: boolean
          ltd_purchased_at?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          tax_id?: string | null
          tax_id_country?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_ltd_seat: { Args: never; Returns: number }
      get_user_admin_workspace_ids: { Args: never; Returns: string[] }
      get_user_workspace_ids: { Args: never; Returns: string[] }
      runmend_trigger_sync: { Args: never; Returns: number }
      update_automation_stats: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      update_profile_scenario_count: {
        Args: { p_profile_id: string }
        Returns: undefined
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
