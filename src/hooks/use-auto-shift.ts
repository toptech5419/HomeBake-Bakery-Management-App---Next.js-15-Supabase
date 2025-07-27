import { useEffect, useState } from 'react';
import { getCurrentShiftInfo, ShiftType } from '@/lib/utils/shift-utils';

interface AutoShiftState {
  currentShift: ShiftType;
  shiftStartTime: string;
  nextShiftTime: string;
  shiftStartDateTime: Date;
  shiftEndDateTime: Date;
  isLoading: boolean;
}

export function useAutoShift(): AutoShiftState {
  const [shiftState, setShiftState] = useState<AutoShiftState>(() => {
    const shiftInfo = getCurrentShiftInfo();
    console.log('🔄 useAutoShift: Initial shift info:', shiftInfo);
    return {
      currentShift: shiftInfo.currentShift,
      shiftStartTime: shiftInfo.shiftStartTime,
      nextShiftTime: shiftInfo.nextShiftTime,
      shiftStartDateTime: shiftInfo.shiftStartDateTime,
      shiftEndDateTime: shiftInfo.shiftEndDateTime,
      isLoading: false,
    };
  });

  useEffect(() => {
    const updateShift = () => {
      const shiftInfo = getCurrentShiftInfo();
      console.log('🔄 useAutoShift: Updated shift info:', shiftInfo);
      setShiftState(prevState => ({
        ...prevState,
        currentShift: shiftInfo.currentShift,
        shiftStartTime: shiftInfo.shiftStartTime,
        nextShiftTime: shiftInfo.nextShiftTime,
        shiftStartDateTime: shiftInfo.shiftStartDateTime,
        shiftEndDateTime: shiftInfo.shiftEndDateTime,
        isLoading: false,
      }));
    };

    // Update immediately
    updateShift();

    // Calculate time until next shift change
    const now = new Date();
    const shiftInfo = getCurrentShiftInfo();
    const timeUntilNextShift = shiftInfo.shiftEndDateTime.getTime() - now.getTime();

    // Set up timer for next shift change
    const shiftTimer = setTimeout(() => {
      updateShift();
      
      // After shift change, set up 24-hour interval
      const dailyTimer = setInterval(updateShift, 24 * 60 * 60 * 1000);
      
      // Clean up daily timer when component unmounts
      return () => clearInterval(dailyTimer);
    }, timeUntilNextShift);

    // Also check every minute for edge cases
    const minuteTimer = setInterval(updateShift, 60 * 1000);

    return () => {
      clearTimeout(shiftTimer);
      clearInterval(minuteTimer);
    };
  }, []);

  return shiftState;
}
