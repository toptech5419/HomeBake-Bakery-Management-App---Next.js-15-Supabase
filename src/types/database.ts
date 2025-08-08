// Re-export Database type from supabase.ts for cleaner imports
export type { Database, Json } from './supabase'

// Enhanced types for production features
export interface User {
  id: string
  name: string
  role: 'owner' | 'manager' | 'sales_rep'
  created_by: string | null
  is_active: boolean
  created_at: string
}

export interface BreadType {
  id: string
  name: string
  size?: string | null | undefined
  unit_price: number
  created_by?: string | null | undefined
  created_at: string
  is_active?: boolean
}

export interface Activity {
  id: string
  user_id: string
  user_name: string
  user_role: 'manager' | 'sales_rep'
  activity_type: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created'
  shift?: 'morning' | 'night'
  message: string
  metadata: Record<string, unknown>
  created_at: string
}

// Alternative BreadType for database operations
export interface BreadTypeDB {
  id: string
  name: string
  size: string | null
  unit_price: number
  created_by: string | null
  created_at: string
}

// Available Stock table
export interface AvailableStock {
  id: string
  bread_type_id: string
  bread_type_name: string
  quantity: number
  unit_price: number
  last_updated: string
  created_at: string
  updated_at: string
}

export interface ProductionBatch {
  id: string
  bread_type_id: string
  quantity: number
  shift: 'morning' | 'night'
  recorded_by: string
  created_at: string
  // Enhanced fields for batch tracking
  bread_type?: BreadType
  recorded_by_user?: User
}

export interface SalesLog {
  id: string
  bread_type_id: string
  quantity: number
  unit_price?: number | null
  discount?: number | null
  returned: boolean
  leftovers?: number | null
  shift: 'morning' | 'night'
  recorded_by: string
  created_at: string
  updated_at?: string
  // Enhanced fields for sales tracking
  bread_type?: BreadType
  bread_types?: BreadType
  recorded_by_user?: User
  total_amount?: number
}

// Sales Log with joined bread type
export interface SalesLogWithBreadType extends SalesLog {
  bread_types: BreadType
}

// Production log interfaces
export interface ProductionLog {
  id: string
  bread_type_id: string
  quantity: number
  shift: 'morning' | 'night'
  recorded_by: string
  created_at: string
  bread_types?: BreadType
}

export interface ProductionLogWithBreadType extends ProductionLog {
  bread_types: BreadType
}

export interface ShiftFeedback {
  id: string
  user_id: string
  shift: 'morning' | 'night'
  note: string | null
  created_at: string
  // Enhanced fields
  user?: User
}

// Production-ready inventory calculation types
export interface InventoryItem {
  bread_type_id: string
  bread_type: BreadType
  total_produced: number
  total_sold: number
  available: number
  reserved: number
  leftover_from_previous: number
  shift: 'morning' | 'night'
  last_updated: string
}

// Real-time dashboard metrics
export interface DashboardMetrics {
  today_revenue: number
  today_production: number
  active_batches: number
  low_stock_items: number
  staff_online: number
  shift_status: 'morning' | 'night'
  last_updated: string
}

// Batch production tracking
export interface BatchStatus {
  id: string
  batch_number: number
  bread_type: BreadType
  quantity: number
  start_time: string
  end_time?: string
  status: 'planning' | 'in-progress' | 'completed' | 'quality-check'
  shift: 'morning' | 'night'
  manager: User
  notes?: string
  progress_percentage: number
}

// Error handling types
export interface APIResponse<T = unknown> {
  data?: T
  error?: string
  success: boolean
  message?: string
}

export interface DatabaseOperation<T = unknown> {
  data: T | null
  error: Error | null
  count?: number
}

// Report data interface
export interface ReportData {
  totalSales: number
  totalItems: number
  totalRemaining: number
  salesByType: Array<{
    breadType: string
    quantity: number
    revenue: number
  }>
  remainingByType: Array<{
    breadType: string
    quantity: number
  }>
  feedback?: string
}

// Shift type
export type ShiftType = 'morning' | 'night'

// User with profile
export interface UserWithProfile {
  id: string
  profile: {
    id: string
    name: string
    role: 'owner' | 'manager' | 'sales_rep'
    created_by: string | null
    is_active: boolean
    created_at: string
  }
}

// Push notification preferences
export interface PushNotificationPreferences {
  id: string
  user_id: string
  enabled: boolean
  endpoint?: string | null
  p256dh_key?: string | null
  auth_key?: string | null
  user_agent?: string | null
  created_at: string
  updated_at: string
}

// Timezone handling for Nigeria (GMT+1)
export interface TimestampHelper {
  toNigeriaTime: (utcTimestamp: string) => string
  fromNigeriaTime: (localTimestamp: string) => string
  getCurrentShift: () => 'morning' | 'night'
  getShiftStart: (shift: 'morning' | 'night') => string
  getShiftEnd: (shift: 'morning' | 'night') => string
}