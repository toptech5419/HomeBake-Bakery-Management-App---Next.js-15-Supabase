'use client';

import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, TrendingUp, Calendar, DollarSign, Package, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { useShift } from '@/contexts/ShiftContext';
import { useRouter } from 'next/navigation';

interface AllSalesClientProps {
  userId: string;
  userName: string;
}

interface SalesLogWithDetails {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price: number | null;
  discount: number | null;
  returned: boolean;
  shift: string;
  recorded_by: string;
  created_at: string;
  leftover: number | null;
  bread_types: {
    name: string;
    unit_price: number;
  };
  recorded_by_user: {
    name: string;
  };
}

export function AllSalesClient({ userId, userName }: AllSalesClientProps) {
  const { currentShift } = useShift();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Fetch all sales for the current day and user
  const {
    data: sales = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['sales', 'all', 'details', currentShift, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_logs')
        .select(`
          *,
          bread_types (
            name,
            unit_price
          ),
          recorded_by_user:users!sales_logs_recorded_by_fkey (
            name
          )
        `)
        .eq('shift', currentShift)
        .eq('recorded_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data as unknown) as SalesLogWithDetails[];
    },
    staleTime: 30000, // 30 seconds
  });

  // Filter and search sales
  const filteredSales = useMemo(() => {
    return (sales as SalesLogWithDetails[]).filter((sale: SalesLogWithDetails) => {
      const matchesSearch = searchTerm === '' || 
        sale.bread_types.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.recorded_by_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.quantity.toString().includes(searchTerm);

      const matchesFilter = 
        filterType === 'all' ||
        (filterType === 'returned' && sale.returned) ||
        (filterType === 'sold' && !sale.returned) ||
        (filterType === 'discounted' && sale.discount && sale.discount > 0) ||
        (filterType === 'high-value' && (sale.quantity * (sale.unit_price || 0)) > 1000);

      return matchesSearch && matchesFilter;
    });
  }, [sales, searchTerm, filterType]);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, sale) => {
      const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
      return sum + amount;
    }, 0);
  }, [filteredSales]);

  // Calculate total items sold
  const totalItemsSold = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
  }, [filteredSales]);

  // Get status color for returned items
  const getStatusColor = (returned: boolean) => {
    return returned 
      ? 'bg-red-100 text-red-700 border-red-200' 
      : 'bg-green-100 text-green-700 border-green-200';
  };

  // Get status display text
  const getStatusDisplay = (returned: boolean) => {
    return returned ? 'Returned' : 'Sold';
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">All Sales</h1>
              <p className="text-green-100 text-sm">
                View all sales for the {currentShift} shift • {userName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Stats Bar */}
      <div className="bg-orange-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex flex-col gap-4">
            {/* Search and Filter Row */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by bread type, quantity, or seller..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 w-full text-base py-3 touch-manipulation min-h-[48px]"
                />
              </div>
              
              {/* Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 text-base font-medium text-gray-700 bg-white min-w-[120px] h-[48px] touch-manipulation"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                  <ChevronDown className={`h-4 w-4 transform transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu with proper z-index */}
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-2">
                      {[
                        { value: 'all', label: 'All Sales', icon: '📊' },
                        { value: 'sold', label: 'Sold Items', icon: '✅' },
                        { value: 'returned', label: 'Returned Items', icon: '↩️' },
                        { value: 'discounted', label: 'With Discount', icon: '💰' },
                        { value: 'high-value', label: 'High Value (>₦1,000)', icon: '⭐' }
                      ].map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => {
                            setFilterType(filter.value);
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                            filterType === filter.value
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-base">{filter.icon}</span>
                          <span className="flex-1 text-left font-medium">{filter.label}</span>
                          {filterType === filter.value && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats - Compact Layout */}
            <div className="flex flex-wrap gap-2 text-sm">
              <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-200 flex items-center gap-2 min-w-0">
                <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="font-medium text-green-700 text-xs">Revenue:</span>
                <span className="font-bold text-green-900 text-sm truncate">{formatCurrencyNGN(totalRevenue)}</span>
              </div>
              <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-blue-700 text-xs">Items:</span>
                <span className="font-bold text-blue-900 text-sm">{totalItemsSold}</span>
              </div>
              <div className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-200 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600 flex-shrink-0" />
                <span className="font-medium text-purple-700 text-xs">Sales:</span>
                <span className="font-bold text-purple-900 text-sm">{filteredSales.length}</span>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                size="sm"
                className="h-12 w-12 p-0 rounded-xl touch-manipulation"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
            <p className="mt-6 text-gray-600 text-lg">Loading sales...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 text-red-500 mb-4 text-4xl">⚠️</div>
            <p className="text-red-600 text-xl mb-2">Error loading sales</p>
            <p className="text-gray-500 text-base">Please try again</p>
            <Button onClick={() => refetch()} className="mt-4 touch-manipulation min-h-[48px]">
              Retry
            </Button>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <TrendingUp className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-600 text-xl mb-2">No sales found</p>
            <p className="text-gray-500 text-base text-center px-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'No sales recorded for this shift yet'
              }
            </p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-4">
            {/* Results Header */}
            <div className="mb-4">
              <p className="text-base text-gray-600">
                Showing {filteredSales.length} of {sales.length} sales
                {searchTerm && ` • Searching for "${searchTerm}"`}
              </p>
            </div>
              
            {/* Sales List - Mobile-Optimized Cards */}
            <div className="space-y-4">
              {filteredSales.map((sale: SalesLogWithDetails) => (
                <div key={sale.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-all duration-200 touch-manipulation">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {sale.bread_types.name}
                      </h3>
                    </div>
                    <Badge className={`${getStatusColor(sale.returned)} px-3 py-1`} variant="outline">
                      {getStatusDisplay(sale.returned)}
                    </Badge>
                  </div>
                  
                  {/* Main Details Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Quantity</p>
                      <p className="text-base font-semibold text-gray-900">{sale.quantity} units</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Unit Price</p>
                      <p className="text-base font-semibold text-gray-900">
                        {sale.unit_price ? formatCurrencyNGN(sale.unit_price) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Total</p>
                      <p className="text-base font-semibold text-green-600">
                        {formatCurrencyNGN((sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Seller</p>
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {sale.recorded_by_user?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Footer Row - Time and Extras */}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {(sale.discount && sale.discount > 0) && (
                        <span className="text-red-600 font-medium">-{formatCurrencyNGN(sale.discount)}</span>
                      )}
                      {(sale.leftover && sale.leftover > 0) && (
                        <span className="text-yellow-600 font-medium">{sale.leftover} left</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}