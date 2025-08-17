/**
 * Centralized query key factory for sales operations
 * Provides consistent, hierarchical query keys for optimal caching
 */

export const salesQueryKeys = {
  // Base keys
  all: ['sales'] as const,
  
  // Bread types queries
  breadTypes: () => [...salesQueryKeys.all, 'breadTypes'] as const,
  breadTypesForUser: (userId: string) => [...salesQueryKeys.breadTypes(), userId] as const,
  breadTypesForSales: () => [...salesQueryKeys.breadTypes(), 'forSales'] as const,
  
  // Sales data queries
  sales: () => [...salesQueryKeys.all, 'sales'] as const,
  salesByShift: (shift: string) => [...salesQueryKeys.sales(), 'shift', shift] as const,
  salesByUser: (userId: string) => [...salesQueryKeys.sales(), 'user', userId] as const,
  salesByUserAndShift: (userId: string, shift: string) => [
    ...salesQueryKeys.sales(), 'user', userId, 'shift', shift
  ] as const,
  
  // All sales with details
  allSales: () => [...salesQueryKeys.sales(), 'all'] as const,
  allSalesDetails: (userId: string, shift: string) => [
    ...salesQueryKeys.allSales(), 'details', userId, shift
  ] as const,
  
  // Sales metrics and analytics
  metrics: () => [...salesQueryKeys.all, 'metrics'] as const,
  metricsForShift: (shift: string) => [...salesQueryKeys.metrics(), 'shift', shift] as const,
  metricsForUser: (userId: string, shift: string) => [
    ...salesQueryKeys.metrics(), 'user', userId, 'shift', shift
  ] as const,
  
  // Available stock (related to sales)
  availableStock: () => ['availableStock'] as const,
  
  // Sales reports
  reports: () => [...salesQueryKeys.all, 'reports'] as const,
  reportsHistory: (userId: string) => [...salesQueryKeys.reports(), 'history', userId] as const,
  shiftReports: (shift: string) => [...salesQueryKeys.reports(), 'shift', shift] as const,
  
  // Sales management data
  management: () => [...salesQueryKeys.all, 'management'] as const,
  managementData: (userId: string, shift: string) => [
    ...salesQueryKeys.management(), userId, shift
  ] as const,
} as const;

/**
 * Cache time configurations for different data types
 */
export const salesCacheConfig = {
  // Bread types change infrequently
  breadTypes: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
  },
  
  // Sales data should be fresh but can be slightly stale
  salesData: {
    staleTime: 30 * 1000,      // 30 seconds
    gcTime: 5 * 60 * 1000,     // 5 minutes
  },
  
  // Real-time sales operations need fresh data
  liveSales: {
    staleTime: 15 * 1000,      // 15 seconds
    gcTime: 2 * 60 * 1000,     // 2 minutes
  },
  
  // Metrics can be slightly stale
  metrics: {
    staleTime: 60 * 1000,      // 1 minute
    gcTime: 10 * 60 * 1000,    // 10 minutes
  },
  
  // Available stock needs to be reasonably fresh
  availableStock: {
    staleTime: 30 * 1000,      // 30 seconds
    gcTime: 5 * 60 * 1000,     // 5 minutes
  },
  
  // Reports are historical and can be cached longer
  reports: {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 15 * 60 * 1000,    // 15 minutes
  },
} as const;

/**
 * Helper function to invalidate related sales queries
 */
export function invalidateSalesQueries(queryClient: any, options: {
  userId?: string;
  shift?: string;
  includeStock?: boolean;
  includeMetrics?: boolean;
}) {
  const { userId, shift, includeStock = true, includeMetrics = true } = options;
  
  // Always invalidate core sales data
  queryClient.invalidateQueries({ queryKey: salesQueryKeys.sales() });
  
  // Invalidate user-specific queries if userId provided
  if (userId) {
    queryClient.invalidateQueries({ queryKey: salesQueryKeys.salesByUser(userId) });
    if (shift) {
      queryClient.invalidateQueries({ 
        queryKey: salesQueryKeys.salesByUserAndShift(userId, shift) 
      });
      queryClient.invalidateQueries({ 
        queryKey: salesQueryKeys.allSalesDetails(userId, shift) 
      });
    }
  }
  
  // Invalidate shift-specific queries if shift provided
  if (shift) {
    queryClient.invalidateQueries({ queryKey: salesQueryKeys.salesByShift(shift) });
    if (includeMetrics) {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.metricsForShift(shift) });
    }
  }
  
  // Invalidate related data
  if (includeStock) {
    queryClient.invalidateQueries({ queryKey: salesQueryKeys.availableStock() });
  }
  
  if (includeMetrics) {
    queryClient.invalidateQueries({ queryKey: salesQueryKeys.metrics() });
    if (userId && shift) {
      queryClient.invalidateQueries({ 
        queryKey: salesQueryKeys.metricsForUser(userId, shift) 
      });
    }
  }
}

/**
 * Prefetch strategies for common user flows
 */
export function prefetchSalesData(queryClient: any, userId: string, shift: string) {
  // Prefetch bread types (user will likely record sales)
  queryClient.prefetchQuery({
    queryKey: salesQueryKeys.breadTypesForSales(),
    staleTime: salesCacheConfig.breadTypes.staleTime,
  });
  
  // Prefetch available stock (displayed in most sales views)
  queryClient.prefetchQuery({
    queryKey: salesQueryKeys.availableStock(),
    staleTime: salesCacheConfig.availableStock.staleTime,
  });
  
  // Prefetch user's sales metrics
  queryClient.prefetchQuery({
    queryKey: salesQueryKeys.metricsForUser(userId, shift),
    staleTime: salesCacheConfig.metrics.staleTime,
  });
}

/**
 * Query options factory for consistent configuration
 */
export function createSalesQueryOptions<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  cacheConfig: typeof salesCacheConfig[keyof typeof salesCacheConfig]
) {
  return {
    queryKey,
    queryFn,
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.gcTime,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    networkMode: 'offlineFirst' as const,
  };
}