'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Moon, 
  Package, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ProductionTableSkeleton } from '@/components/ui/loading-skeleton';
import { Pagination } from '@/components/ui/pagination';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface NightPerformanceClientProps {
  user: { id: string; email?: string };
  displayName: string;
}

export default function NightPerformanceClient({ user, displayName }: NightPerformanceClientProps) {
  const router = useRouter();
  // Force night shift for this component
  const currentShift = 'night';
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch production items for night shift specifically
  const fetchProductionData = async () => {
    const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
    const currentDate = nigeriaTime.toISOString().split('T')[0];
    
    const params = new URLSearchParams({
      shift: currentShift,
      date: currentDate,
    });

    const response = await fetch(`/api/sales-rep/production?${params.toString()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response.json();
  };

  const {
    data: productionData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['owner-night-production'],
    queryFn: fetchProductionData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  // Extract data with defaults
  const productionItems = productionData?.productionItems || [];
  const source = productionData?.source || 'batches';
  const isEmpty = productionData?.isEmpty || false;
  const currentTime = productionData?.currentTime;
  const reason = productionData?.reason;
  const nextClearTime = productionData?.nextClearTime;
  const isCleared = productionData?.source === 'cleared';
  const isRealTimeActive = true;

  // Use production items directly since we're already filtering by night shift in the API
  const nightProductionItems = productionItems;

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'low'>('all');

  // Calculate current low stock count for display only (DB triggers handle the real tracking)
  const currentLowStockCount = nightProductionItems?.filter(item => 
    item.available <= 5 && item.available > 0
  ).length || 0;

  // Memoized pagination calculations
  const paginatedData = useMemo(() => {
    if (!nightProductionItems.length) {
      return {
        items: [],
        totalPages: 0,
        filteredCount: 0
      };
    }

    // Apply search and filter first
    const filteredItems = nightProductionItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        activeFilter === 'all' ||
        (activeFilter === 'available' && item.available > 0) ||
        (activeFilter === 'low' && item.available <= 5 && item.available > 0);
      return matchesSearch && matchesFilter;
    });

    // Then paginate
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalPages,
      filteredCount: filteredItems.length
    };
  }, [nightProductionItems, searchTerm, activeFilter, currentPage, itemsPerPage]);

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  const getStatusIndicator = (available: number) => {
    if (available === 0) return <XCircle className="h-4 w-4 text-red-500" />;
    if (available <= 5) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const filterProducts = (filter: 'all' | 'available' | 'low') => {
    setActiveFilter(filter);
  };

  const refreshProducts = () => {
    refetch();
  };

  const handleBackNavigation = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <Moon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Night Performance</h1>
              <p className="text-purple-100 text-xs sm:text-sm truncate">
                Production items & metrics • {displayName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-purple-50/30 to-indigo-50/30">
        <div className="px-3 sm:px-4 py-4 space-y-4 sm:space-y-6">

          {/* Alert - Compact with Low Stock Tracking Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <span className="text-purple-800 text-sm">
                Night shift performance data loaded successfully.
              </span>
            </div>
            {currentLowStockCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-amber-800 text-sm font-medium">
                  {currentLowStockCount} low stock item{currentLowStockCount !== 1 ? 's' : ''} detected (auto-tracked by system)
                </span>
              </div>
            )}
          </div>

          {/* Controls - Mobile First Design */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-purple-200/50 shadow-sm">
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search bread types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm bg-white"
                />
              </div>

              {/* Filter Tabs - Compact */}
              <div className="bg-gray-50 rounded-lg p-1 flex">
                <button
                  onClick={() => filterProducts('all')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors",
                    activeFilter === 'all' 
                      ? "bg-purple-500 text-white" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => filterProducts('available')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors",
                    activeFilter === 'available' 
                      ? "bg-purple-500 text-white" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Available
                </button>
                <button
                  onClick={() => filterProducts('low')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors",
                    activeFilter === 'low' 
                      ? "bg-purple-500 text-white" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Low Stock
                </button>
              </div>

              {/* Header with Refresh Button */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-600" />
                  Night Shift Items
                  {isRealTimeActive && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Live
                    </span>
                  )}
                </h3>
                <button
                  onClick={refreshProducts}
                  className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Production Items */}
          <ErrorBoundary>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm border border-purple-200/50">
              
              {/* Loading State */}
              {isLoading && (
                <div className="p-6">
                  <ProductionTableSkeleton rows={3} />
                </div>
              )}
              
              {/* Error State */}
              {error && (
                <div className="p-6 sm:p-8 text-center">
                  <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
                  <h4 className="text-base sm:text-lg font-semibold text-red-900 mb-2">Failed to load production data</h4>
                  <p className="text-sm text-red-700 mb-4">{error.message}</p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    Try Again
                  </button>
                </div>
              )}
              
              {/* Empty/Cleared State */}
              {!isLoading && !error && (isEmpty || isCleared) && (
                <div className="p-6 sm:p-8 text-center text-gray-500">
                  <Package className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-4 text-gray-300" />
                  <div className="space-y-3">
                    <p className="font-medium text-base sm:text-lg">
                      {isCleared ? 'Production cleared for night shift' : 'No production items yet'}
                    </p>
                    <p className="text-sm">
                      {reason || 'Night shift clears at 3:00 PM (15:00)'}
                    </p>
                    {nextClearTime && (
                      <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-lg inline-block">
                        {nextClearTime}
                      </p>
                    )}
                    {currentTime && (
                      <p className="text-xs text-gray-400">
                        Current time: {new Date(currentTime).toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Production Items - Compact Mobile Design */}
              {!isLoading && !error && !isEmpty && !isCleared && (
                <>
                  {paginatedData.items.map((item, index) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-100 hover:bg-purple-50/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIndicator(item.available)}
                            <span className="font-semibold text-gray-900 text-sm truncate">{item.name}</span>
                            {item.size && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                                {item.size}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                                {item.available} available
                              </span>
                            </div>
                            <div>
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                {item.produced} produced
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Batch: {item.batch_number}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className="font-semibold text-green-600 text-sm mb-1">
                            {formatCurrencyNGN(item.unit_price)}
                          </div>
                          <div className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            item.available === 0
                              ? "bg-gray-100 text-gray-400"
                              : item.available <= 5
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          )}>
                            {item.available === 0 ? 'Sold Out' : 
                             item.available <= 5 ? 'Low Stock' : 'Available'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* No items after filtering */}
                  {paginatedData.items.length === 0 && (
                    <div className="p-6 sm:p-8 text-center text-gray-500">
                      <Package className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-4 text-gray-300" />
                      <p className="font-medium text-sm">No items match your search criteria</p>
                      <p className="text-xs mt-1">Try adjusting your search or filter options</p>
                    </div>
                  )}
                  
                  {/* Pagination - Compact */}
                  {paginatedData.totalPages > 1 && (
                    <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-purple-50/50">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={paginatedData.totalPages}
                        onPageChange={setCurrentPage}
                        className="justify-center"
                      />
                      <div className="text-center text-xs text-gray-600 mt-2">
                        Showing {paginatedData.items.length} of {paginatedData.filteredCount} items
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ErrorBoundary>

        </div>
      </div>
    </div>
  );
}