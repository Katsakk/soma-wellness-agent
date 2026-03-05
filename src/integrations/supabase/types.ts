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
      agent_memory: {
        Row: {
          category: string | null
          created_at: string
          fact: string
          id: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          fact: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          fact?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          age: number | null
          created_at: string
          current_weight: number | null
          exercise_days_per_week: number | null
          gender: string | null
          goal_type: string
          height: number | null
          id: string
          is_active: boolean | null
          target_calories: number | null
          target_carbs: number | null
          target_fats: number | null
          target_protein: number | null
          target_weight: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          current_weight?: number | null
          exercise_days_per_week?: number | null
          gender?: string | null
          goal_type: string
          height?: number | null
          id?: string
          is_active?: boolean | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          target_weight?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          current_weight?: number | null
          exercise_days_per_week?: number | null
          gender?: string | null
          goal_type?: string
          height?: number | null
          id?: string
          is_active?: boolean | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          target_weight?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          provider: string
          refresh_token: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string
          fats: number | null
          id: string
          meal_time: string
          name: string
          notes: string | null
          protein: number | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fats?: number | null
          id?: string
          meal_time?: string
          name: string
          notes?: string | null
          protein?: number | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fats?: number | null
          id?: string
          meal_time?: string
          name?: string
          notes?: string | null
          protein?: number | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      preferences: {
        Row: {
          created_at: string
          dietary_preferences: string[] | null
          id: string
          units: string | null
          updated_at: string
          user_id: string
          workout_preferences: string[] | null
        }
        Insert: {
          created_at?: string
          dietary_preferences?: string[] | null
          id?: string
          units?: string | null
          updated_at?: string
          user_id: string
          workout_preferences?: string[] | null
        }
        Update: {
          created_at?: string
          dietary_preferences?: string[] | null
          id?: string
          units?: string | null
          updated_at?: string
          user_id?: string
          workout_preferences?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          created_at: string
          end_time: string | null
          event_type: string
          id: string
          metadata: Json | null
          source: string
          start_time: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          source?: string
          start_time: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          source?: string
          start_time?: string
          title?: string | null
          user_id?: string
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
          calories_burned: number | null
          completed_at: string | null
          created_at: string
          duration: number | null
          exercises: Json | null
          id: string
          name: string
          source: string | null
          updated_at: string
          user_id: string
          workout_type: string | null
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          exercises?: Json | null
          id?: string
          name: string
          source?: string | null
          updated_at?: string
          user_id: string
          workout_type?: string | null
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          exercises?: Json | null
          id?: string
          name?: string
          source?: string | null
          updated_at?: string
          user_id?: string
          workout_type?: string | null
        }
        Relationships: []
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
