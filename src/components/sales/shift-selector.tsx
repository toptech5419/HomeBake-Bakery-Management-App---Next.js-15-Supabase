"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useShift } from '@/hooks/use-shift';
import { Sun, Moon, Clock } from 'lucide-react';

interface ShiftSelectorProps {
  onShiftChange?: (shift: 'morning' | 'night') => void;
  className?: string;
}

export default function ShiftSelector({ onShiftChange, className }: ShiftSelectorProps) {
  const { shift, setShift } = useShift();

  const handleShiftChange = (newShift: 'morning' | 'night') => {
    setShift(newShift);
    onShiftChange?.(newShift);
  };

  return (
    <Card className={`p-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Current Shift</span>
        </div>
        <Badge variant={shift === 'morning' ? 'default' : 'secondary'}>
          {shift === 'morning' ? (
            <>
              <Sun className="h-3 w-3 mr-1" />
              Morning
            </>
          ) : (
            <>
              <Moon className="h-3 w-3 mr-1" />
              Night
            </>
          )}
        </Badge>
      </div>
      
      <div className="flex space-x-2 mt-3">
        <Button
          variant={shift === 'morning' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleShiftChange('morning')}
          className="flex-1"
        >
          <Sun className="h-4 w-4 mr-2" />
          Morning
        </Button>
        <Button
          variant={shift === 'night' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleShiftChange('night')}
          className="flex-1"
        >
          <Moon className="h-4 w-4 mr-2" />
          Night
        </Button>
      </div>
    </Card>
  );
} 