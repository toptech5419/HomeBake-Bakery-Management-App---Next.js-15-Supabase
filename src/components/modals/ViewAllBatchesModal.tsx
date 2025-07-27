'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Package, Clock, User, Calendar, ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getBatches, getAllBatchesWithDetails } from '@/lib/batches/api-actions';
import { Batch } from '@/lib/batches/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ExportAllBatchesModal } from './ExportAllBatchesModal';

interface ViewAllBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift?: 'morning' | 'night';
}

interface BatchWithDetails extends Batch {
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const router = useRouter();

  // Fetch all batches with shift filtering
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
        batch.created_by_user?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [batches, searchTerm]);

  // Calculate summary stats
  const totalBatches = filteredBatches.length;
  const totalQuantity = filteredBatches.reduce((sum, batch) => sum + (batch.actual_quantity || 0), 0);
  const completedBatches = filteredBatches.filter(batch => batch.status === 'completed').length;

  // Handle modal close
  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  // Handle cancel button
  const handleCancel = () => {
    router.push('/dashboard');
  };

  // Handle export all button
  const handleExportAll = () => {
    setIsExportModalOpen(true);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-white h-full w-full md:h-auto md:max-h-[95vh] md:w-full md:max-w-7xl md:rounded-2xl shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">All Batches</h2>
                <p className="text-blue-100 text-sm">
                  View all production batches
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
                  placeholder="Search by batch number, bread type, or manager..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 flex-shrink-0">
              <div className="bg-blue-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Batches:</span>
                  <span className="font-bold text-blue-900">{totalBatches}</span>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Quantity:</span>
                  <span className="font-bold text-green-900">{totalQuantity}</span>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Completed:</span>
                  <span className="font-bold text-purple-900">{completedBatches}</span>
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
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Much Larger and More Prominent */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
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
                  : 'No batches recorded yet'
                }
              </p>
            </div>
          ) : (
            <div className="p-6">
              {/* Batches Table - Much Larger and More Prominent */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Production Batches</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Showing {filteredBatches.length} of {batches.length} batches
                    {searchTerm && ` • Searching for "${searchTerm}"`}
                  </p>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {filteredBatches.map((batch: BatchWithDetails) => (
                      <div key={batch.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          {/* Left Side - Main Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-500" />
                                <h4 className="text-lg font-semibold text-gray-900">
                                  #{batch.batch_number}
                                </h4>
                              </div>
                              <Badge className={getStatusColor(batch.status)}>
                                {getStatusDisplay(batch.status)}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Bread Type</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {batch.bread_type?.name || 'Unknown Bread'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600">Quantity</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {batch.actual_quantity || 0} units
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600">Unit Price</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  ₦{batch.bread_type?.unit_price || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600">Manager</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {batch.created_by_user?.name || 'Unknown'}
                                </p>
                              </div>
                            </div>

                            {/* Additional Details */}
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(batch.created_at).toLocaleDateString()} at{' '}
                                  {new Date(batch.created_at).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              {batch.start_time && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>Started: {new Date(batch.start_time).toLocaleTimeString()}</span>
                                </div>
                              )}
                            </div>

                            {/* Notes */}
                            {batch.notes && (
                              <div className="mt-3 bg-blue-50 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-700 mb-1">Notes</p>
                                    <p className="text-sm text-blue-600">
                                      {batch.notes}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Status Details */}
                            {batch.status === 'completed' && batch.end_time && (
                              <div className="mt-3 bg-green-50 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-green-700 mb-1">Completed</p>
                                    <p className="text-sm text-green-600">
                                      Finished at {new Date(batch.end_time).toLocaleTimeString()}
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
              {filteredBatches.length > 0 && (
                <span>
                  Total Quantity: <span className="font-semibold">{totalQuantity}</span>
                  {' • '}
                  Completed: <span className="font-semibold">{completedBatches}</span>
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
                onClick={handleExportAll}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Export All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Export All Batches Modal */}
      <ExportAllBatchesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        batches={filteredBatches}
      />
    </div>
  );
} 