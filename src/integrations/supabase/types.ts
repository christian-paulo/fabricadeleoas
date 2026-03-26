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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      exercises: {
        Row: {
          created_at: string | null
          equipment: string | null
          exercise_type: string | null
          id: string
          internal_level: string | null
          muscle_group: string | null
          name: string
          target_aesthetic_tag: string | null
          therapeutic_focus: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          equipment?: string | null
          exercise_type?: string | null
          id?: string
          internal_level?: string | null
          muscle_group?: string | null
          name: string
          target_aesthetic_tag?: string | null
          therapeutic_focus?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          equipment?: string | null
          exercise_type?: string | null
          id?: string
          internal_level?: string | null
          muscle_group?: string | null
          name?: string
          target_aesthetic_tag?: string | null
          therapeutic_focus?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      measurements: {
        Row: {
          arm: number | null
          created_at: string | null
          date: string
          hip: number | null
          id: string
          profile_id: string
          thigh: number | null
          waist: number | null
          weight: number | null
        }
        Insert: {
          arm?: number | null
          created_at?: string | null
          date?: string
          hip?: number | null
          id?: string
          profile_id: string
          thigh?: number | null
          waist?: number | null
          weight?: number | null
        }
        Update: {
          arm?: number | null
          created_at?: string | null
          date?: string
          hip?: number | null
          id?: string
          profile_id?: string
          thigh?: number | null
          waist?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          canceled_at: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          goal: string | null
          has_pain: boolean | null
          id: string
          is_subscriber: boolean | null
          medication_feeling: string | null
          onboarding_completed: boolean | null
          pain_location: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          target_area: string | null
          training_experience: string | null
          trial_start_date: string | null
          updated_at: string | null
          uses_medication: boolean | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string | null
          workout_days: number | null
          workout_duration: number | null
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          goal?: string | null
          has_pain?: boolean | null
          id: string
          is_subscriber?: boolean | null
          medication_feeling?: string | null
          onboarding_completed?: boolean | null
          pain_location?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_area?: string | null
          training_experience?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          uses_medication?: boolean | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
          workout_days?: number | null
          workout_duration?: number | null
        }
        Update: {
          canceled_at?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          goal?: string | null
          has_pain?: boolean | null
          id?: string
          is_subscriber?: boolean | null
          medication_feeling?: string | null
          onboarding_completed?: boolean | null
          pain_location?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_area?: string | null
          training_experience?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          uses_medication?: boolean | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
          workout_days?: number | null
          workout_duration?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          feedback_effort: string | null
          id: string
          profile_id: string
          workout_json: Json | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          feedback_effort?: string | null
          id?: string
          profile_id: string
          workout_json?: Json | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          feedback_effort?: string | null
          id?: string
          profile_id?: string
          workout_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_profile_id_fkey"
            columns: ["profile_id"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
