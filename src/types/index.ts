// ============================================================================
// HOMEBAKE BUSINESS MANAGEMENT TYPES
// ============================================================================

// User and Authentication Types
export interface User {
  id: string;
  name: string;
  role: UserRole;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
}

export type UserRole = "owner" | "manager" | "sales_rep";

export interface UserPreferences {
  temperatureUnit: "celsius" | "fahrenheit";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: "light" | "dark" | "system";
  language: "en" | "es" | "fr";
}

// QR Invitation System
export interface QRInvite {
  id: string;
  token: string;
  role: "manager" | "sales_rep";
  is_used: boolean;
  expires_at: string;
  created_by: string; // FK to users.id (owner)
  created_at: string;
}

// Session Management
export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

// Business Product Types
export interface BreadType {
  id: string;
  name: string;
  size: string | null; // e.g., "400g", "Large", "Small"
  unit_price: number;
  created_by: string; // FK to users.id (owner)
  created_at: string;
}

// Production Management
export interface ProductionLog {
  id: string;
  bread_type_id: string;
  bread_type?: BreadType; // Populated when joining
  quantity: number;
  shift: ShiftType;
  recorded_by: string; // FK to users.id (manager)
  created_at: string;
}

// Sales Management
export interface SalesLog {
  id: string;
  bread_type_id: string;
  bread_type?: BreadType; // Populated when joining
  quantity: number;
  unit_price: number | null; // Actual price sold at
  discount: number | null;
  returned: boolean;
  leftover: number | null; // Bread left unsold
  shift: ShiftType;
  recorded_by: string; // FK to users.id (sales_rep)
  created_at: string;
}

// Shift Management
export type ShiftType = "morning" | "night";

export interface ShiftFeedback {
  id: string;
  user_id: string;
  user?: User; // Populated when joining
  shift: ShiftType;
  note: string | null;
  created_at: string;
}

// Inventory Management
export interface InventoryItem {
  bread_type_id: string;
  bread_type?: BreadType;
  currentStock: number;
  lastUpdated: Date;
  lastProductionDate?: Date;
  lastSaleDate?: Date;
}

// Business Analytics
export interface DailyReport {
  date: string; // YYYY-MM-DD format
  shift: ShiftType;
  totalProduced: number;
  totalSold: number;
  totalRevenue: number;
  totalDiscounts: number;
  totalReturns: number;
  totalLeftover: number;
  breadTypeBreakdown: BreadTypeReport[];
  recorded_by: string;
  created_at: string;
}

export interface BreadTypeReport {
  bread_type_id: string;
  bread_type?: BreadType;
  produced: number;
  sold: number;
  revenue: number;
  leftover: number;
}

export interface BusinessStats {
  totalUsers: number;
  totalBreadTypes: number;
  totalProduction: number;
  totalSales: number;
  totalRevenue: number;
  averageDailySales: number;
  mostPopularBreadType: string;
  bestPerformingShift: ShiftType;
  lastActivityDate?: Date;
}

// Dashboard Widgets
export interface DashboardWidget {
  id: string;
  type: "chart" | "metric" | "list" | "status";
  title: string;
  data: Record<string, unknown>;
  size: "small" | "medium" | "large";
  position: { x: number; y: number };
  isVisible: boolean;
  refreshInterval?: number; // in seconds
}

// Navigation and UI
export interface NavigationItem {
  name: string;
  href: string;
  icon?: string;
  children?: NavigationItem[];
  badge?: string | number;
  isActive?: boolean;
  requiredRole?: UserRole[];
}

// Form and Validation Types
export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "number" | "select" | "textarea" | "checkbox" | "radio";
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Real-time Updates
export interface RealtimeUpdate {
  type: "production" | "sale" | "inventory" | "user";
  action: "insert" | "update" | "delete";
  table: string;
  record: Record<string, unknown>;
  timestamp: Date;
}

// Error Handling
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// Notifications and Alerts
export interface Alert {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  isRead: boolean;
  created_at: string;
  expires_at?: string;
}

// Audit Logging
export interface AuditLog {
  id: string;
  user_id: string;
  user?: User;
  action: string;
  table: string;
  record_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  today_revenue: number;
  today_production: number;
  active_batches: number;
  low_stock_items: number;
  staff_online: number;
  shift_status: 'morning' | 'night';
  last_updated: string;
}

// Production Entry
export interface ProductionEntry {
  bread_type_id: string;
  quantity: number;
  shift: 'morning' | 'night';
}

// Sales Form Data
export interface SalesFormData {
  entries: Array<{
    bread_type_id: string;
    quantity: number;
    unit_price?: number;
    discount?: number;
    returned?: boolean;
    leftover?: number;
    shift: 'morning' | 'night';
    recorded_by: string;
  }>;
}

// Batch Management
export interface Batch {
  id: string;
  bread_type_id: string;
  batch_number: string;
  start_time: string;
  end_time: string | null;
  target_quantity: number;
  actual_quantity: number;
  status: "active" | "completed" | "cancelled";
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Database types for compatibility
export type UserDB = User;
export type QRInviteDB = QRInvite; 