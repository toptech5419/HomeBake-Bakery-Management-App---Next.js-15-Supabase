"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import React, { useCallback, useState } from 'react';
import { RotateCcw, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface BreadType {
  id: string;
  name: string;
}

export default function ProfessionalHistoryFilters({ breadTypes }: { breadTypes: BreadType[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

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
  const activeFiltersCount = [currentBreadType !== 'all', currentShift !== 'all', currentDate !== ''].filter(Boolean).length;

  return (
    <div className="w-full space-y-4">
      {/* Mobile-First Compact Header */}
      <Card className="w-full">
        <div className="p-4">
          {/* Top Row: Title and Quick Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                <Search className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                {hasActiveFilters && (
                  <p className="text-sm text-gray-500">{activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="lg:hidden"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Quick Filters Row - Always Visible */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Shift Quick Filters */}
            <div className="flex rounded-lg border bg-gray-50 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterChange('shift', 'all')}
                className={`h-8 px-3 text-xs font-medium rounded-md ${
                  currentShift === 'all' 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterChange('shift', 'morning')}
                className={`h-8 px-3 text-xs font-medium rounded-md ${
                  currentShift === 'morning' 
                    ? 'bg-orange-100 text-orange-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🌅 Morning
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterChange('shift', 'night')}
                className={`h-8 px-3 text-xs font-medium rounded-md ${
                  currentShift === 'night' 
                    ? 'bg-indigo-100 text-indigo-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🌙 Night
              </Button>
            </div>

            {/* Date Quick Filter */}
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={currentDate}
                className="h-8 text-xs border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                onChange={e => handleFilterChange('date', e.target.value)}
                placeholder="Date"
              />
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentShift !== 'all' && (
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                  {currentShift === 'morning' ? '🌅' : '🌙'} {currentShift}
                  <button 
                    onClick={() => handleFilterChange('shift', 'all')}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {currentBreadType !== 'all' && (
                <Badge className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">
                  {breadTypes.find(b => b.id === currentBreadType)?.name || 'Unknown'}
                  <button 
                    onClick={() => handleFilterChange('bread_type_id', 'all')}
                    className="ml-2 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {currentDate && (
                <Badge className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100">
                  📅 {new Date(currentDate).toLocaleDateString()}
                  <button 
                    onClick={() => handleFilterChange('date', '')}
                    className="ml-2 hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Expanded Filters Section */}
        <div className={`${isExpanded ? 'block lg:block' : 'hidden lg:block'} border-t bg-gray-50`}>
          <div className="p-4 space-y-6">
            {/* Bread Type Filter */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Bread Types</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('bread_type_id', 'all')}
                  className={`h-10 text-xs font-medium justify-start border transition-all ${
                    currentBreadType === 'all' 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  All Types
                </Button>
                {breadTypes.map((bread) => (
                  <Button
                    key={bread.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleFilterChange('bread_type_id', bread.id)}
                    className={`h-10 text-xs font-medium justify-start border transition-all ${
                      currentBreadType === bread.id 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    {bread.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="text-sm text-gray-500">
                  {breadTypes.length} bread types available
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  disabled={!hasActiveFilters}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}