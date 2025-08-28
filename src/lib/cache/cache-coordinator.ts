'use client';

import { QueryClient } from '@tanstack/react-query';

/**
 * Cache Coordinator - Manages cache coordination across the application
 * Production-grade cache management for HomeBake
 */
class CacheCoordinator {
  private queryClient: QueryClient | null = null;
  private initialized = false;

  /**
   * Initialize the cache coordinator
   */
  initialize(queryClient: QueryClient) {
    if (this.initialized) {
      console.warn('Cache coordinator already initialized');
      return;
    }

    this.queryClient = queryClient;
    this.initialized = true;
    
    console.log('🔄 Cache coordinator initialized');
  }

  /**
   * Invalidate cache for specific patterns
   */
  invalidatePattern(pattern: string) {
    if (!this.queryClient) return;
    
    this.queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey.some(key => 
          typeof key === 'string' && key.includes(pattern)
        );
      }
    });
  }

  /**
   * Clear all cache
   */
  clearAll() {
    if (!this.queryClient) return;
    this.queryClient.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    if (!this.queryClient) return null;
    
    const cache = this.queryClient.getQueryCache();
    return {
      queryCount: cache.getAll().length,
      size: cache.getAll().reduce((acc, query) => acc + (query.state.dataUpdatedAt ? 1 : 0), 0)
    };
  }
}

export const cacheCoordinator = new CacheCoordinator();