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
   * Invalidate user management cache - CRITICAL for fixing fluctuation
   */
  invalidateUserManagement() {
    if (!this.queryClient) return;
    
    console.log('🔄 Invalidating user management cache...');
    
    // Invalidate all user-related queries
    this.queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey.some(key => 
          typeof key === 'string' && (
            key.includes('user') || 
            key.includes('auth') ||
            key.includes('profile') ||
            key.includes('role')
          )
        );
      }
    });
    
    // Clear any stale user data
    this.queryClient.removeQueries({
      predicate: (query) => {
        const hasUserKey = query.queryKey.some(key => 
          typeof key === 'string' && key.includes('user')
        );
        return hasUserKey && query.isStale();
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