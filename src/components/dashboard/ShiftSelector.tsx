'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Sun, 
  Moon, 
  Clock, 
  PlayCircle, 
  StopCircle,
  RotateCcw,
  CheckCircle
} from 'lucide-react';

export type ShiftType = 'morning' | 'night';

interface ShiftInfo {
  type: ShiftType;
  name: string;
  time: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  progress: number;
  isActive: boolean;
  canStart: boolean;
}

interface ShiftSelectorProps {
  currentShift: ShiftType;
  onShiftChange: (shift: ShiftType) => void;
  isShiftActive?: boolean;
  onStartShift?: () => void;
  onEndShift?: () => void;
  className?: string;
  role: 'manager' | 'sales_rep';
}

const SHIFT_CONFIG: Record<ShiftType, Omit<ShiftInfo, 'progress' | 'isActive' | 'canStart'>> = {
  morning: {
    type: 'morning',
    name: 'Morning Shift',
    time: '8:00 AM - 6:00 PM',
    icon: Sun,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 border-orange-200',
  },
  night: {
    type: 'night',
    name: 'Night Shift', 
    time: '8:00 PM - 7:00 AM',
    icon: Moon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 border-indigo-200',
  },
};

function getCurrentShiftType(): ShiftType {
  const now = new Date();
  const hour = now.getHours();
  
  // Morning shift: 8 AM - 6 PM (8-18)
  // Night shift: 8 PM - 7 AM (20-7)
  if (hour >= 8 && hour < 18) {
    return 'morning';
  } else {
    return 'night';
  }
}

function getShiftProgress(shiftType: ShiftType): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minute;
  
  if (shiftType === 'morning') {
    // 8 AM (480 min) to 6 PM (1080 min) = 600 minutes total
    const startTime = 8 * 60; // 8 AM
    const endTime = 18 * 60;  // 6 PM
    
    if (currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime) {
      return ((currentTimeInMinutes - startTime) / (endTime - startTime)) * 100;
    }
  } else {
    // Night shift: 8 PM to 7 AM next day
    const nightStart = 20 * 60; // 8 PM
    const nightEnd = 7 * 60;    // 7 AM next day
    
    if (currentTimeInMinutes >= nightStart || currentTimeInMinutes <= nightEnd) {
      if (currentTimeInMinutes >= nightStart) {
        // Evening portion: 8 PM to 12 AM
        return ((currentTimeInMinutes - nightStart) / (24 * 60 - nightStart + nightEnd)) * 100;
      } else {
        // Morning portion: 12 AM to 7 AM
        return (((24 * 60 - nightStart) + currentTimeInMinutes) / (24 * 60 - nightStart + nightEnd)) * 100;
      }
    }
  }
  
  return 0;
}

export function ShiftSelector({
  currentShift,
  onShiftChange,
  isShiftActive = false,
  onStartShift,
  onEndShift,
  className,
  role
}: ShiftSelectorProps) {
  const [detectedShift, setDetectedShift] = useState<ShiftType>(getCurrentShiftType());
  const [shiftProgress, setShiftProgress] = useState(0);

  useEffect(() => {
    const updateShiftInfo = () => {
      const detected = getCurrentShiftType();
      const progress = getShiftProgress(currentShift);
      
      setDetectedShift(detected);
      setShiftProgress(progress);
    };

    updateShiftInfo();
    const interval = setInterval(updateShiftInfo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentShift]);

  const shifts: ShiftInfo[] = Object.values(SHIFT_CONFIG).map(shift => ({
    ...shift,
    progress: getShiftProgress(shift.type),
    isActive: currentShift === shift.type && isShiftActive,
    canStart: detectedShift === shift.type && !isShiftActive,
  }));

  const activeShift = shifts.find(s => s.type === currentShift);
  const isAutoDetected = currentShift === detectedShift;

  return (
    <Card className={cn('p-6', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Shift Management
              </h3>
              <p className="text-sm text-gray-600">
                {role === 'manager' ? 'Production' : 'Sales'} shift tracking
              </p>
            </div>
          </div>
          
          {isAutoDetected && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Auto-detected
            </Badge>
          )}
        </div>

        {/* Current Shift Status */}
        {activeShift && (
          <div className={cn(
            'p-4 rounded-lg border-2',
            activeShift.bgColor
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <activeShift.icon className={cn('h-6 w-6', activeShift.color)} />
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {activeShift.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {activeShift.time}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isShiftActive ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <PlayCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                    <StopCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </div>
            </div>

            {/* Shift Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Shift Progress</span>
                <span className="font-medium">
                  {Math.round(activeShift.progress)}%
                </span>
              </div>
              <Progress 
                value={activeShift.progress} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                Based on current time within shift hours
              </p>
            </div>
          </div>
        )}

        {/* Shift Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            Switch Shift
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shifts.map((shift) => {
              const isSelected = currentShift === shift.type;
              const isRecommended = detectedShift === shift.type && !isSelected;
              
              return (
                <button
                  key={shift.type}
                  onClick={() => onShiftChange(shift.type)}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all duration-200',
                    'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isSelected 
                      ? `${shift.bgColor} border-current` 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <shift.icon 
                      className={cn(
                        'h-5 w-5',
                        isSelected ? shift.color : 'text-gray-400'
                      )} 
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-medium',
                          isSelected ? 'text-gray-900' : 'text-gray-700'
                        )}>
                          {shift.name}
                        </span>
                        {isRecommended && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {shift.time}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift Controls */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          {!isShiftActive ? (
            <Button
              onClick={onStartShift}
              disabled={!onStartShift}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Start {activeShift?.name}
            </Button>
          ) : (
            <Button
              onClick={onEndShift}
              disabled={!onEndShift}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              End Shift
            </Button>
          )}
          
          <Button
            onClick={() => onShiftChange(detectedShift)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Auto
          </Button>
        </div>

        {/* Quick Info */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              Current time: {new Date().toLocaleTimeString()} • 
              Detected shift: {SHIFT_CONFIG[detectedShift].name}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}