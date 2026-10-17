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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      fitness_onboarding_profiles: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_profiles: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string
          experience_level: string | null
          goal: string
          height_cm: number | null
          id: string
          avatar_path: string | null
          physical_limitations: string | null
          preferences: string | null
          primary_goal: string | null
          profile_completed: boolean
          training_location: string | null
          updated_at: string
          username: string
          weekly_frequency: number | null
          weight_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email: string
          experience_level?: string | null
          goal?: string
          height_cm?: number | null
          id: string
          avatar_path?: string | null
          physical_limitations?: string | null
          preferences?: string | null
          primary_goal?: string | null
          profile_completed?: boolean
          training_location?: string | null
          updated_at?: string
          username: string
          weekly_frequency?: number | null
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string
          experience_level?: string | null
          goal?: string
          height_cm?: number | null
          id?: string
          avatar_path?: string | null
          physical_limitations?: string | null
          preferences?: string | null
          primary_goal?: string | null
          profile_completed?: boolean
          training_location?: string | null
          updated_at?: string
          username?: string
          weekly_frequency?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      fitness_progress: {
        Row: {
          completed_exercises: Json
          goal: string
          updated_at: string
          user_id: string
          water_glasses: number
        }
        Insert: {
          completed_exercises?: Json
          goal?: string
          updated_at?: string
          user_id: string
          water_glasses?: number
        }
        Update: {
          completed_exercises?: Json
          goal?: string
          updated_at?: string
          user_id?: string
          water_glasses?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_admin?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          background_color: string
          banner_url: string | null
          brand_name: string
          footer_text: string
          hero_badge: string
          hero_description: string
          hero_primary_button: string
          hero_secondary_button: string
          hero_title: string
          how_title: string
          id: boolean
          nav_how: string
          nav_security: string
          nav_simulator: string
          primary_color: string
          result_disclaimer: string
          result_label: string
          security_description: string
          security_title: string
          simulator_description: string
          simulator_note: string
          simulator_title: string
          step1_description: string
          step1_title: string
          step2_description: string
          step2_title: string
          step3_description: string
          step3_title: string
          surface_color: string
          text_color: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          banner_url?: string | null
          brand_name?: string
          footer_text?: string
          hero_badge?: string
          hero_description?: string
          hero_primary_button?: string
          hero_secondary_button?: string
          hero_title?: string
          how_title?: string
          id?: boolean
          nav_how?: string
          nav_security?: string
          nav_simulator?: string
          primary_color?: string
          result_disclaimer?: string
          result_label?: string
          security_description?: string
          security_title?: string
          simulator_description?: string
          simulator_note?: string
          simulator_title?: string
          step1_description?: string
          step1_title?: string
          step2_description?: string
          step2_title?: string
          step3_description?: string
          step3_title?: string
          surface_color?: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          banner_url?: string | null
          brand_name?: string
          footer_text?: string
          hero_badge?: string
          hero_description?: string
          hero_primary_button?: string
          hero_secondary_button?: string
          hero_title?: string
          how_title?: string
          id?: boolean
          nav_how?: string
          nav_security?: string
          nav_simulator?: string
          primary_color?: string
          result_disclaimer?: string
          result_label?: string
          security_description?: string
          security_title?: string
          simulator_description?: string
          simulator_note?: string
          simulator_title?: string
          step1_description?: string
          step1_title?: string
          step2_description?: string
          step2_title?: string
          step3_description?: string
          step3_title?: string
          surface_color?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      vibra_admin_audit: {
        Row: {
          created_at: string
          detail: Json
          event: string
          id: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          event: string
          id?: never
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          event?: string
          id?: never
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      vibra_admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          last_seen_at: string
          revoked_at: string | null
          session_id: string
          user_agent_hash: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          last_seen_at?: string
          revoked_at?: string | null
          session_id: string
          user_agent_hash?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          last_seen_at?: string
          revoked_at?: string | null
          session_id?: string
          user_agent_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vibra_admins: {
        Row: {
          granted_at: string
          granted_by: string
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vibra_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          paid_at: string | null
          plan_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          paid_at?: string | null
          plan_id: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          paid_at?: string | null
          plan_id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
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
      is_admin: { Args: never; Returns: boolean }
      is_fitness_admin: { Args: never; Returns: boolean }
      update_own_fitness_onboarding_answers: {
        Args: { p_expected_updated_at: string; p_patch: Json }
        Returns: string
      }
      vibra_claim_admin_session: {
        Args: {
          p_expires_at: string
          p_session_id: string
          p_user_agent_hash?: string
          p_user_id: string
        }
        Returns: Json
      }
      vibra_has_active_subscription: { Args: never; Returns: boolean }
      vibra_is_current_admin: { Args: never; Returns: boolean }
      vibra_release_admin_session: {
        Args: { p_session_id: string; p_user_id: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
