import { createServer } from '@/lib/supabase/server';
import { ShiftType, ShiftInfo, getCurrentShiftInfo, getShiftDateRange, getShiftBoundaries } from './shift-utils';

export interface EnhancedShiftInfo extends ShiftInfo {
  managerShift: ShiftType;
  isShiftAligned: boolean;
  shouldShowArchivedData: boolean;
  dataSource: 'batches' | 'all_batches' | 'archived';
  shiftAlignmentStatus: 'aligned' | 'misaligned' | 'transitioning';
}

export interface ManagerShiftContext {
  userId: string;
  userRole: string;
  currentManagerShift: ShiftType;
  lastShiftChange: Date;
}

/**
 * Get enhanced shift information including manager alignment
 */
export async function getEnhancedShiftInfo(userId?: string): Promise<EnhancedShiftInfo> {
  const baseShiftInfo = getCurrentShiftInfo();
  
  // Get manager shift context if user is provided
  let managerShift: ShiftType = baseShiftInfo.currentShift;
  let isShiftAligned = true;
  let shouldShowArchivedData = false;
  let dataSource: 'batches' | 'all_batches' | 'archived' = 'batches';
  let shiftAlignmentStatus: 'aligned' | 'misaligned' | 'transitioning' = 'aligned';

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
        // For managers, check if they have a specific shift preference
        // For now, we'll use the time-based shift, but this could be enhanced
        // to store manager's preferred shift in the database
        managerShift = baseShiftInfo.currentShift;
        
        // Check if inventory shift matches manager's shift
        isShiftAligned = baseShiftInfo.currentShift === managerShift;
        
        // Determine if we should show archived data
        if (baseShiftInfo.currentShift === 'night') {
          // For night shift, we always want to show archived data for safety
          shouldShowArchivedData = true;
        }
        
        // Determine data source priority
        dataSource = await determineOptimalDataSource(baseShiftInfo.currentShift);
        
        // Determine alignment status
        shiftAlignmentStatus = determineShiftAlignmentStatus(baseShiftInfo.currentShift, managerShift);
      }
    } catch (error) {
      console.error('Error getting manager shift context:', error);
    }
  }

  return {
    ...baseShiftInfo,
    managerShift,
    isShiftAligned,
    shouldShowArchivedData,
    dataSource,
    shiftAlignmentStatus,
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
 * Determine shift alignment status
 */
function determineShiftAlignmentStatus(
  inventoryShift: ShiftType, 
  managerShift: ShiftType
): 'aligned' | 'misaligned' | 'transitioning' {
  if (inventoryShift === managerShift) {
    return 'aligned';
  }
  
  // Check if we're in a transition period (within 30 minutes of shift change)
  const now = new Date();
  const shiftInfo = getCurrentShiftInfo();
  const timeUntilShiftEnd = shiftInfo.shiftEndDateTime.getTime() - now.getTime();
  const thirtyMinutes = 30 * 60 * 1000;
  
  if (timeUntilShiftEnd <= thirtyMinutes) {
    return 'transitioning';
  }
  
  return 'misaligned';
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