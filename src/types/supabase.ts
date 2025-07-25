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
      batches: {
        Row: {
          id: string
          bread_type_id: string
          batch_number: string
          start_time: string
          end_time: string | null
          target_quantity: number
          actual_quantity: number
          status: 'active' | 'completed' | 'cancelled'
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bread_type_id: string
          batch_number: string
          start_time?: string
          end_time?: string | null
          target_quantity: number
          actual_quantity?: number
          status?: 'active' | 'completed' | 'cancelled'
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bread_type_id?: string
          batch_number?: string
          start_time?: string
          end_time?: string | null
          target_quantity?: number
          actual_quantity?: number
          status?: 'active' | 'completed' | 'cancelled'
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      all_batches: {
        Row: {
          id: string
          bread_type_id: string
          batch_number: string
          start_time: string
          end_time: string | null
          target_quantity: number
          actual_quantity: number
          status: 'active' | 'completed' | 'cancelled'
          shift: 'morning' | 'night'
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bread_type_id: string
          batch_number: string
          start_time?: string
          end_time?: string | null
          target_quantity: number
          actual_quantity?: number
          status?: 'active' | 'completed' | 'cancelled'
          shift: 'morning' | 'night'
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bread_type_id?: string
          batch_number?: string
          start_time?: string
          end_time?: string | null
          target_quantity?: number
          actual_quantity?: number
          status?: 'active' | 'completed' | 'cancelled'
          shift?: 'morning' | 'night'
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "all_batches_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "all_batches_created_by_fkey"
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
      remaining_bread: {
        Row: {
          id: string
          shift: string
          bread_type: string
          bread_type_id: string | null
          quantity: number
          recorded_by: string | null
          created_at: string
          updated_at: string
          unit_price: number
          total_value: number
        }
        Insert: {
          id?: string
          shift: string
          bread_type: string
          bread_type_id?: string | null
          quantity: number
          recorded_by?: string | null
          created_at?: string
          updated_at?: string
          unit_price: number
          total_value?: number
        }
        Update: {
          id?: string
          shift?: string
          bread_type?: string
          bread_type_id?: string | null
          quantity?: number
          recorded_by?: string | null
          created_at?: string
          updated_at?: string
          unit_price?: number
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remaining_bread_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      shift_reports: {
        Row: {
          id: string
          user_id: string
          shift: 'morning' | 'night'
          report_date: string
          total_revenue: number
          total_items_sold: number
          total_remaining: number
          feedback: string | null
          sales_data: any[]
          remaining_breads: any[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shift: 'morning' | 'night'
          report_date?: string
          total_revenue: number
          total_items_sold: number
          total_remaining: number
          feedback?: string | null
          sales_data?: any[]
          remaining_breads?: any[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shift?: 'morning' | 'night'
          report_date?: string
          total_revenue?: number
          total_items_sold?: number
          total_remaining?: number
          feedback?: string | null
          sales_data?: any[]
          remaining_breads?: any[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_reports_user_id_fkey"
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
      create_batch_with_unique_number: {
        Args: {
          p_bread_type_id: string;
          p_target_quantity: number;
          p_notes: string | null;
          p_shift: 'morning' | 'night';
          p_created_by: string;
          p_actual_quantity?: number | null;
          p_start_time?: string | null;
          p_status?: 'active' | 'completed' | 'cancelled';
        };
        Returns: {
          id: string;
          bread_type_id: string;
          batch_number: string;
          start_time: string;
          end_time: string | null;
          target_quantity: number;
          actual_quantity: number;
          status: 'active' | 'completed' | 'cancelled';
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          shift: 'morning' | 'night';
        }[];
      };
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 