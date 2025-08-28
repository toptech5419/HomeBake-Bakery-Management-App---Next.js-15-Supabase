'use client';

import { QueryClient } from '@tanstack/react-query';

/**
 * Shift-Aware Cache Manager
 * Manages cache invalidation based on shift changes
 */
class ShiftAwareCacheManager {
  private queryClient: QueryClient | null = null;
  private currentShift: string | null = null;
  private initialized = false;

  /**
   * Initialize the shift-aware cache manager
   */
  initialize(queryClient: QueryClient) {
    if (this.initialized) {
      console.warn('Shift-aware cache manager already initialized');
      return;
    }

    this.queryClient = queryClient;
    this.initialized = true;
    
    // Detect current shift
    this.detectCurrentShift();
    
    console.log('🕐 Shift-aware cache manager initialized');
  }

  /**
   * Detect current shift based on time
   */
  private detectCurrentShift(): string {
    const now = new Date();
    const hour = now.getHours();
    
    // Morning shift: 10 AM - 10 PM (10-22)
    // Night shift: 10 PM - 10 AM (22-10)
    const shift = (hour >= 10 && hour < 22) ? 'morning' : 'night';
    
    if (this.currentShift && this.currentShift !== shift) {
      // Shift changed, invalidate shift-dependent cache
      this.onShiftChange(shift);
    }
    
    this.currentShift = shift;
    return shift;
  }

  /**
   * Handle shift change
   */
  private onShiftChange(newShift: string) {
    if (!this.queryClient) return;

    console.log(`🔄 Shift changed to ${newShift}, invalidating shift-dependent cache`);
    
    // Invalidate shift-dependent queries based on your actual query keys
    const shiftDependentKeys = [
      'sales',        // ['sales', 'shift', shift] patterns
      'batches',      // ['batches', 'all', 'details', currentShift] patterns  
      'availableStock', // Inventory data
      'owner-morning-production', // Owner performance queries
      'owner-night-production',
      'inventory-shift', // Inventory shift data
      'dashboard-metrics' // Dashboard data that includes shift context
    ];

    shiftDependentKeys.forEach(keyPrefix => {
      this.queryClient!.invalidateQueries({
        predicate: (query) => {
          return query.queryKey.some(key => 
            typeof key === 'string' && key.includes(keyPrefix)
          );
        }
      });
    });

    // Also invalidate by shift parameter in query keys
    this.queryClient!.invalidateQueries({
      predicate: (query) => {
        return query.queryKey.includes('shift') || 
               query.queryKey.includes('morning') || 
               query.queryKey.includes('night');
      }
    });
  }

  /**
   * Get current shift
   */
  getCurrentShift(): string {
    return this.detectCurrentShift();
  }

  /**
   * Manual shift invalidation
   */
  invalidateForShift(shift?: string) {
    if (!shift) shift = this.detectCurrentShift();
    this.onShiftChange(shift);
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.initialized = false;
    this.queryClient = null;
    this.currentShift = null;
  }
}

export const shiftAwareCacheManager = new ShiftAwareCacheManager();