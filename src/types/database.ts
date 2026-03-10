// @file src/types/database.ts
// @description Supabase database type definitions for all tables

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          phone: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          phone?: string
          display_name?: string
          avatar_url?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          created_by: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          avatar_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: "admin" | "member"
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: "admin" | "member"
          joined_at?: string
        }
        Update: {
          role?: "admin" | "member"
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      fields: {
        Row: {
          id: string
          group_id: string
          name: string
          address: string | null
          price_per_hour: number
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          address?: string | null
          price_per_hour: number
          created_at?: string
        }
        Update: {
          name?: string
          address?: string | null
          price_per_hour?: number
        }
        Relationships: [
          {
            foreignKeyName: "fields_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ]
      }
      games: {
        Row: {
          id: string
          group_id: string
          field_id: string | null
          date: string
          time: string
          team_size: number
          status: "upcoming" | "teams_set" | "in_progress" | "completed" | "cancelled"
          score_home: number | null
          score_away: number | null
          paid_by: string | null
          cost: number | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          field_id?: string | null
          date: string
          time: string
          team_size?: number
          status?: "upcoming" | "teams_set" | "in_progress" | "completed" | "cancelled"
          score_home?: number | null
          score_away?: number | null
          paid_by?: string | null
          cost?: number | null
          created_by: string
          created_at?: string
        }
        Update: {
          field_id?: string | null
          date?: string
          time?: string
          team_size?: number
          status?: "upcoming" | "teams_set" | "in_progress" | "completed" | "cancelled"
          score_home?: number | null
          score_away?: number | null
          paid_by?: string | null
          cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      game_signups: {
        Row: {
          id: string
          game_id: string
          user_id: string
          status: "confirmed" | "declined" | "maybe"
          signed_up_at: string
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          status?: "confirmed" | "declined" | "maybe"
          signed_up_at?: string
        }
        Update: {
          status?: "confirmed" | "declined" | "maybe"
        }
        Relationships: [
          {
            foreignKeyName: "game_signups_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_signups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      game_teams: {
        Row: {
          id: string
          game_id: string
          user_id: string
          team: "home" | "away"
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          team: "home" | "away"
        }
        Update: {
          team?: "home" | "away"
        }
        Relationships: [
          {
            foreignKeyName: "game_teams_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      game_goals: {
        Row: {
          id: string
          game_id: string
          user_id: string
          count: number
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          count?: number
        }
        Update: {
          count?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_goals_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      player_ratings: {
        Row: {
          id: string
          user_id: string
          group_id: string
          rating: number
          games_played: number
          wins: number
          draws: number
          losses: number
          goals: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          group_id: string
          rating?: number
          games_played?: number
          wins?: number
          draws?: number
          losses?: number
          goals?: number
          updated_at?: string
        }
        Update: {
          rating?: number
          games_played?: number
          wins?: number
          draws?: number
          losses?: number
          goals?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          game_id: string
          user_id: string
          amount: number
          paid: boolean
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          amount: number
          paid?: boolean
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          paid?: boolean
          paid_at?: string | null
          amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
