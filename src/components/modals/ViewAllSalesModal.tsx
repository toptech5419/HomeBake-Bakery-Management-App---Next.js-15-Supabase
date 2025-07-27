'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, TrendingUp, Clock, User, Calendar, ArrowLeft, DollarSign, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  // Fetch all sales for the current day and user
  const {
    data: sales = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['sales', 'all', 'details', currentShift, userId],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

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
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
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

  // Handle cancel button
  const handleCancel = () => {
    router.push('/dashboard');
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-white h-full w-full md:h-auto md:max-h-[95vh] md:w-full md:max-w-7xl md:rounded-2xl shadow-2xl flex flex-col">
        
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
                  View all sales for today's {currentShift} shift
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search and Stats Bar */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by bread type, quantity, or seller..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 flex-shrink-0">
              <div className="bg-green-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Revenue:</span>
                  <span className="font-bold text-green-900">{formatCurrencyNGN(totalRevenue)}</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Items:</span>
                  <span className="font-bold text-blue-900">{totalItemsSold}</span>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Sales:</span>
                  <span className="font-bold text-purple-900">{filteredSales.length}</span>
                </div>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                size="sm"
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

        {/* Main Content Area - Much Larger and More Prominent */}
        <div className="flex-1 overflow-y-auto">
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
                  : 'No sales recorded for today\'s shift yet'
                }
              </p>
            </div>
          ) : (
            <div className="p-6">
              {/* Sales Table - Much Larger and More Prominent */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Sales Records</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Showing {filteredSales.length} of {sales.length} sales
                    {searchTerm && ` • Searching for "${searchTerm}"`}
                  </p>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {filteredSales.map((sale: SalesLogWithDetails) => (
                      <div key={sale.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          {/* Left Side - Main Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {sale.bread_types.name}
                                </h4>
                              </div>
                              <Badge className={getStatusColor(sale.returned)}>
                                {getStatusDisplay(sale.returned)}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Quantity</p>
                                <p className="text-lg font-semibold text-gray-900">{sale.quantity} units</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600">Unit Price</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrencyNGN(sale.unit_price || 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                                <p className="text-lg font-semibold text-green-600">
                                  {formatCurrencyNGN((sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0))}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600">Seller</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {sale.recorded_by_user?.name || 'Unknown'}
                                </p>
                              </div>
                            </div>

                            {/* Additional Details */}
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(sale.created_at).toLocaleDateString()} at{' '}
                                  {new Date(sale.created_at).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              {sale.discount && sale.discount > 0 && (
                                <div className="flex items-center gap-2 text-red-600">
                                  <span>Discount: -{formatCurrencyNGN(sale.discount)}</span>
                                </div>
                              )}
                            </div>

                            {/* Leftovers */}
                            {sale.leftover && sale.leftover > 0 && (
                              <div className="mt-3 bg-yellow-50 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-700 mb-1">Leftovers</p>
                                    <p className="text-sm text-yellow-600">
                                      {sale.leftover} units remaining
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredSales.length > 0 && (
                <span>
                  Total Revenue: <span className="font-semibold">{formatCurrencyNGN(totalRevenue)}</span>
                  {' • '}
                  Total Items: <span className="font-semibold">{totalItemsSold}</span>
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleClose}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <TrendingUp className="h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 