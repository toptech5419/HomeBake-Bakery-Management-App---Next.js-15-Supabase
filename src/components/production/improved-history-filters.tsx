"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import React, { useCallback } from 'react';
import { Calendar, Filter, RotateCcw } from 'lucide-react';

interface BreadType {
  id: string;
  name: string;
}

export default function ImprovedHistoryFilters({ breadTypes }: { breadTypes: BreadType[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const currentBreadType = params.get('bread_type_id') || 'all';
  const currentShift = params.get('shift') || 'all';
  const currentDate = params.get('date') || '';

  const handleFilterChange = useCallback((key: string, value: string) => {
    const newParams = new URLSearchParams(params.toString());
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    router.replace(`/dashboard/production/history?${newParams.toString()}`);
  }, [params, router]);

  const clearAllFilters = () => {
    router.replace('/dashboard/production/history');
  };

  const hasActiveFilters = currentBreadType !== 'all' || currentShift !== 'all' || currentDate !== '';

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Filter Production History</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Shift Filter - Tabs */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Shift</Label>
          <div className="flex gap-2">
            <Button
              variant={currentShift === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('shift', 'all')}
              className="flex-1"
            >
              All Shifts
            </Button>
            <Button
              variant={currentShift === 'morning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('shift', 'morning')}
              className="flex-1"
            >
              🌅 Morning
            </Button>
            <Button
              variant={currentShift === 'night' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('shift', 'night')}
              className="flex-1"
            >
              🌙 Night
            </Button>
          </div>
        </div>

        {/* Bread Type Filter - Grid */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Bread Type</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            <Button
              variant={currentBreadType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('bread_type_id', 'all')}
              className="justify-start"
            >
              All Types
            </Button>
            {breadTypes.map((bread) => (
              <Button
                key={bread.id}
                variant={currentBreadType === bread.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('bread_type_id', bread.id)}
                className="justify-start text-left"
              >
                {bread.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date
          </Label>
          <div className="flex gap-2 items-center">
            <Input 
              type="date" 
              value={currentDate}
              className="max-w-xs"
              onChange={e => handleFilterChange('date', e.target.value)}
              placeholder="Select date"
            />
            {currentDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterChange('date', '')}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {currentShift !== 'all' && (
                <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800">
                  {currentShift === 'morning' ? '🌅' : '🌙'} {currentShift}
                  <button 
                    onClick={() => handleFilterChange('shift', 'all')}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {currentBreadType !== 'all' && (
                <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
                  {breadTypes.find(b => b.id === currentBreadType)?.name || 'Unknown'}
                  <button 
                    onClick={() => handleFilterChange('bread_type_id', 'all')}
                    className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {currentDate && (
                <Badge className="flex items-center gap-1 bg-purple-100 text-purple-800">
                  📅 {new Date(currentDate).toLocaleDateString()}
                  <button 
                    onClick={() => handleFilterChange('date', '')}
                    className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}