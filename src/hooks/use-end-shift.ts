'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useEndShiftContext } from '@/contexts/EndShiftContext';

export function useEndShift() {
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const { onEndShift } = useEndShiftContext();

  const handleEndShift = useCallback(() => {
    console.log('🔍 handleEndShift called - opening confirmation modal');
    setShowEndShiftModal(true);
  }, []);

  const handleConfirmEndShift = useCallback(() => {
    console.log('🔍 handleConfirmEndShift called - user confirmed end shift');
    // Clear dashboard data using context
    onEndShift();
    
    // Close modal
    setShowEndShiftModal(false);
    
    toast.success('Shift data cleared successfully');
  }, [onEndShift]);

  const handleCancelEndShift = useCallback(() => {
    console.log('🔍 handleCancelEndShift called - user cancelled end shift');
    setShowEndShiftModal(false);
  }, []);

  return {
    showEndShiftModal,
    handleEndShift,
    handleConfirmEndShift,
    handleCancelEndShift,
  };
}
