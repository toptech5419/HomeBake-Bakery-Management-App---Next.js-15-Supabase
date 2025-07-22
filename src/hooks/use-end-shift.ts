'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useEndShiftContext } from '@/contexts/EndShiftContext';

export function useEndShift() {
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const { onEndShift } = useEndShiftContext();

  const handleEndShift = useCallback(() => {
    setShowEndShiftModal(true);
  }, []);

  const handleConfirmEndShift = useCallback(() => {
    // Clear dashboard data using context
    onEndShift();
    
    // Close modal
    setShowEndShiftModal(false);
    
    toast.success('Shift data cleared successfully');
  }, [onEndShift]);

  const handleCancelEndShift = useCallback(() => {
    setShowEndShiftModal(false);
  }, []);

  return {
    showEndShiftModal,
    handleEndShift,
    handleConfirmEndShift,
    handleCancelEndShift,
  };
}
