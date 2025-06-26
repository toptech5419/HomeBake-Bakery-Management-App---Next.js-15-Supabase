export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          role: 'owner' | 'manager' | 'sales_rep'
          created_by: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          role: 'owner' | 'manager' | 'sales_rep'
          created_by?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: 'owner' | 'manager' | 'sales_rep'
          created_by?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      qr_invites: {
        Row: {
          id: string
          token: string
          role: 'manager' | 'sales_rep'
          is_used: boolean
          expires_at: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          token: string
          role: 'manager' | 'sales_rep'
          is_used?: boolean
          expires_at: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          role?: 'manager' | 'sales_rep'
          is_used?: boolean
          expires_at?: string
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      bread_types: {
        Row: {
          id: string
          name: string
          size: string | null
          unit_price: number
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          size?: string | null
          unit_price: number
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          size?: string | null
          unit_price?: number
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bread_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      production_logs: {
        Row: {
          id: string
          bread_type_id: string
          quantity: number
          shift: 'morning' | 'night'
          recorded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          bread_type_id: string
          quantity: number
          shift: 'morning' | 'night'
          recorded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          bread_type_id?: string
          quantity?: number
          shift?: 'morning' | 'night'
          recorded_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sales_logs: {
        Row: {
          id: string
          bread_type_id: string
          quantity: number
          unit_price: number | null
          discount: number | null
          returned: boolean
          leftover: number | null
          shift: 'morning' | 'night'
          recorded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          bread_type_id: string
          quantity: number
          unit_price?: number | null
          discount?: number | null
          returned?: boolean
          leftover?: number | null
          shift: 'morning' | 'night'
          recorded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          bread_type_id?: string
          quantity?: number
          unit_price?: number | null
          discount?: number | null
          returned?: boolean
          leftover?: number | null
          shift?: 'morning' | 'night'
          recorded_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      shift_feedback: {
        Row: {
          id: string
          user_id: string
          shift: 'morning' | 'night'
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shift: 'morning' | 'night'
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shift?: 'morning' | 'night'
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 