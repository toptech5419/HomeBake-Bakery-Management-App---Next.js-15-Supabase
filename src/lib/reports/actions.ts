'use server';

import { getReportData, getShiftDetails, getBreadTypes, ReportFilters } from './queries';
import { revalidatePath } from 'next/cache';

export async function fetchReportData(filters: ReportFilters) {
  try {
    const data = await getReportData(filters);
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching report data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch report data' 
    };
  }
}

export async function fetchShiftDetails(shiftId: string) {
  try {
    const data = await getShiftDetails(shiftId);
    if (!data) {
      return { success: false, error: 'Shift not found' };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching shift details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch shift details' 
    };
  }
}

export async function fetchBreadTypes() {
  try {
    const data = await getBreadTypes();
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching bread types:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch bread types' 
    };
  }
}

export async function refreshReports() {
  revalidatePath('/dashboard/reports');
  revalidatePath('/dashboard/reports/[shiftId]', 'page');
  return { success: true };
}