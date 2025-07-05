/**
 * Strict type definitions to improve type safety across the application
 */

// Replace 'any' with proper types
export type UnknownRecord = Record<string, unknown>;
export type AnyFunction = (...args: unknown[]) => unknown;
export type AsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>;

// Supabase response types
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: string;
  } | null;
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    field?: string;
  };
  metadata?: {
    timestamp: string;
    version: string;
  };
}

// Form state types
export interface FormState<T = UnknownRecord> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

// Action result types for server actions
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string>;
}

// Replace loose object types
export type SafeObject<T = unknown> = {
  [K in keyof T]: T[K];
};

// Type guards
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as ApiResponse).success === 'boolean'
  );
}

export function isSupabaseResponse<T>(value: unknown): value is SupabaseResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'error' in value
  );
}

// Utility types for common patterns
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

// Extract types from arrays
export type ArrayElement<ArrayType extends readonly unknown[]> = 
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

// Deep partial type
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

// Strict omit that only allows valid keys
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Type for React component props with children
export interface WithChildren {
  children: React.ReactNode;
}

// Type for components with className
export interface WithClassName {
  className?: string;
}

// Combined common props
export type CommonProps = WithChildren & WithClassName;

// Event handler types
export type ClickHandler = (event: React.MouseEvent<HTMLElement>) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type SubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;

// Replace generic Record<string, any> with stricter types
export type StringRecord<T = string> = Record<string, T>;
export type NumberRecord<T = number> = Record<string, T>;