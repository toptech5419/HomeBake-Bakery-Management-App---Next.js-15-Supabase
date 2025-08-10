'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Activity } from '@/lib/activities/activity-service';
import { getRecentActivities } from '@/lib/activities/server-actions';

interface UseActivitiesOptions {
  pollingInterval?: number; // in milliseconds, default 30 seconds
  enablePolling?: boolean;
}

interface UseActivitiesReturn {
  activities: Activity[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const {
    pollingInterval = 30000, // 30 seconds
    enablePolling = true
  } = options;

  const queryClient = useQueryClient();

  const {
    data: activities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['activities'],
    queryFn: () => getRecentActivities(100),
    refetchInterval: enablePolling ? pollingInterval : false,
    refetchIntervalInBackground: false,
    staleTime: 25000, // Consider data stale after 25 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Auto-cleanup old activities periodically (once per hour)
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      const { cleanupOldActivities } = await import('@/lib/activities/server-actions');
      cleanupOldActivities();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(cleanupInterval);
  }, []);

  // Manual refetch method that invalidates the query
  const manualRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['activities'] });
  };

  return {
    activities,
    isLoading,
    error: error as Error | null,
    refetch: manualRefetch
  };
}