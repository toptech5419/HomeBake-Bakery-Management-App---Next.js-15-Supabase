'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, TrendingUp, Calendar, DollarSign, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';

interface ViewAllSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift?: 'morning' | 'night';
  userId: string;
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

export function ViewAllSalesModal({ 
  isOpen, 
  onClose, 
  currentShift = 'morning',
  userId 
}: ViewAllSalesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

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

      return data as SalesLogWithDetails[];
    },
    enabled: isOpen,
    staleTime: 30000, // 30 seconds
  });

  // Filter and search sales
  const filteredSales = useMemo(() => {
    return (sales as SalesLogWithDetails[]).filter((sale: SalesLogWithDetails) => {
      const matchesSearch = searchTerm === '' || 
        sale.bread_types.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.recorded_by_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.quantity.toString().includes(searchTerm);

      return matchesSearch;
    });
  }, [sales, searchTerm]);

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

  // Handle modal close
  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };


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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white h-full w-full md:h-[90vh] md:max-h-[90vh] md:w-full md:max-w-4xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">All Sales</h2>
                <p className="text-green-100 text-sm">
                  View all sales for the {currentShift} shift
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
                  placeholder="Search by bread type, quantity, or seller..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full md:max-w-sm"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
              <div className="bg-green-50 rounded-lg px-3 py-1.5 border border-green-200">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="font-medium text-green-700">Revenue:</span>
                  <span className="font-bold text-green-900">{formatCurrencyNGN(totalRevenue)}</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-200">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3 w-3 text-blue-600" />
                  <span className="font-medium text-blue-700">Items:</span>
                  <span className="font-bold text-blue-900">{totalItemsSold}</span>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg px-3 py-1.5 border border-purple-200">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-purple-600" />
                  <span className="font-medium text-purple-700">Sales:</span>
                  <span className="font-bold text-purple-900">{filteredSales.length}</span>
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
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Optimized for Mobile Scrolling */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
              <p className="mt-6 text-gray-600 text-lg">Loading sales...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 text-red-500 mb-4">⚠️</div>
              <p className="text-red-600 text-lg mb-2">Error loading sales</p>
              <p className="text-gray-500 text-sm">Please try again</p>
              <Button onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <TrendingUp className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg mb-2">No sales found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : 'No sales recorded for this shift yet'
                  }
                </p>
            </div>
          ) : (
            <div className="p-4">
              {/* Results Header */}
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  Showing {filteredSales.length} of {sales.length} sales
                  {searchTerm && ` • Searching for "${searchTerm}"`}
                </p>
              </div>
                
              {/* Sales List - Compact Mobile Cards */}
              <div className="space-y-3">
                {filteredSales.map((sale: SalesLogWithDetails) => (
                  <div key={sale.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <h4 className="text-base font-semibold text-gray-900 truncate">
                          {sale.bread_types.name}
                        </h4>
                      </div>
                      <Badge className={getStatusColor(sale.returned)} variant="outline">
                        {getStatusDisplay(sale.returned)}
                      </Badge>
                    </div>
                    
                    {/* Main Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</p>
                        <p className="text-sm font-semibold text-gray-900">{sale.quantity} units</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Price</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrencyNGN(sale.unit_price || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrencyNGN((sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seller</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {sale.recorded_by_user?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Footer Row - Time and Extras */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {sale.discount && sale.discount > 0 && (
                          <span className="text-red-600">-{formatCurrencyNGN(sale.discount)}</span>
                        )}
                        {sale.leftover && sale.leftover > 0 && (
                          <span className="text-yellow-600">{sale.leftover} left</span>
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
    </div>
  );
}