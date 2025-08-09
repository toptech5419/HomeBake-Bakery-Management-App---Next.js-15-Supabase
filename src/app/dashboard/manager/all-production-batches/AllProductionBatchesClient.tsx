'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Package, Clock, User, Calendar, TrendingUp, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getAllBatchesWithDetails } from '@/lib/batches/api-actions';
import { useShift } from '@/contexts/ShiftContext';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { motion } from 'framer-motion';

interface AllProductionBatchesClientProps {
  userId: string;
  userName: string;
  userRole: 'manager' | 'owner';
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

export function AllProductionBatchesClient({ userName }: AllProductionBatchesClientProps) {
  const { currentShift } = useShift();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch all batches for the current day and shift
  const {
    data: batches = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['batches', 'all', 'details', currentShift],
    queryFn: () => getAllBatchesWithDetails(currentShift),
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

      const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batches, searchTerm, statusFilter]);

  // Calculate summary stats
  const totalBatches = filteredBatches.length;
  const totalQuantity = useMemo(() => {
    return filteredBatches.reduce((sum, batch) => sum + (batch.actual_quantity || 0), 0);
  }, [filteredBatches]);
  const totalValue = useMemo(() => {
    return filteredBatches.reduce((sum, batch) => {
      const unitPrice = batch.bread_type?.unit_price || 0;
      const quantity = batch.actual_quantity || 0;
      return sum + (unitPrice * quantity);
    }, 0);
  }, [filteredBatches]);
  const activeBatches = useMemo(() => {
    return filteredBatches.filter(batch => batch.status === 'active').length;
  }, [filteredBatches]);
  const completedBatches = useMemo(() => {
    return filteredBatches.filter(batch => batch.status === 'completed').length;
  }, [filteredBatches]);

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

  const handleRefresh = () => {
    refetch();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">All Production Batches</h1>
              <p className="text-orange-100 text-xs sm:text-sm truncate">
                {currentShift?.charAt(0).toUpperCase() + currentShift?.slice(1)} Shift • {userName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-orange-50/30 to-yellow-50/30">
        <div className="px-3 sm:px-4 py-4 space-y-4 sm:space-y-6">
          
          {/* Summary Stats - Compact Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-orange-200/50 shadow-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{totalBatches}</div>
                <div className="text-xs text-gray-600 mt-1">Total Batches</div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-orange-200/50 shadow-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{totalQuantity}</div>
                <div className="text-xs text-gray-600 mt-1">Total Units</div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-orange-200/50 shadow-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">{activeBatches}</div>
                <div className="text-xs text-gray-600 mt-1">Active Now</div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-orange-200/50 shadow-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{formatCurrencyNGN(totalValue)}</div>
                <div className="text-xs text-gray-600 mt-1">Total Value</div>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls - Mobile First */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 sm:p-6 border border-orange-200/50 shadow-sm">
            <div className="space-y-3 sm:space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 h-4 w-4 sm:h-5 sm:w-5" />
                <Input
                  placeholder="Search batches, bread types, managers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 sm:pl-12 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-orange-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent bg-white/70 backdrop-blur-sm"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by status:</span>
                  <div className="flex gap-1 sm:gap-2">
                    {[
                      { value: 'all', label: 'All', count: totalBatches },
                      { value: 'active', label: 'Active', count: activeBatches },
                      { value: 'completed', label: 'Done', count: completedBatches }
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value)}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
                          statusFilter === filter.value
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        }`}
                      >
                        {filter.label} ({filter.count})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
                  {(searchTerm || statusFilter !== 'all') && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      Clear
                    </button>
                  )}
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>

              {/* Active Filter Display */}
              {(searchTerm || statusFilter !== 'all') && (
                <div className="flex items-center gap-2 pt-2 border-t border-orange-100">
                  <span className="text-xs text-gray-500">Showing:</span>
                  <span className="text-xs sm:text-sm font-medium text-orange-700">
                    {filteredBatches.length} of {batches.length} batches
                    {searchTerm && ` matching "${searchTerm}"`}
                    {statusFilter !== 'all' && ` (${statusFilter})`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Batches List */}
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-8 sm:p-12 border border-orange-200/50 shadow-sm">
              <div className="flex flex-col items-center justify-center">
                <div className="h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
                <p className="mt-4 sm:mt-6 text-gray-600 text-sm sm:text-lg">Loading production batches...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-8 sm:p-12 border border-orange-200/50 shadow-sm">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-4xl sm:text-5xl mb-4">⚠️</div>
                <p className="text-red-600 text-lg mb-2">Error loading batches</p>
                <p className="text-gray-500 text-sm mb-4">Please try again</p>
                <Button onClick={handleRefresh} className="bg-orange-500 hover:bg-orange-600">
                  Retry
                </Button>
              </div>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-8 sm:p-12 border border-orange-200/50 shadow-sm">
              <div className="flex flex-col items-center justify-center text-center">
                <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg mb-2">No batches found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'No production batches recorded for this shift yet'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* Batch Cards - Mobile-First Design */}
              {filteredBatches.map((batch: BatchWithDetails, index) => (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-orange-200/50 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* Header Row - Compact */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-md flex items-center justify-center flex-shrink-0">
                        <Package className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          #{batch.batch_number}
                        </h4>
                        <p className="text-xs text-gray-600 truncate">
                          {batch.bread_type?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(batch.status)} text-xs px-2 py-1 flex-shrink-0`} variant="outline">
                      {getStatusDisplay(batch.status)}
                    </Badge>
                  </div>

                  {/* Compact Details Grid - 2 columns */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Quantity</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {batch.actual_quantity || 0} units
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Value</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrencyNGN((batch.bread_type?.unit_price || 0) * (batch.actual_quantity || 0))}
                      </p>
                    </div>
                  </div>

                  {/* Compact Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <span>{new Date(batch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="capitalize">{batch.shift}</span>
                    {batch.status === 'active' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    {batch.status === 'completed' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}