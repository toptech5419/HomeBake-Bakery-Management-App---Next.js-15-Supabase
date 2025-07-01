import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Enable background refetching
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Reduce stale time for real-time feel
      staleTime: 30 * 1000, // 30 seconds
      // Keep data fresh
      gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
      // Retry failed requests
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations on failure
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  inventory: {
    all: ['inventory'] as const,
    current: () => [...queryKeys.inventory.all, 'current'] as const,
    logs: () => [...queryKeys.inventory.all, 'logs'] as const,
  },
  sales: {
    all: ['sales'] as const,
    current: () => [...queryKeys.sales.all, 'current'] as const,
    today: () => [...queryKeys.sales.all, 'today'] as const,
  },
  production: {
    all: ['production'] as const,
    current: () => [...queryKeys.production.all, 'current'] as const,
    today: () => [...queryKeys.production.all, 'today'] as const,
  },
  breadTypes: {
    all: ['breadTypes'] as const,
    active: () => [...queryKeys.breadTypes.all, 'active'] as const,
  },
  reports: {
    all: ['reports'] as const,
    summary: (filters?: any) => [...queryKeys.reports.all, 'summary', filters] as const,
  },
} as const;