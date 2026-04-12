export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          role?: "owner" | "admin" | "member";
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      automation_profiles: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          platform: "zapier" | "make" | "n8n";
          scenario_count: number;
          industry: string | null;
          description: string | null;
          health_score: number;
          last_audit_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          platform: "zapier" | "make" | "n8n";
          scenario_count?: number;
          industry?: string | null;
          description?: string | null;
          health_score?: number;
          last_audit_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          platform?: "zapier" | "make" | "n8n";
          scenario_count?: number;
          industry?: string | null;
          description?: string | null;
          health_score?: number;
          last_audit_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automation_profiles_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      automation_issues: {
        Row: {
          id: string;
          profile_id: string;
          severity: "critical" | "warning" | "info";
          name: string;
          automation_name: string;
          business_impact: string;
          recommendation: string;
          status: "open" | "acknowledged" | "resolved" | "dismissed";
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          severity: "critical" | "warning" | "info";
          name: string;
          automation_name: string;
          business_impact: string;
          recommendation: string;
          status?: "open" | "acknowledged" | "resolved" | "dismissed";
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          severity?: "critical" | "warning" | "info";
          name?: string;
          automation_name?: string;
          business_impact?: string;
          recommendation?: string;
          status?: "open" | "acknowledged" | "resolved" | "dismissed";
          resolved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automation_issues_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "automation_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_connections: {
        Row: {
          id: string;
          workspace_id: string;
          platform: "zapier" | "make" | "n8n";
          auth_type: "oauth" | "api_key" | "webhook";
          credentials_vault_id: string | null;
          access_token_encrypted: string | null;
          refresh_token_encrypted: string | null;
          token_expires_at: string | null;
          api_key_encrypted: string | null;
          instance_url: string | null;
          status: "pending" | "active" | "expired" | "revoked" | "error";
          last_synced_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          platform: "zapier" | "make" | "n8n";
          auth_type: "oauth" | "api_key" | "webhook";
          credentials_vault_id?: string | null;
          access_token_encrypted?: string | null;
          refresh_token_encrypted?: string | null;
          token_expires_at?: string | null;
          api_key_encrypted?: string | null;
          instance_url?: string | null;
          status?: "pending" | "active" | "expired" | "revoked" | "error";
          last_synced_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          platform?: "zapier" | "make" | "n8n";
          auth_type?: "oauth" | "api_key" | "webhook";
          credentials_vault_id?: string | null;
          access_token_encrypted?: string | null;
          refresh_token_encrypted?: string | null;
          token_expires_at?: string | null;
          api_key_encrypted?: string | null;
          instance_url?: string | null;
          status?: "pending" | "active" | "expired" | "revoked" | "error";
          last_synced_at?: string | null;
          error_message?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "platform_connections_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      automations: {
        Row: {
          id: string;
          connection_id: string;
          profile_id: string;
          external_id: string;
          name: string;
          status: string;
          trigger_type: string | null;
          last_run_at: string | null;
          success_rate: number | null;
          total_runs: number;
          failed_runs: number;
          raw_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          profile_id: string;
          external_id: string;
          name: string;
          status: string;
          trigger_type?: string | null;
          last_run_at?: string | null;
          success_rate?: number | null;
          total_runs?: number;
          failed_runs?: number;
          raw_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          status?: string;
          trigger_type?: string | null;
          last_run_at?: string | null;
          success_rate?: number | null;
          total_runs?: number;
          failed_runs?: number;
          raw_data?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automations_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "platform_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "automations_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "automation_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      execution_logs: {
        Row: {
          id: string;
          automation_id: string;
          external_id: string | null;
          status: string;
          started_at: string;
          finished_at: string | null;
          error_message: string | null;
          data_in: Json | null;
          data_out: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          automation_id: string;
          external_id?: string | null;
          status: string;
          started_at: string;
          finished_at?: string | null;
          error_message?: string | null;
          data_in?: Json | null;
          data_out?: Json | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          finished_at?: string | null;
          error_message?: string | null;
          data_in?: Json | null;
          data_out?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "execution_logs_automation_id_fkey";
            columns: ["automation_id"];
            isOneToOne: false;
            referencedRelation: "automations";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnostic_reports: {
        Row: {
          id: string;
          profile_id: string;
          triggered_by: "manual" | "scheduled" | "alert";
          overall_health: string;
          most_dangerous: string;
          recommendations: string;
          model_used: string;
          tokens_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          triggered_by: "manual" | "scheduled" | "alert";
          overall_health: string;
          most_dangerous: string;
          recommendations: string;
          model_used: string;
          tokens_used?: number | null;
          created_at?: string;
        };
        Update: {
          overall_health?: string;
          most_dangerous?: string;
          recommendations?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_reports_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "automation_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_schedules: {
        Row: {
          id: string;
          profile_id: string;
          cron_expression: string;
          is_active: boolean;
          last_run_at: string | null;
          next_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          cron_expression?: string;
          is_active?: boolean;
          last_run_at?: string | null;
          next_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          cron_expression?: string;
          is_active?: boolean;
          last_run_at?: string | null;
          next_run_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_schedules_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "automation_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          type:
            | "issue_detected"
            | "credential_expiring"
            | "audit_complete"
            | "connection_error";
          title: string;
          body: string;
          is_read: boolean;
          related_profile_id: string | null;
          related_issue_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          type:
            | "issue_detected"
            | "credential_expiring"
            | "audit_complete"
            | "connection_error";
          title: string;
          body: string;
          is_read?: boolean;
          related_profile_id?: string | null;
          related_issue_id?: string | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_profile_id_fkey";
            columns: ["related_profile_id"];
            isOneToOne: false;
            referencedRelation: "automation_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_issue_id_fkey";
            columns: ["related_issue_id"];
            isOneToOne: false;
            referencedRelation: "automation_issues";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          workspace_id: string;
          channel: "in_app" | "email" | "slack";
          is_enabled: boolean;
          config: Json;
        };
        Insert: {
          user_id: string;
          workspace_id: string;
          channel: "in_app" | "email" | "slack";
          is_enabled?: boolean;
          config?: Json;
        };
        Update: {
          is_enabled?: boolean;
          config?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_preferences_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string | null;
          plan: "free" | "starter" | "pro" | "enterprise";
          status: "active" | "past_due" | "canceled" | "trialing";
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          stripe_customer_id: string;
          stripe_subscription_id?: string | null;
          plan?: "free" | "starter" | "pro" | "enterprise";
          status?: "active" | "past_due" | "canceled" | "trialing";
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_customer_id?: string;
          stripe_subscription_id?: string | null;
          plan?: "free" | "starter" | "pro" | "enterprise";
          status?: "active" | "past_due" | "canceled" | "trialing";
          current_period_start?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
