/**
 * Production-Ready React Query Configuration
 * Optimized for HomeBake Bakery Management System
 */

import { QueryClient } from '@tanstack/react-query';

// Production-optimized defaults
export const PRODUCTION_QUERY_CONFIG = {
  // Default options for all queries
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh
      staleTime: 30000, // 30 seconds - good balance for production data
      
      // Cache time - how long to keep unused data in cache
      gcTime: 1000 * 60 * 5, // 5 minutes
      
      // Retry logic for network failures
      retry: (failureCount: number, error: any) => {
        // Don't retry on 401, 403, 404 errors
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      // Exponential backoff for retries
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetch options
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // Network mode - work offline when possible
      networkMode: 'offlineFirst',
      
      // Error handling
      throwOnError: false,
      
      // Refetch intervals for real-time-ish behavior
      refetchInterval: undefined, // Disabled by default, enabled per query as needed
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Mutation retry logic
      retry: (failureCount: number, error: any) => {
        // Don't retry on client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry server errors up to 2 times
        return failureCount < 2;
      },
      
      // Exponential backoff for mutations
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
      
      // Network mode
      networkMode: 'offlineFirst',
    },
  },
};

// Specific configurations for different data types
export const BATCH_QUERY_CONFIG = {
  // Active batches need frequent updates
  staleTime: 15000, // 15 seconds
  refetchInterval: 30000, // Refetch every 30 seconds
  refetchIntervalInBackground: false,
};

export const HISTORICAL_QUERY_CONFIG = {
  // Historical data changes less frequently
  staleTime: 300000, // 5 minutes
  refetchInterval: undefined, // No auto-refetch for historical data
};

export const REPORTS_QUERY_CONFIG = {
  // Reports can be cached longer
  staleTime: 120000, // 2 minutes
  refetchInterval: undefined,
};

export const INVENTORY_QUERY_CONFIG = {
  // Inventory needs regular updates but not too frequent
  staleTime: 45000, // 45 seconds
  refetchInterval: 60000, // Refetch every minute
  refetchIntervalInBackground: false,
};

// Query key factories for consistent cache management
export const QUERY_KEYS = {
  // Batches
  batches: {
    all: () => ['batches'] as const,
    active: (shift?: string) => ['batches', 'active', shift] as const,
    historical: (shift?: string) => ['batches', 'historical', shift] as const,
    details: (shift?: string) => ['batches', 'details', shift] as const,
    export: (shift?: string) => ['batches', 'export', shift] as const,
  },
  
  // Reports
  reports: {
    all: () => ['reports'] as const,
    manager: () => ['reports', 'manager'] as const,
    shift: (shift: string) => ['reports', 'shift', shift] as const,
  },
  
  // Inventory
  inventory: {
    all: () => ['inventory'] as const,
    current: () => ['inventory', 'current'] as const,
    shift: (shift: string) => ['inventory', 'shift', shift] as const,
  },
  
  // Bread types
  breadTypes: {
    all: () => ['breadTypes'] as const,
    active: () => ['breadTypes', 'active'] as const,
  },
  
  // Users and auth
  users: {
    all: () => ['users'] as const,
    profile: (userId: string) => ['users', 'profile', userId] as const,
  },
} as const;

// Create production-ready query client
export function createProductionQueryClient() {
  return new QueryClient(PRODUCTION_QUERY_CONFIG);
}

// Error logging for production monitoring
export function logQueryError(error: any, queryKey: unknown[]) {
  console.error('🚨 React Query Error:', {
    error: error.message || error,
    queryKey,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
  });
}

// Success logging for production monitoring
export function logQuerySuccess(data: any, queryKey: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ React Query Success:', {
      queryKey,
      dataSize: Array.isArray(data) ? data.length : typeof data === 'object' ? Object.keys(data).length : 1,
      timestamp: new Date().toISOString(),
    });
  }
}

// Utility to get appropriate config based on data type
export function getQueryConfig(type: 'batch' | 'historical' | 'reports' | 'inventory' | 'default' = 'default') {
  switch (type) {
    case 'batch':
      return BATCH_QUERY_CONFIG;
    case 'historical':
      return HISTORICAL_QUERY_CONFIG;
    case 'reports':
      return REPORTS_QUERY_CONFIG;
    case 'inventory':
      return INVENTORY_QUERY_CONFIG;
    default:
      return {};
  }
}