"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShift } from '@/contexts/ShiftContext';
import { Clock, RotateCcw, Settings } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
// Removed: import { useAuth } from '@/hooks/use-auth';

interface ShiftToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

export default function ShiftToggle({ showLabel = true, compact = false }: ShiftToggleProps) {
  const { currentShift, toggleShift } = useShift();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  // Removed user dependency

  // End Shift button is large/tab-like
  const handleEndShift = async () => {
    setIsLoading(true);
    try {
      // Delete all sales_logs for the current shift (all users)
      const { error } = await supabase
        .from('sales_logs')
        .delete()
        .eq('shift', currentShift);
      if (error) throw error;
      toast.success('Shift ended successfully.');
      setShowModal(false);
      // Optionally, trigger a global state update or event here
      router.push('/dashboard');
    } catch (err) {
      console.error('End Shift error:', err);
      toast.error('Failed to end shift. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={`flex items-center gap-1 ${
          currentShift === 'morning' 
            ? 'bg-orange-100 text-orange-800' 
            : 'bg-indigo-100 text-indigo-800'
        }`}>
          <Clock className="h-3 w-3" />
          {currentShift === 'morning' ? '🌅' : '🌙'} {currentShift}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleShift}
          className="p-1 h-6 w-6"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white rounded-lg border shadow-sm">
      {showLabel && (
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm">Shift Control:</span>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        {/* Current Shift Display */}
        <Badge className={`flex items-center gap-2 px-3 py-1 ${currentShift === 'morning' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'}`}> 
          <Clock className="h-4 w-4" />
          <span className="font-medium">{currentShift === 'morning' ? '🌅 Morning Shift' : '🌙 Night Shift'}</span>
        </Badge>

        {/* Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleShift}
          className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl shadow-md px-4 py-2 font-semibold transition duration-200 hover:shadow-lg hover:border-gray-400 active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <span className="flex items-center gap-1">
            <RotateCcw className="h-4 w-4 mr-1" />
            Switch to {currentShift === 'morning' ? 'Night' : 'Morning'}
          </span>
        </Button>
        <Button
          type="button"
          className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-base font-semibold shadow transition duration-200 active:scale-[.98]"
          onClick={() => setShowModal(true)}
          disabled={isLoading}
        >
          {isLoading ? <span className="loader mr-2" /> : null}
          End Shift
        </Button>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="End Shift?">
        <div className="bg-white text-black rounded-xl p-4 shadow-lg w-full max-w-sm mx-auto">
          <div className="text-sm mb-4">Are you sure you want to end your current shift? This will clear all recorded sales.</div>
          <div className="flex flex-row gap-2 justify-end">
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-base font-semibold shadow transition duration-200 active:scale-[.98]"
              onClick={handleEndShift}
              disabled={isLoading}
            >
              {isLoading ? <span className="loader mr-2" /> : null}
              Proceed
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}