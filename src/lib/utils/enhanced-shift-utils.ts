import { createServer } from '@/lib/supabase/server';
import { ShiftType, ShiftInfo, getCurrentShiftInfo, getShiftDateRange, getShiftBoundaries } from './shift-utils';

export interface EnhancedShiftInfo extends ShiftInfo {
  shouldShowArchivedData: boolean;
  dataSource: 'batches' | 'all_batches' | 'archived';
}



/**
 * Get enhanced shift information including manager alignment
 */
export async function getEnhancedShiftInfo(userId?: string): Promise<EnhancedShiftInfo> {
  const baseShiftInfo = getCurrentShiftInfo();
  
  let shouldShowArchivedData = false;
  let dataSource: 'batches' | 'all_batches' | 'archived' = 'batches';

  if (userId) {
    try {
      const supabase = await createServer();
      
      // Get user profile to determine if they're a manager
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', userId)
        .single();

      if (userProfile && (userProfile.role === 'manager' || userProfile.role === 'owner')) {
        // Determine if we should show archived data
        if (baseShiftInfo.currentShift === 'night') {
          shouldShowArchivedData = false; // Will be determined dynamically based on data availability
        }
        
        // Determine data source priority
        dataSource = await determineOptimalDataSource(baseShiftInfo.currentShift);
      }
    } catch (error) {
      console.error('Error getting manager shift context:', error);
    }
  }

  return {
    ...baseShiftInfo,
    shouldShowArchivedData,
    dataSource,
  };
}

/**
 * Check if we should show archived data for night shift
 * This checks if there's data from yesterday 10 AM to today 10 AM
 */
async function shouldShowArchivedDataForNightShift(): Promise<boolean> {
  try {
    const supabase = await createServer();
    
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if there are any batches from yesterday 10 AM to today 10 AM
    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setHours(10, 0, 0, 0); // Yesterday 10 AM
    
    const todayEnd = new Date();
    todayEnd.setHours(10, 0, 0, 0); // Today 10 AM
    
    // Convert to UTC for database query - FIXED: Add timezone offset
    const utcStart = new Date(yesterdayStart.getTime() + (yesterdayStart.getTimezoneOffset() * 60000));
    const utcEnd = new Date(todayEnd.getTime() + (todayEnd.getTimezoneOffset() * 60000));
    
    // Check batches table first
    const { data: batchesData } = await supabase
      .from('batches')
      .select('id')
      .gte('created_at', utcStart.toISOString())
      .lt('created_at', utcEnd.toISOString())
      .limit(1);
    
    if (batchesData && batchesData.length > 0) {
      return true;
    }
    
    // Check all_batches table
    const { data: allBatchesData } = await supabase
      .from('all_batches')
      .select('id')
      .gte('created_at', utcStart.toISOString())
      .lt('created_at', utcEnd.toISOString())
      .limit(1);
    
    return !!(allBatchesData && allBatchesData.length > 0);
  } catch (error) {
    console.error('Error checking archived data:', error);
    return false;
  }
}

/**
 * Determine the optimal data source for the current shift
 */
async function determineOptimalDataSource(shift: ShiftType): Promise<'batches' | 'all_batches' | 'archived'> {
  try {
    const supabase = await createServer();
    
    // Get current shift boundaries
    const shiftInfo = getCurrentShiftInfo();
    const { startTime, endTime } = getShiftDateRange(shift);
    
    // First, check if there's data in the batches table
    const { data: batchesData } = await supabase
      .from('batches')
      .select('id')
      .eq('shift', shift)
      .gte('created_at', startTime)
      .lt('created_at', endTime)
      .limit(1);
    
    if (batchesData && batchesData.length > 0) {
      return 'batches';
    }
    
    // Check all_batches table
    const { data: allBatchesData } = await supabase
      .from('all_batches')
      .select('id')
      .eq('shift', shift)
      .gte('created_at', startTime)
      .lt('created_at', endTime)
      .limit(1);
    
    if (allBatchesData && allBatchesData.length > 0) {
      return 'all_batches';
    }
    
    // For night shift, check archived data from yesterday 10 AM to today 10 AM
    if (shift === 'night') {
      const hasArchivedData = await shouldShowArchivedDataForNightShift();
      if (hasArchivedData) {
        return 'archived';
      }
    }
    
    return 'batches'; // Default to batches table
  } catch (error) {
    console.error('Error determining data source:', error);
    return 'batches';
  }
}



/**
 * Get shift boundaries for night shift with archived data consideration
 */
export function getNightShiftBoundariesWithArchive(date: Date = new Date()) {
  const boundaries = getShiftBoundaries(date);
  
  // For night shift, we need to consider archived data from previous day
  const previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);
  
  return {
    currentShift: {
      startTime: boundaries.nightStart,
      endTime: boundaries.nightEnd,
    },
    archivedData: {
      startTime: new Date(previousDay.setHours(10, 0, 0, 0)), // Yesterday 10 AM
      endTime: new Date(date.setHours(10, 0, 0, 0)), // Today 10 AM
    },
    // Check if we should include archived data
    shouldIncludeArchived: true, // This will be determined dynamically
  };
}

/**
 * Get comprehensive shift context for inventory management
 */
export async function getInventoryShiftContext(userId?: string) {
  const enhancedShiftInfo = await getEnhancedShiftInfo(userId);
  
  return {
    ...enhancedShiftInfo,
    // Additional context for inventory management
    isManager: userId ? await isUserManager(userId) : false,
    canViewArchivedData: enhancedShiftInfo.shouldShowArchivedData,
    dataSourcePriority: getDataSourcePriority(enhancedShiftInfo.dataSource),
  };
}

/**
 * Check if user is a manager
 */
async function isUserManager(userId: string): Promise<boolean> {
  try {
    const supabase = await createServer();
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    return userProfile?.role === 'manager' || userProfile?.role === 'owner';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * Get data source priority for UI display
 */
function getDataSourcePriority(source: 'batches' | 'all_batches' | 'archived'): number {
  switch (source) {
    case 'batches':
      return 1; // Highest priority
    case 'all_batches':
      return 2; // Medium priority
    case 'archived':
      return 3; // Lowest priority
    default:
      return 1;
  }
}
