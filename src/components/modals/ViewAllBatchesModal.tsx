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
      <div className="bg-white h-full w-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-6xl md:rounded-2xl shadow-2xl flex flex-col">
        
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

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by batch ID, bread type, or manager..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
                  : 'Create your first batch to get started'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBatches.map((batch: BatchWithDetails) => (
                <Card key={batch.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-sm">#{batch.batch_number}</span>
                      </div>
                      <Badge className={getStatusColor(batch.status)}>
                        {getStatusDisplay(batch.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Bread Type */}
                    <div>
                      <p className="font-medium text-gray-900">
                        {batch.bread_type?.name || 'Unknown Bread'}
                      </p>
                      <p className="text-sm text-gray-500">
                        ₦{batch.bread_type?.unit_price || 0}
                      </p>
                    </div>

                    {/* Actual Quantity */}
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-gray-400" />
                        <span>Quantity: {batch.actual_quantity} units</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {batch.notes && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-700 mb-1">Notes</p>
                            <p className="text-xs text-gray-600 leading-relaxed">{batch.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Created Time */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(batch.created_at).toLocaleDateString()} at{' '}
                        {new Date(batch.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    {/* Manager */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>
                        {batch.created_by_user?.name || 'Unknown'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredBatches.length} of {batches.length} batches
              {searchTerm && ` • Searching for "${searchTerm}"`}
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
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
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
        currentShift={currentShift}
      />
    </div>
  );
} 