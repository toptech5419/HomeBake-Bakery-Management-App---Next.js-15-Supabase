"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShift } from '@/contexts/ShiftContext';
import { Clock, RotateCcw, Settings } from 'lucide-react';

interface ShiftToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

export default function ShiftToggle({ showLabel = true, compact = false }: ShiftToggleProps) {
  const { currentShift, isAutoMode, setIsAutoMode, toggleShift } = useShift();

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
        <Badge className={`flex items-center gap-2 px-3 py-1 ${
          currentShift === 'morning' 
            ? 'bg-orange-100 text-orange-800' 
            : 'bg-indigo-100 text-indigo-800'
        }`}>
          <Clock className="h-4 w-4" />
          <span className="font-medium">
            {currentShift === 'morning' ? '🌅 Morning Shift' : '🌙 Night Shift'}
          </span>
          {isAutoMode && (
            <span className="text-xs opacity-75">(Auto)</span>
          )}
        </Badge>

        {/* Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleShift}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Switch to {currentShift === 'morning' ? 'Night' : 'Morning'}
        </Button>

        {/* Auto Mode Toggle */}
        {!isAutoMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoMode(true)}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Clock className="h-4 w-4" />
            Auto Mode
          </Button>
        )}
      </div>

      {/* Info Text */}
      <div className="text-xs text-muted-foreground">
        {isAutoMode 
          ? 'Automatically switches based on time (6 AM - 6 PM = Morning)'
          : 'Manual mode - shift will stay fixed until changed'
        }
      </div>
    </div>
  );
}