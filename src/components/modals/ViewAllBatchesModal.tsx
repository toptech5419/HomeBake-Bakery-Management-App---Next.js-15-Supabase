'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, Package, Clock, User, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getAllBatchesWithDetails } from '@/lib/batches/api-actions';

interface ViewAllBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift?: 'morning' | 'night';
}

interface BatchWithDetails {
  id: string;
  bread_type_id: string;
  batch_number: string;
  start_time: string;
  end_time?: string;
  actual_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  shift: 'morning' | 'night';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  bread_type?: {
    name: string;
    unit_price: number;
  };
  created_by_user?: {
    name?: string;
  };
}

export function ViewAllBatchesModal({ isOpen, onClose, currentShift = 'morning' }: ViewAllBatchesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all batches for the current day and shift
  const {
    data: batches = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['batches', 'all', 'details', currentShift],
    queryFn: () => getAllBatchesWithDetails(currentShift),
    enabled: isOpen,
    staleTime: 30000, // 30 seconds
  });

  // Filter and search batches
  const filteredBatches = useMemo(() => {
    return (batches as BatchWithDetails[]).filter((batch: BatchWithDetails) => {
      const matchesSearch = searchTerm === '' || 
        batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.bread_type?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.created_by_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.actual_quantity.toString().includes(searchTerm);

      return matchesSearch;
    });
  }, [batches, searchTerm]);

  // Calculate summary stats
  const totalBatches = filteredBatches.length;
  const totalQuantity = useMemo(() => {
    return filteredBatches.reduce((sum, batch) => sum + (batch.actual_quantity || 0), 0);
  }, [filteredBatches]);
  const completedBatches = useMemo(() => {
    return filteredBatches.filter(batch => batch.status === 'completed').length;
  }, [filteredBatches]);

  // Handle modal close
  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get status display text
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'Active';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white h-full w-full md:h-[90vh] md:max-h-[90vh] md:w-full md:max-w-4xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">All Production Batches</h2>
                <p className="text-orange-100 text-sm">
                  View all batches for the {currentShift} shift
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-full bg-white/10 backdrop-blur-sm shadow-lg hover:scale-105 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search and Stats Bar */}
        <div className="p-4 border-b border-gray-200 bg-orange-50">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by batch number, bread type, quantity, or manager..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full md:max-w-sm"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
              <div className="bg-orange-50 rounded-lg px-3 py-1.5 border border-orange-200">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3 w-3 text-orange-600" />
                  <span className="font-medium text-orange-700">Batches:</span>
                  <span className="font-bold text-orange-900">{totalBatches}</span>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg px-3 py-1.5 border border-green-200">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3 w-3 text-green-600" />
                  <span className="font-medium text-green-700">Quantity:</span>
                  <span className="font-bold text-green-900">{totalQuantity}</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-200">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-blue-600" />
                  <span className="font-medium text-blue-700">Completed:</span>
                  <span className="font-bold text-blue-900">{completedBatches}</span>
                </div>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                size="sm"
                className="h-7 w-7 p-0"
              >
                {isLoading ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-orange-600" />
                ) : (
                  <Package className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Optimized for Mobile Scrolling */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
              <p className="mt-6 text-gray-600 text-lg">Loading batches...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 text-red-500 mb-4">⚠️</div>
              <p className="text-red-600 text-lg mb-2">Error loading batches</p>
              <p className="text-gray-500 text-sm">Please try again</p>
              <Button onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg mb-2">No batches found</p>
              <p className="text-gray-500 text-sm">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'No batches recorded for this shift yet'
                }
              </p>
            </div>
          ) : (
            <div className="p-4">
              {/* Results Header */}
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  Showing {filteredBatches.length} of {batches.length} batches
                  {searchTerm && ` • Searching for "${searchTerm}"`}
                </p>
              </div>
                
              {/* Batches List - Compact Mobile Cards */}
              <div className="space-y-3">
                {filteredBatches.map((batch: BatchWithDetails) => (
                  <div key={batch.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-orange-500" />
                        <h4 className="text-base font-semibold text-gray-900 truncate">
                          #{batch.batch_number}
                        </h4>
                      </div>
                      <Badge className={getStatusColor(batch.status)} variant="outline">
                        {getStatusDisplay(batch.status)}
                      </Badge>
                    </div>
                    
                    {/* Main Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bread Type</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {batch.bread_type?.name || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {batch.actual_quantity || 0} units
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Price</p>
                        <p className="text-sm font-semibold text-orange-600">
                          ₦{batch.bread_type?.unit_price || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manager</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {batch.created_by_user?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Footer Row - Time and Extras */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(batch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{batch.shift}</span>
                        </div>
                        {batch.start_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Started: {new Date(batch.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes Section */}
                    {batch.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {batch.notes}
                        </p>
                      </div>
                    )}

                    {/* Status Details */}
                    {batch.status === 'completed' && batch.end_time && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <p className="text-xs text-green-600">
                            Completed at {new Date(batch.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )}

                    {batch.status === 'active' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <p className="text-xs text-blue-600">
                            Currently in production
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}