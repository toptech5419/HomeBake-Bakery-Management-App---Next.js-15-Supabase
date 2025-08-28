'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query/query-client';
import { ReactNode, useEffect } from 'react';
import { cacheCoordinator } from '@/lib/cache/cache-coordinator';
import { shiftAwareCacheManager } from '@/lib/cache/shift-aware-cache';
import { smartPollingManager } from '@/lib/cache/smart-polling';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  
  useEffect(() => {
    // 🚀 Initialize cache optimization systems
    console.log('🚀 Initializing cache optimization systems...');
    
    try {
      // Initialize cache coordination
      cacheCoordinator.initialize?.(queryClient);
      
      // Initialize shift-aware cache monitoring  
      shiftAwareCacheManager.initialize?.(queryClient);
      
      // Set up smart polling
      smartPollingManager.initialize?.({
        queryClient,
        defaultInterval: 15000, // 15 seconds default
        strategies: {
          aggressive: 5000,    // 5 seconds for active data
          standard: 15000,     // 15 seconds for normal data
          conservative: 30000, // 30 seconds for background data
          offline: 0           // No polling when offline
        }
      });
      
      console.log('🚀 Cache optimization systems initialized successfully');
      
    } catch (error) {
      console.warn('⚠️ Cache optimization initialization warning:', error);
      // Graceful degradation - continue without cache optimization
    }
    
    // Cleanup function
    return () => {
      try {
        // Clean up any listeners or intervals
        shiftAwareCacheManager.cleanup?.();
        smartPollingManager.cleanup?.();
      } catch (error) {
        console.warn('⚠️ Cache cleanup warning:', error);
      }
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools removed for production compatibility */}
    </QueryClientProvider>
  );
}