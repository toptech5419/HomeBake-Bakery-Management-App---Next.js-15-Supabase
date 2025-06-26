// ============================================================================
// HOMEBAKE BUSINESS MANAGEMENT TYPES
// ============================================================================

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  createdBy?: string; // FK to users.id (owner only)
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
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
  isUsed: boolean;
  expiresAt: Date;
  createdBy: string; // FK to users.id (owner)
  createdAt: Date;
}

// Session Management
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

// Business Product Types
export interface BreadType {
  id: string;
  name: string;
  size?: string; // e.g., "400g", "Large", "Small"
  unit_price: number;
  createdBy: string; // FK to users.id (owner)
  createdAt: Date;
  updatedAt?: Date;
  isActive: boolean;
}

// Production Management
export interface ProductionLog {
  id: string;
  breadTypeId: string;
  breadType?: BreadType; // Populated when joining
  quantity: number;
  shift: ShiftType;
  recordedBy: string; // FK to users.id (manager)
  createdAt: Date;
}

// Sales Management
export interface SalesLog {
  id: string;
  breadTypeId: string;
  breadType?: BreadType; // Populated when joining
  quantity: number;
  unitPrice?: number; // Actual price sold at
  discount?: number;
  returned: boolean;
  leftover?: number; // Bread left unsold
  shift: ShiftType;
  recordedBy: string; // FK to users.id (sales_rep)
  createdAt: Date;
}

// Shift Management
export type ShiftType = "morning" | "night";

export interface ShiftFeedback {
  id: string;
  userId: string;
  user?: User; // Populated when joining
  shift: ShiftType;
  note?: string;
  createdAt: Date;
}

// Inventory Management
export interface InventoryItem {
  breadTypeId: string;
  breadType?: BreadType;
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
  recordedBy: string;
  createdAt: Date;
}

export interface BreadTypeReport {
  breadTypeId: string;
  breadType?: BreadType;
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

// Error and Alert Types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface Alert {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// Audit Trail
export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  table: string;
  recordId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Export all types for easy importing
export type {
  User,
  UserRole,
  UserPreferences,
  QRInvite,
  Session,
  BreadType,
  ProductionLog,
  SalesLog,
  ShiftType,
  ShiftFeedback,
  InventoryItem,
  DailyReport,
  BreadTypeReport,
  BusinessStats,
  DashboardWidget,
  NavigationItem,
  FormField,
  ApiResponse,
  PaginatedResponse,
  RealtimeUpdate,
  AppError,
  Alert,
  AuditLog,
}; 