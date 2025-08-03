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

  // Get status color with enhanced gradients
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-300 shadow-sm';
      case 'active':
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-300 shadow-sm';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-300 shadow-sm';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-300 shadow-sm';
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="bg-card h-full w-full md:h-auto md:max-h-[95vh] md:w-full md:max-w-7xl rounded-2xl shadow-2xl flex flex-col animate-modal-content border border-border/20">
        
        {/* Enhanced Header */}
        <div className="gradient-primary text-white p-6 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm border border-white/30 hover-scale transition-transform duration-200">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-shadow">All Production Batches</h2>
                <p className="text-white/90 text-sm font-medium">
                  Comprehensive view of all production batches for {currentShift} shift
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-12 w-12 p-0 text-white hover:bg-white/20 rounded-xl hover-scale transition-all duration-200 focus-ring border border-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Enhanced Search and Stats Bar */}
        <div className="p-6 border-b border-border/30 gradient-secondary">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            {/* Enhanced Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search by batch number, bread type, or manager..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-white/80 backdrop-blur-sm border-white/50 rounded-xl font-medium placeholder:text-muted-foreground/70 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* Enhanced Stats with 3D effect */}
            <div className="flex gap-4 flex-shrink-0 flex-wrap">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200/50 rounded-xl px-4 py-3 shadow-sm hover-lift-subtle">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">Batches:</span>
                  <span className="font-bold text-blue-900 text-lg">{totalBatches}</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-100 to-green-50 border border-green-200/50 rounded-xl px-4 py-3 shadow-sm hover-lift-subtle">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Quantity:</span>
                  <span className="font-bold text-green-900 text-lg">{totalQuantity}</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200/50 rounded-xl px-4 py-3 shadow-sm hover-lift-subtle">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-700">Completed:</span>
                  <span className="font-bold text-purple-900 text-lg">{completedBatches}</span>
                </div>
              </div>

              {/* Enhanced Refresh Button */}
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                size="sm"
                className="h-12 px-4 bg-white/80 backdrop-blur-sm border-white/50 rounded-xl hover:bg-white transition-all duration-200 hover-scale"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-accent/20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
              <p className="mt-6 text-foreground text-lg font-medium">Loading production batches...</p>
              <p className="text-muted-foreground text-sm mt-2">This may take a few moments</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
              <div className="h-16 w-16 text-destructive mb-4 text-6xl">⚠️</div>
              <p className="text-destructive text-lg font-semibold mb-2">Error loading batches</p>
              <p className="text-muted-foreground text-sm mb-6">Please check your connection and try again</p>
              <Button 
                onClick={() => refetch()} 
                className="gradient-primary text-white hover-scale transition-all duration-200"
              >
                <Package className="h-4 w-4 mr-2" />
                Retry Loading
              </Button>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
              <Package className="h-16 w-16 text-muted-foreground mb-6" />
              <p className="text-foreground text-lg font-semibold mb-2">No batches found</p>
              <p className="text-muted-foreground text-sm text-center max-w-md">
                {searchTerm 
                  ? `No batches match your search for "${searchTerm}". Try adjusting your search terms.`
                  : 'No production batches have been recorded yet for this shift.'
                }
              </p>
            </div>
          ) : (
            <div className="p-6">
              {/* Enhanced Batches Display */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-border/30 overflow-hidden shadow-lg">
                <div className="gradient-warm px-6 py-5 border-b border-border/30">
                  <h3 className="text-xl font-display font-bold text-white text-shadow">Production Batches Overview</h3>
                  <p className="text-white/90 text-sm font-medium mt-1">
                    Showing {filteredBatches.length} of {batches.length} batches
                    {searchTerm && ` • Searching for "${searchTerm}"`}
                  </p>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="divide-y divide-border/20">
                    {filteredBatches.map((batch: BatchWithDetails, index) => (
                      <div key={batch.id} className="p-6 hover:bg-accent/30 transition-all duration-300 hover-lift-subtle group animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="flex items-start justify-between">
                          {/* Enhanced Left Side - Main Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl gradient-primary group-hover:scale-110 transition-transform duration-200">
                                  <Package className="h-5 w-5 text-white" />
                                </div>
                                <h4 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                                  #{batch.batch_number}
                                </h4>
                              </div>
                              <Badge className={`${getStatusColor(batch.status)} font-semibold px-3 py-1.5 text-xs uppercase tracking-wide`}>
                                {getStatusDisplay(batch.status)}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
                                <p className="text-sm font-semibold text-blue-600 mb-1">Bread Type</p>
                                <p className="text-lg font-bold text-blue-900">
                                  {batch.bread_type?.name || 'Unknown Bread'}
                                </p>
                              </div>
                              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200/50">
                                <p className="text-sm font-semibold text-green-600 mb-1">Quantity</p>
                                <p className="text-lg font-bold text-green-900">
                                  {batch.actual_quantity || 0} units
                                </p>
                              </div>
                              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200/50">
                                <p className="text-sm font-semibold text-orange-600 mb-1">Unit Price</p>
                                <p className="text-lg font-bold text-orange-900">
                                  ₦{batch.bread_type?.unit_price || 0}
                                </p>
                              </div>
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50">
                                <p className="text-sm font-semibold text-purple-600 mb-1">Manager</p>
                                <p className="text-lg font-bold text-purple-900">
                                  {batch.created_by_user?.name || 'Unknown'}
                                </p>
                              </div>
                            </div>

                            {/* Enhanced Additional Details */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                              <div className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-2 border border-border/30">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                  {new Date(batch.created_at).toLocaleDateString()} at{' '}
                                  {new Date(batch.created_at).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              {batch.start_time && (
                                <div className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-2 border border-border/30">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span className="font-medium">Started: {new Date(batch.start_time).toLocaleTimeString()}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-2 border border-border/30">
                                <User className="h-4 w-4 text-primary" />
                                <span className="font-medium">Shift: {batch.shift}</span>
                              </div>
                            </div>

                            {/* Enhanced Notes */}
                            {batch.notes && (
                              <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/50">
                                <div className="flex items-start gap-3">
                                  <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-blue-700 mb-2">Production Notes</p>
                                    <p className="text-sm text-blue-600 leading-relaxed">
                                      {batch.notes}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Enhanced Status Details */}
                            {batch.status === 'completed' && batch.end_time && (
                              <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200/50">
                                <div className="flex items-start gap-3">
                                  <div className="w-3 h-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-green-700 mb-2">Batch Completed</p>
                                    <p className="text-sm text-green-600">
                                      Successfully finished at {new Date(batch.end_time).toLocaleTimeString()} on {new Date(batch.end_time).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {batch.status === 'active' && (
                              <div className="mt-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200/50">
                                <div className="flex items-start gap-3">
                                  <div className="w-3 h-3 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full mt-1.5 flex-shrink-0 animate-pulse"></div>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-yellow-700 mb-2">Currently in Production</p>
                                    <p className="text-sm text-yellow-600">
                                      This batch is actively being produced
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

        {/* Enhanced Footer */}
        <div className="p-6 border-t border-border/30 gradient-warm rounded-b-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-white/90">
              {filteredBatches.length > 0 && (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 font-medium">
                    Total Quantity: <span className="font-bold">{totalQuantity}</span>
                  </span>
                  <span className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 font-medium">
                    Completed: <span className="font-bold">{completedBatches}</span>
                  </span>
                  <span className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 font-medium">
                    Total Batches: <span className="font-bold">{totalBatches}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex items-center gap-2 bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm transition-all duration-200 hover-scale"
              >
                <ArrowLeft className="h-4 w-4" />
                Close
              </Button>
              <Button
                onClick={handleExportAll}
                className="flex items-center gap-2 bg-white text-orange-600 hover:bg-white/90 font-semibold transition-all duration-200 hover-scale"
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