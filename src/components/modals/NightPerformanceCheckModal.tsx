'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
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

interface NightPerformanceCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NightPerformanceCheckModal({ isOpen, onClose }: NightPerformanceCheckModalProps) {
  // Force night shift for this modal
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
    enabled: isOpen, // Only fetch when modal is open
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: isOpen ? 30 * 1000 : false, // Only refetch when modal is open
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ease-in-out"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="min-h-full w-full flex items-start justify-center py-4">
          <div 
            className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl transform transition-all duration-300 ease-in-out max-h-[calc(100vh-2rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Modal Header - Fixed */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Moon size={20} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Night Performance Check
                </h2>
                <p className="text-sm text-gray-600">Production items and performance metrics</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl bg-white border border-gray-200 hover:border-gray-300 backdrop-blur-sm"
              style={{
                background: 'linear-gradient(145deg, #ffffff, #f1f5f9)',
                boxShadow: '8px 8px 16px #d1d5db, -8px -8px 16px #ffffff'
              }}
              aria-label="Close modal"
            >
              <X size={20} className="text-gray-600 hover:text-gray-800 transition-colors duration-200" />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Alert */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <span className="text-purple-800 text-sm">
                Night shift performance data loaded successfully.
              </span>
            </div>

            {/* Search Bar */}
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bread types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border-none outline-none text-sm text-gray-900 placeholder-gray-400 bg-transparent"
              />
            </div>

            {/* Filter Tabs */}
            <div className="bg-gray-50 rounded-xl p-1 flex">
              <button
                onClick={() => filterProducts('all')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors",
                  activeFilter === 'all' 
                    ? "bg-purple-500 text-white" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                All Products
              </button>
              <button
                onClick={() => filterProducts('available')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors",
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
                  "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors",
                  activeFilter === 'low' 
                    ? "bg-purple-500 text-white" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Low Stock
              </button>
            </div>

            {/* Production Table Section */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                Night Shift Production Items
              </h3>
              <button
                onClick={refreshProducts}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <ErrorBoundary>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                <div className="bg-gray-50 px-4 py-4 border-b border-gray-200 font-semibold text-gray-700 text-sm flex items-center justify-between">
                  <div>
                    Production Items for Night Shift
                    {source && source !== 'cleared' && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Source: {source})
                      </span>
                    )}
                    {isRealTimeActive && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Live
                      </span>
                    )}
                  </div>
                  {isFetching && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  )}
                </div>
                
                {/* Loading State */}
                {isLoading && <ProductionTableSkeleton rows={5} />}
                
                {/* Error State */}
                {error && (
                  <div className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-red-900 mb-2">Failed to load production data</h4>
                    <p className="text-sm text-red-700 mb-4">{error.message}</p>
                    <button
                      onClick={() => refetch()}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
                
                {/* Empty/Cleared State */}
                {!isLoading && !error && (isEmpty || isCleared) && (
                  <div className="p-8 text-center text-gray-500">
                    <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                    <div className="space-y-3">
                      <p className="font-medium text-lg">
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
                
                {/* Production Items */}
                {!isLoading && !error && !isEmpty && !isCleared && (
                  <>
                    {paginatedData.items.map((item) => (
                      <div key={item.id} className="px-4 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIndicator(item.available)}
                            <span className="font-semibold text-gray-900">{item.name}</span>
                            {item.size && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {item.size}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3 text-xs text-gray-600">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-medium">
                              {item.available} available
                            </span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg font-medium">
                              {item.produced} produced
                            </span>
                            <span className="text-gray-500">
                              Batch: {item.batch_number}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600 text-sm mb-1">
                            {formatCurrencyNGN(item.unit_price)}
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-lg text-xs font-medium",
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
                    ))}
                    
                    {/* No items after filtering */}
                    {paginatedData.items.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                        <p className="font-medium">No items match your search criteria</p>
                        <p className="text-sm mt-1">Try adjusting your search or filter options</p>
                      </div>
                    )}
                    
                    {/* Pagination */}
                    {paginatedData.totalPages > 1 && (
                      <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={paginatedData.totalPages}
                          onPageChange={setCurrentPage}
                          className="justify-center"
                        />
                        <div className="text-center text-sm text-gray-600 mt-2">
                          Showing {paginatedData.items.length} of {paginatedData.filteredCount} items
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ErrorBoundary>
          </div>

          {/* Modal Footer - Fixed */}
          <div className="border-t border-gray-100 p-6 flex-shrink-0 bg-white rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl p-4 flex items-center justify-center transition-all duration-300 ease-in-out min-h-[44px] touch-manipulation font-medium"
            >
              Close Performance Check
            </button>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}