'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BreadType, ShiftType } from '@/types';
import { ReportFilters } from '@/lib/reports/queries';
import { Filter, RotateCcw, Search, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface ReportFiltersProps {
  breadTypes: BreadType[];
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  loading?: boolean;
}

export default function ReportFiltersComponent({
  breadTypes,
  filters,
  onFiltersChange,
  loading = false
}: ReportFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<ReportFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof ReportFilters, value: string | undefined) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: ReportFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(value => value !== undefined && value !== '');
  const activeFiltersCount = Object.values(localFilters).filter(value => value !== undefined && value !== '').length;

  // Set default date range (last 7 days)
  const getDefaultEndDate = () => new Date().toISOString().split('T')[0];
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };

  return (
    <Card className="w-full">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Report Filters</h3>
              {hasActiveFilters && (
                <p className="text-sm text-gray-500">
                  {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={loading}
                className="text-gray-500 hover:text-gray-700"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="sm:hidden"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Quick Date and Shift Filters - Always Visible */}
        <div className="space-y-4 mb-4">
          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={localFilters.startDate || getDefaultStartDate()}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                disabled={loading}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={localFilters.endDate || getDefaultEndDate()}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                disabled={loading}
                className="mt-1"
              />
            </div>
          </div>

          {/* Shift Quick Filters */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Shift</Label>
            <div className="flex rounded-lg border bg-gray-50 p-1 w-fit">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterChange('shift', undefined)}
                disabled={loading}
                className={`h-8 px-4 text-sm font-medium rounded-md transition-all ${
                  !localFilters.shift
                    ? 'bg-white shadow-sm text-gray-900 border'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Shifts
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterChange('shift', 'morning')}
                disabled={loading}
                className={`h-8 px-4 text-sm font-medium rounded-md transition-all ${
                  localFilters.shift === 'morning'
                    ? 'bg-orange-100 text-orange-800 shadow-sm border border-orange-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🌅 Morning
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterChange('shift', 'night')}
                disabled={loading}
                className={`h-8 px-4 text-sm font-medium rounded-md transition-all ${
                  localFilters.shift === 'night'
                    ? 'bg-indigo-100 text-indigo-800 shadow-sm border border-indigo-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🌙 Night
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-800">Active filters:</span>
            {localFilters.startDate && (
              <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                From: {new Date(localFilters.startDate).toLocaleDateString()}
                <button
                  onClick={() => handleFilterChange('startDate', undefined)}
                  className="ml-2 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  disabled={loading}
                >
                  ×
                </button>
              </Badge>
            )}
            {localFilters.endDate && (
              <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                To: {new Date(localFilters.endDate).toLocaleDateString()}
                <button
                  onClick={() => handleFilterChange('endDate', undefined)}
                  className="ml-2 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  disabled={loading}
                >
                  ×
                </button>
              </Badge>
            )}
            {localFilters.shift && (
              <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                {localFilters.shift === 'morning' ? '🌅' : '🌙'} {localFilters.shift}
                <button
                  onClick={() => handleFilterChange('shift', undefined)}
                  className="ml-2 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  disabled={loading}
                >
                  ×
                </button>
              </Badge>
            )}
            {localFilters.breadTypeId && (
              <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                {breadTypes.find(b => b.id === localFilters.breadTypeId)?.name || 'Unknown Bread'}
                <button
                  onClick={() => handleFilterChange('breadTypeId', undefined)}
                  className="ml-2 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  disabled={loading}
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Expanded Filters Section */}
        <div className={`${isExpanded ? 'block sm:block' : 'hidden sm:block'} space-y-6`}>
          {/* Bread Type Filter */}
          {breadTypes.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Filter by Bread Type
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('breadTypeId', undefined)}
                  disabled={loading}
                  className={`h-10 text-xs font-medium justify-start border transition-all ${
                    !localFilters.breadTypeId
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  All Types
                </Button>
                {breadTypes.map((breadType) => (
                  <Button
                    key={breadType.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleFilterChange('breadTypeId', breadType.id)}
                    disabled={loading}
                    className={`h-10 text-xs font-medium justify-start border transition-all ${
                      localFilters.breadTypeId === breadType.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    {breadType.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing reports for selected criteria • {breadTypes.length} bread types available
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={!hasActiveFilters || loading}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading reports...</span>
          </div>
        )}
      </div>
    </Card>
  );
}