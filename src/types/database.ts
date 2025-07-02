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
  size: string | null
  unit_price: number
  created_by: string
  created_at: string
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
  unit_price: number | null
  discount: number | null
  returned: boolean
  leftover: number | null
  shift: 'morning' | 'night'
  recorded_by: string
  created_at: string
  // Enhanced fields for sales tracking
  bread_type?: BreadType
  recorded_by_user?: User
  total_amount?: number
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
export interface APIResponse<T = any> {
  data?: T
  error?: string
  success: boolean
  message?: string
}

export interface DatabaseOperation<T = any> {
  data: T | null
  error: any
  count?: number
}

// Timezone handling for Nigeria (GMT+1)
export interface TimestampHelper {
  toNigeriaTime: (utcTimestamp: string) => string
  fromNigeriaTime: (localTimestamp: string) => string
  getCurrentShift: () => 'morning' | 'night'
  getShiftStart: (shift: 'morning' | 'night') => string
  getShiftEnd: (shift: 'morning' | 'night') => string
}