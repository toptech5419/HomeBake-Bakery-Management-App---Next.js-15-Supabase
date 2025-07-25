'use client';

import React, { useState, useEffect } from 'react';
import { useActiveBatches } from '@/hooks/use-batches-query';
import { useShift } from '@/contexts/ShiftContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Download, PlusCircle, FileText, Clock, TrendingUp, Package } from 'lucide-react';
import { CreateBatchModal } from '@/components/modals/CreateBatchModal';
import { ExportAllBatchesModal } from '@/components/modals/ExportAllBatchesModal';
import { ViewAllBatchesModal } from '@/components/modals/ViewAllBatchesModal';
import { format } from 'date-fns';
import { useOptimizedToast } from '@/components/ui/toast-optimized';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface ProductionClientProps {
  userRole: string;
  userId: string;
}

export function ProductionClient({ userRole, userId }: ProductionClientProps) {
  const { currentShift } = useShift();
  const { toast } = useOptimizedToast();
  
  const { 
    data: activeBatches = [], 
    isLoading, 
    error,
    refetch: refreshBatches 
  } = useActiveBatches(60000, currentShift);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBatchCreated = () => {
    setIsCreateModalOpen(false);
    toast({
      title: 'Success',
      description: 'New batch created successfully',
      type: 'success'
    });
  };

  const handleExportAll = () => {
    setIsExportModalOpen(true);
  };

  const handleReports = () => {
    setIsViewAllModalOpen(true);
  };

  const totalProduction = activeBatches.reduce((sum, batch) => sum + (batch.actual_quantity || 0), 0);
  const uniqueBreadTypes = new Set(activeBatches.map(batch => (batch as any).bread_type?.name)).size;

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Production</h1>
                <p className="text-sm text-gray-600 mt-1">{currentShift} Shift • Active</p>
              </div>
            </div>
            <LoadingSkeleton />
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto"
          >
            <Card className="border-red-200">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
                <p className="text-gray-600 mb-6">Unable to load production data. Please check your connection.</p>
                <Button 
                  onClick={() => refreshBatches()} 
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Production</h1>
              <p className="text-sm text-gray-600 mt-1">{currentShift} Shift • Active</p>
            </div>
            <Badge variant="outline" className="mt-2 sm:mt-0">
              <Clock className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Production</p>
                      <p className="text-2xl font-bold text-gray-900">{totalProduction}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Batches</p>
                      <p className="text-2xl font-bold text-gray-900">{activeBatches.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Bread Types</p>
                      <p className="text-2xl font-bold text-gray-900">{uniqueBreadTypes}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Batches List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <h2 className="text-lg font-semibold text-gray-900">Current Batches</h2>
                <p className="text-sm text-gray-600">Active production batches for this shift</p>
              </CardHeader>
              <CardContent className="p-0">
                {activeBatches.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Batches</h3>
                    <p className="text-gray-600 mb-6">Start by creating your first batch</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    <AnimatePresence>
                      {activeBatches.map((batch, index) => (
                        <motion.div
                          key={batch.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  {(batch as any).bread_type?.name || 'Unknown'}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                  #{batch.batch_number}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Created {format(new Date(batch.created_at), 'h:mm a')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{batch.actual_quantity || 0}</p>
                              <p className="text-xs text-gray-500">units</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 space-y-4"
          >
            <Button 
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-base font-semibold py-4 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusCircle size={20} />
              <span>Create New Batch</span>
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-base font-semibold py-4 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                onClick={handleExportAll}
              >
                <Download size={20} />
                <span>Export All</span>
              </Button>
              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-base font-semibold py-4 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                onClick={handleReports}
              >
                <FileText size={20} />
                <span>Reports</span>
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Modals */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <CreateBatchModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              onBatchCreated={handleBatchCreated}
              currentShift={currentShift}
            />
          )}

          {isExportModalOpen && (
            <ExportAllBatchesModal
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              currentShift={currentShift}
            />
          )}

          {isViewAllModalOpen && (
            <ViewAllBatchesModal
              isOpen={isViewAllModalOpen}
              onClose={() => setIsViewAllModalOpen(false)}
              currentShift={currentShift}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
