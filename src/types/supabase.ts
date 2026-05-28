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
      activities: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          shift: string | null
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          shift?: string | null
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          shift?: string | null
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      all_batches: {
        Row: {
          actual_quantity: number | null
          batch_number: string
          bread_type_id: string
          created_at: string | null
          created_by: string
          end_time: string | null
          id: string
          notes: string | null
          shift: string
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_quantity?: number | null
          batch_number: string
          bread_type_id: string
          created_at?: string | null
          created_by: string
          end_time?: string | null
          id?: string
          notes?: string | null
          shift: string
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_quantity?: number | null
          batch_number?: string
          bread_type_id?: string
          created_at?: string | null
          created_by?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          shift?: string
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "all_batches_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "active_bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "all_batches_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "all_batches_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_realtime"
            referencedColumns: ["bread_type_id"]
          },
          {
            foreignKeyName: "all_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      available_stock: {
        Row: {
          bread_type_id: string
          bread_type_name: string
          created_at: string | null
          id: string
          last_updated: string | null
          quantity: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          bread_type_id: string
          bread_type_name: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          quantity?: number
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          bread_type_id?: string
          bread_type_name?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          quantity?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "available_stock_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "active_bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "available_stock_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "available_stock_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "inventory_realtime"
            referencedColumns: ["bread_type_id"]
          },
        ]
      }
      batches: {
        Row: {
          actual_quantity: number | null
          batch_number: string
          bread_type_id: string
          created_at: string | null
          created_by: string
          end_time: string | null
          id: string
          notes: string | null
          shift: string
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_quantity?: number | null
          batch_number: string
          bread_type_id: string
          created_at?: string | null
          created_by: string
          end_time?: string | null
          id?: string
          notes?: string | null
          shift?: string
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_quantity?: number | null
          batch_number?: string
          bread_type_id?: string
          created_at?: string | null
          created_by?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          shift?: string
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "active_bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_realtime"
            referencedColumns: ["bread_type_id"]
          },
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bread_type_sync_log: {
        Row: {
          bread_type_id: string
          error_message: string | null
          id: string
          new_name: string | null
          old_name: string | null
          success: boolean | null
          sync_timestamp: string | null
          sync_type: string | null
          tables_affected: string[] | null
          total_rows_updated: number | null
        }
        Insert: {
          bread_type_id: string
          error_message?: string | null
          id?: string
          new_name?: string | null
          old_name?: string | null
          success?: boolean | null
          sync_timestamp?: string | null
          sync_type?: string | null
          tables_affected?: string[] | null
          total_rows_updated?: number | null
        }
        Update: {
          bread_type_id?: string
          error_message?: string | null
          id?: string
          new_name?: string | null
          old_name?: string | null
          success?: boolean | null
          sync_timestamp?: string | null
          sync_type?: string | null
          tables_affected?: string[] | null
          total_rows_updated?: number | null
        }
        Relationships: []
      }
      bread_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          size: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          size?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          size?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bread_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_low_stock_counts: {
        Row: {
          count_date: string
          created_at: string | null
          id: string
          last_updated_morning: string | null
          last_updated_night: string | null
          morning_shift_count: number
          night_shift_count: number
          total_count: number | null
          updated_at: string | null
        }
        Insert: {
          count_date?: string
          created_at?: string | null
          id?: string
          last_updated_morning?: string | null
          last_updated_night?: string | null
          morning_shift_count?: number
          night_shift_count?: number
          total_count?: number | null
          updated_at?: string | null
        }
        Update: {
          count_date?: string
          created_at?: string | null
          id?: string
          last_updated_morning?: string | null
          last_updated_night?: string | null
          morning_shift_count?: number
          night_shift_count?: number
          total_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          bread_type_id: string
          id: string
          last_updated: string | null
          quantity: number
        }
        Insert: {
          bread_type_id: string
          id?: string
          last_updated?: string | null
          quantity?: number
        }
        Update: {
          bread_type_id?: string
          id?: string
          last_updated?: string | null
          quantity?: number
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          bread_type_id: string
          created_at: string | null
          id: string
          notes: string | null
          quantity_change: number
          reason: string
          reference_id: string | null
          shift: string | null
          user_id: string
        }
        Insert: {
          bread_type_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          quantity_change: number
          reason: string
          reference_id?: string | null
          shift?: string | null
          user_id: string
        }
        Update: {
          bread_type_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          quantity_change?: number
          reason?: string
          reference_id?: string | null
          shift?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          bread_type_id: string
          created_at: string | null
          id: string
          quantity: number
          recorded_by: string
          shift: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          bread_type_id: string
          created_at?: string | null
          id?: string
          quantity: number
          recorded_by: string
          shift: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          bread_type_id?: string
          created_at?: string | null
          id?: string
          quantity?: number
          recorded_by?: string
          shift?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "active_bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_realtime"
            referencedColumns: ["bread_type_id"]
          },
          {
            foreignKeyName: "production_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          is_active?: boolean | null
          name?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          role?: string
        }
        Relationships: []
      }
      push_notification_preferences: {
        Row: {
          auth_key: string | null
          created_at: string | null
          enabled: boolean
          endpoint: string | null
          id: string
          p256dh_key: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key?: string | null
          created_at?: string | null
          enabled?: boolean
          endpoint?: string | null
          id?: string
          p256dh_key?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string | null
          created_at?: string | null
          enabled?: boolean
          endpoint?: string | null
          id?: string
          p256dh_key?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qr_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          role: string
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          role: string
          token: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      remaining_bread: {
        Row: {
          bread_type: string
          bread_type_id: string
          created_at: string | null
          id: string
          quantity: number
          record_date: string
          recorded_by: string
          shift: string
          total_value: number | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          bread_type: string
          bread_type_id: string
          created_at?: string | null
          id?: string
          quantity: number
          record_date?: string
          recorded_by: string
          shift: string
          total_value?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          bread_type?: string
          bread_type_id?: string
          created_at?: string | null
          id?: string
          quantity?: number
          record_date?: string
          recorded_by?: string
          shift?: string
          total_value?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "active_bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "inventory_realtime"
            referencedColumns: ["bread_type_id"]
          },
          {
            foreignKeyName: "remaining_bread_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_logs: {
        Row: {
          bread_type_id: string
          created_at: string | null
          discount: number | null
          id: string
          leftovers: number | null
          quantity: number
          recorded_by: string
          returned: boolean | null
          shift: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          bread_type_id: string
          created_at?: string | null
          discount?: number | null
          id?: string
          leftovers?: number | null
          quantity: number
          recorded_by: string
          returned?: boolean | null
          shift: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          bread_type_id?: string
          created_at?: string | null
          discount?: number | null
          id?: string
          leftovers?: number | null
          quantity?: number
          recorded_by?: string
          returned?: boolean | null
          shift?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "active_bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_realtime"
            referencedColumns: ["bread_type_id"]
          },
          {
            foreignKeyName: "sales_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_feedback: {
        Row: {
          created_at: string | null
          id: string
          note: string | null
          shift: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note?: string | null
          shift: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string | null
          shift?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handovers: {
        Row: {
          completed_batches: number | null
          created_at: string | null
          from_shift: string
          handover_date: string
          id: string
          manager_id: string
          notes: string | null
          pending_batches: number | null
          quality_issues: string[] | null
          to_shift: string
          total_production: number | null
        }
        Insert: {
          completed_batches?: number | null
          created_at?: string | null
          from_shift: string
          handover_date?: string
          id?: string
          manager_id: string
          notes?: string | null
          pending_batches?: number | null
          quality_issues?: string[] | null
          to_shift: string
          total_production?: number | null
        }
        Update: {
          completed_batches?: number | null
          created_at?: string | null
          from_shift?: string
          handover_date?: string
          id?: string
          manager_id?: string
          notes?: string | null
          pending_batches?: number | null
          quality_issues?: string[] | null
          to_shift?: string
          total_production?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_handovers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_reports: {
        Row: {
          created_at: string | null
          feedback: string | null
          id: string
          remaining_breads: Json
          report_date: string
          sales_data: Json
          shift: string
          total_items_sold: number
          total_remaining: number
          total_revenue: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          remaining_breads?: Json
          report_date?: string
          sales_data?: Json
          shift: string
          total_items_sold?: number
          total_remaining?: number
          total_revenue?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          remaining_breads?: Json
          report_date?: string
          sales_data?: Json
          shift?: string
          total_items_sold?: number
          total_remaining?: number
          total_revenue?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_management_audit: {
        Row: {
          created_at: string | null
          dependencies_affected: Json | null
          error_message: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          operation: string
          performed_by: string
          performed_by_name: string
          success: boolean
          target_user_id: string
          target_user_name: string
          target_user_role: string
        }
        Insert: {
          created_at?: string | null
          dependencies_affected?: Json | null
          error_message?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          performed_by: string
          performed_by_name: string
          success?: boolean
          target_user_id: string
          target_user_name: string
          target_user_role: string
        }
        Update: {
          created_at?: string | null
          dependencies_affected?: Json | null
          error_message?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          performed_by?: string
          performed_by_name?: string
          success?: boolean
          target_user_id?: string
          target_user_name?: string
          target_user_role?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          role: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          role: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_bread_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          size: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          size?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          size?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bread_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_realtime: {
        Row: {
          available_stock_quantity: number | null
          bread_type_id: string | null
          bread_type_name: string | null
          calculated_at: string | null
          current_inventory_value: number | null
          current_quantity: number | null
          debug_data: Json | null
          production_date: string | null
          sell_through_rate: number | null
          shift: string | null
          stock_last_updated: string | null
          stock_level: string | null
          total_produced: number | null
          total_production_value: number | null
          total_returned: number | null
          total_sales_value: number | null
          total_sold: number | null
          total_transactions: number | null
          unit_price: number | null
        }
        Relationships: []
      }
      materialized_view_stats: {
        Row: {
          definition: string | null
          hasindexes: boolean | null
          ispopulated: boolean | null
          schemaname: unknown
          view_name: unknown
        }
        Relationships: []
      }
      remaining_bread_monetary_totals: {
        Row: {
          bread_type_id: string | null
          bread_type_name: string | null
          last_updated: string | null
          total_remaining: number | null
        }
        Relationships: [
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "active_bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "inventory_realtime"
            referencedColumns: ["bread_type_id"]
          },
        ]
      }
      remaining_bread_totals: {
        Row: {
          bread_type_id: string | null
          bread_type_name: string | null
          last_updated: string | null
          total_monetary_value: number | null
          total_quantity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "active_bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remaining_bread_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: true
            referencedRelation: "inventory_realtime"
            referencedColumns: ["bread_type_id"]
          },
        ]
      }
      sales_duplicates_view: {
        Row: {
          bread_type_id: string | null
          bread_type_name: string | null
          first_recorded: string | null
          last_recorded: string | null
          quantity: number | null
          record_count: number | null
          recorded_by: string | null
          recorded_by_name: string | null
          sale_date: string | null
          shift: string | null
          total_quantity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "active_bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "bread_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_logs_bread_type_id_fkey"
            columns: ["bread_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_realtime"
            referencedColumns: ["bread_type_id"]
          },
          {
            foreignKeyName: "sales_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_statistics_realtime: {
        Row: {
          active_batches: number | null
          avg_batch_duration_hours: number | null
          bread_types_produced: number | null
          bread_types_sold: number | null
          calculated_at: string | null
          cancellation_rate: number | null
          cancelled_batches: number | null
          revenue_per_unit_produced: number | null
          sell_through_percentage: number | null
          shift: string | null
          shift_date: string | null
          total_batches: number | null
          total_production: number | null
          total_returned: number | null
          total_revenue: number | null
          total_sold: number | null
          total_transactions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_update_low_stock_counts: { Args: never; Returns: undefined }
      begin_transaction: { Args: never; Returns: undefined }
      check_batch_duplicate: {
        Args: {
          p_batch_number: string
          p_bread_type_id: string
          p_check_date?: string
          p_created_by: string
          p_shift: string
        }
        Returns: boolean
      }
      check_bread_type_consistency: { Args: never; Returns: Json }
      check_user_dependencies: {
        Args: { user_uuid: string }
        Returns: {
          dependency_count: number
          table_name: string
        }[]
      }
      clean_sales_duplicates: { Args: never; Returns: number }
      cleanup_expired_qr_invites: { Args: never; Returns: undefined }
      cleanup_old_shift_statistics: { Args: never; Returns: undefined }
      commit_transaction: { Args: never; Returns: undefined }
      create_batch_with_unique_number: {
        Args: {
          p_actual_quantity: number
          p_bread_type_id: string
          p_created_by: string
          p_notes: string
          p_shift: string
          p_start_time?: string
          p_status?: string
        }
        Returns: {
          actual_quantity: number
          batch_number: string
          bread_type_id: string
          created_at: string
          created_by: string
          end_time: string
          id: string
          notes: string
          shift: string
          start_time: string
          status: string
          updated_at: string
        }[]
      }
      create_user_atomic: {
        Args: {
          input_created_by?: string
          input_email: string
          input_name: string
          input_role: string
          input_user_id: string
        }
        Returns: Json
      }
      create_user_batch: {
        Args: {
          p_actual_quantity: number
          p_bread_type_id: string
          p_notes?: string
          p_shift: string
          p_user_id?: string
        }
        Returns: string
      }
      create_user_sales_log: {
        Args: {
          p_bread_type_id: string
          p_discount?: number
          p_leftover?: number
          p_quantity: number
          p_returned?: boolean
          p_shift: string
          p_unit_price?: number
          p_user_id?: string
        }
        Returns: string
      }
      create_user_with_invite: {
        Args: {
          input_created_by?: string
          input_email: string
          input_invite_token: string
          input_name: string
          input_role: string
          input_user_id: string
        }
        Returns: Json
      }
      debug_sales_rep_auth: { Args: never; Returns: Json }
      delete_bread_type_with_bypass: { Args: { p_id: string }; Returns: Json }
      delete_user_batches: {
        Args: { p_shift?: string; p_user_id: string }
        Returns: number
      }
      fix_all_bread_type_names: { Args: never; Returns: Json }
      get_app_user_role: { Args: never; Returns: string }
      get_current_shift_nigeria: { Args: never; Returns: string }
      get_daily_low_stock_count: { Args: { p_date?: string }; Returns: number }
      get_user_dependencies_count: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_user_role: { Args: { input_user_id: string }; Returns: string }
      invalidate_user_sessions: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      is_active_owner: { Args: { user_id?: string }; Returns: boolean }
      is_active_user: { Args: { user_id?: string }; Returns: boolean }
      is_manager_or_above: { Args: { user_id?: string }; Returns: boolean }
      is_manager_or_owner: { Args: { user_uuid?: string }; Returns: boolean }
      is_owner: { Args: { user_uuid?: string }; Returns: boolean }
      refresh_low_stock_counts_now: {
        Args: never
        Returns: {
          date_updated: string
          morning_count: number
          night_count: number
          total_count: number
        }[]
      }
      reset_daily_low_stock_counts: { Args: never; Returns: undefined }
      rollback_transaction: { Args: never; Returns: undefined }
      safe_delete_user: {
        Args: {
          performing_user_id: string
          performing_user_name: string
          target_user_id: string
        }
        Returns: {
          deletion_type: string
          dependencies_found: number
          message: string
          success: boolean
        }[]
      }
      update_bread_type_bypass_triggers: {
        Args: {
          p_id: string
          p_is_active?: boolean
          p_name?: string
          p_size?: string
          p_unit_price?: number
        }
        Returns: {
          id: string
          is_active: boolean
          name: string
          unit_price: number
        }[]
      }
      update_bread_type_safe: {
        Args: {
          p_bread_type_id: string
          p_new_is_active: boolean
          p_new_name: string
          p_new_size: string
          p_new_unit_price: number
        }
        Returns: string
      }
      update_bread_type_with_manual_refresh: {
        Args: {
          p_id: string
          p_is_active?: boolean
          p_name?: string
          p_size?: string
          p_unit_price?: number
        }
        Returns: {
          id: string
          is_active: boolean
          name: string
          unit_price: number
        }[]
      }
      update_daily_low_stock_count: {
        Args: { p_count: number; p_date?: string; p_shift: string }
        Returns: undefined
      }
      update_remaining_bread_func: {
        Args: {
          p_bread_type_id: string
          p_quantity: number
          p_recorded_by: string
          p_shift: string
        }
        Returns: undefined
      }
      update_sales_quantity: {
        Args: {
          p_bread_type_id: string
          p_quantity: number
          p_recorded_by: string
          p_shift: string
        }
        Returns: boolean
      }
      upsert_remaining_bread: {
        Args: {
          p_bread_type: string
          p_bread_type_id: string
          p_quantity: number
          p_record_date: string
          p_recorded_by: string
          p_shift: string
          p_unit_price: number
        }
        Returns: Json
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
