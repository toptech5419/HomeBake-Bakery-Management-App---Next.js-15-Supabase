/**
 * Production-ready inventory shift management hook
 * Handles automatic 10 AM / 10 PM shift switching for inventory page only
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  getInventoryShiftInfo, 
  getTimeUntilNextShift,
  shouldSwitchShift,
  type InventoryShiftType,
  type InventoryShiftInfo 
} from '@/lib/utils/inventory-shift-utils';

interface InventoryShiftState extends InventoryShiftInfo {
  timeUntilNextShift: string;
  isLoading: boolean;
  lastUpdated: Date;
}

/**
 * Hook for managing inventory-specific automatic shift detection
 * - Automatically switches at 10:00 AM and 10:00 PM Nigeria time
 * - Provides proper data fetching ranges for each shift
 * - Independent of user manual shift preferences
 */
export function useInventoryShift(): InventoryShiftState {
  const [shiftState, setShiftState] = useState<InventoryShiftState>(() => {
    try {
      const shiftInfo = getInventoryShiftInfo();
      const timeUntil = getTimeUntilNextShift();
      
      console.log('🔄 useInventoryShift: Initial state:', {
        shift: shiftInfo.currentShift,
        dataRange: shiftInfo.dataFetchRange.description,
        timeUntilNext: timeUntil
      });
      
      return {
        ...shiftInfo,
        timeUntilNextShift: timeUntil,
        isLoading: false,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('❌ Error initializing inventory shift state:', error);
      
      // Fallback to safe default
      const fallbackDate = new Date().toISOString().split('T')[0];
      return {
        currentShift: 'morning' as InventoryShiftType,
        shiftStartTime: '10:00 AM',
        nextShiftTime: '10:00 PM',
        shiftStartDateTime: new Date(),
        shiftEndDateTime: new Date(),
        dataFetchRange: {
          startDate: fallbackDate,
          endDate: fallbackDate,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          description: 'Fallback range'
        },
        timeUntilNextShift: 'Unknown',
        isLoading: false,
        lastUpdated: new Date(),
      };
    }
  });

  const updateShiftState = useCallback(() => {
    try {
      const shiftInfo = getInventoryShiftInfo();
      const timeUntil = getTimeUntilNextShift();
      
      setShiftState(prevState => {
        // Check if shift actually changed
        const hasShiftChanged = prevState.currentShift !== shiftInfo.currentShift;
        
        if (hasShiftChanged) {
          console.log(`🔄 Inventory shift changed: ${prevState.currentShift} → ${shiftInfo.currentShift}`);
          console.log(`📊 New data range: ${shiftInfo.dataFetchRange.description}`);
        }
        
        return {
          ...shiftInfo,
          timeUntilNextShift: timeUntil,
          isLoading: false,
          lastUpdated: new Date(),
        };
      });
    } catch (error) {
      console.error('❌ Error updating inventory shift state:', error);
      
      setShiftState(prevState => ({
        ...prevState,
        isLoading: false,
        lastUpdated: new Date(),
      }));
    }
  }, []);

  // Setup automatic shift monitoring
  useEffect(() => {
    console.log('🔄 Setting up inventory shift monitoring...');
    
    // Update immediately
    updateShiftState();
    
    // Calculate time until next shift change for precise timing
    const currentShiftInfo = getInventoryShiftInfo();
    const now = new Date();
    const timeUntilNextShift = currentShiftInfo.shiftEndDateTime.getTime() - now.getTime();
    
    // Set up timer for exact shift change
    const shiftChangeTimer = setTimeout(() => {
      console.log('⏰ Automatic shift change triggered');
      updateShiftState();
      
      // After shift changes, check every 12 hours for the next change
      const recurringTimer = setInterval(() => {
        updateShiftState();
      }, 12 * 60 * 60 * 1000); // 12 hours
      
      // Clean up recurring timer when component unmounts
      return () => clearInterval(recurringTimer);
    }, Math.max(0, timeUntilNextShift));
    
    // Also check every minute for edge cases and countdown updates
    const minuteTimer = setInterval(() => {
      // Update countdown and check for missed transitions
      const timeUntil = getTimeUntilNextShift();
      setShiftState(prevState => ({
        ...prevState,
        timeUntilNextShift: timeUntil,
        lastUpdated: new Date(),
      }));
      
      // Check if we missed a shift transition
      if (shouldSwitchShift(shiftState.currentShift)) {
        console.log('⚠️ Detected missed shift transition, updating...');
        updateShiftState();
      }
    }, 60 * 1000); // 1 minute
    
    // Cleanup timers
    return () => {
      clearTimeout(shiftChangeTimer);
      clearInterval(minuteTimer);
    };
  }, []); // Only run once on mount
  
  // Handle visibility change - update when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Tab became visible, checking for shift changes...');
        updateShiftState();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateShiftState]);
  
  // Handle network reconnection
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network reconnected, updating shift state...');
      updateShiftState();
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [updateShiftState]);

  return shiftState;
}