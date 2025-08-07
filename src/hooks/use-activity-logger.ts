'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { activityService } from '@/lib/activities/activity-service';
import { getCurrentShift } from '@/lib/shift-utils';

interface UseActivityLoggerReturn {
  logSale: (data: { user_id: string; user_name: string; bread_type: string; quantity: number; revenue: number }) => Promise<void>;
  logBatch: (data: { user_id: string; user_name: string; bread_type: string; quantity: number; batch_number: string }) => Promise<void>;
  logReport: (data: { user_id: string; user_name: string; user_role: 'manager' | 'sales_rep'; report_type: string }) => Promise<void>;
  logLogin: (data: { user_id: string; user_name: string; user_role: 'manager' | 'sales_rep' }) => Promise<void>;
  logEndShift: (data: { user_id: string; user_name: string; user_role: 'manager' | 'sales_rep' }) => Promise<void>;
  logAccountCreated: (data: { user_id: string; user_name: string; user_role: 'manager' | 'sales_rep' }) => Promise<void>;
}

export function useActivityLogger(): UseActivityLoggerReturn {
  const queryClient = useQueryClient();

  // Invalidate activities query after logging to get fresh data
  const invalidateActivities = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activities'] });
  }, [queryClient]);

  const logSale = useCallback(async (data: {
    user_id: string;
    user_name: string;
    bread_type: string;
    quantity: number;
    revenue: number;
  }) => {
    const currentShift = getCurrentShift();
    await activityService.logSaleActivity({
      ...data,
      shift: currentShift
    });
    invalidateActivities();
  }, [invalidateActivities]);

  const logBatch = useCallback(async (data: {
    user_id: string;
    user_name: string;
    bread_type: string;
    quantity: number;
    batch_number: string;
  }) => {
    const currentShift = getCurrentShift();
    await activityService.logBatchActivity({
      ...data,
      shift: currentShift
    });
    invalidateActivities();
  }, [invalidateActivities]);

  const logReport = useCallback(async (data: {
    user_id: string;
    user_name: string;
    user_role: 'manager' | 'sales_rep';
    report_type: string;
  }) => {
    const currentShift = getCurrentShift();
    await activityService.logReportActivity({
      ...data,
      shift: currentShift
    });
    invalidateActivities();
  }, [invalidateActivities]);

  const logLogin = useCallback(async (data: {
    user_id: string;
    user_name: string;
    user_role: 'manager' | 'sales_rep';
  }) => {
    await activityService.logLoginActivity(data);
    invalidateActivities();
  }, [invalidateActivities]);

  const logEndShift = useCallback(async (data: {
    user_id: string;
    user_name: string;
    user_role: 'manager' | 'sales_rep';
  }) => {
    const currentShift = getCurrentShift();
    await activityService.logEndShiftActivity({
      ...data,
      shift: currentShift
    });
    invalidateActivities();
  }, [invalidateActivities]);

  const logAccountCreated = useCallback(async (data: {
    user_id: string;
    user_name: string;
    user_role: 'manager' | 'sales_rep';
  }) => {
    await activityService.logAccountCreatedActivity(data);
    invalidateActivities();
  }, [invalidateActivities]);

  return {
    logSale,
    logBatch,
    logReport,
    logLogin,
    logEndShift,
    logAccountCreated
  };
}