'use client';

import React, { useState, useEffect } from 'react';
import { useActiveBatches } from '@/hooks/use-batches-query';
import { useShift } from '@/contexts/ShiftContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  PlusCircle, 
  FileText, 
  Clock, 
  TrendingUp, 
  Package, 
  Sparkles,
  Activity,
  BarChart3,
  Zap,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { CreateBatchModal } from '@/components/modals/CreateBatchModal';
import { ExportAllBatchesModal } from '@/components/modals/ExportAllBatchesModal';
import { ViewAllBatchesModal } from '@/components/modals/ViewAllBatchesModal';
import { format } from 'date-fns';
import { useOptimizedToast } from '@/components/ui/toast-optimized';
import { motion, AnimatePresence, MotionValue, useMotionValue, useTransform, animate } from 'framer-motion';
import { OptimizedLoadingSpinner, SkeletonCard, MobileLoading } from '@/components/ui/loading-optimized';

interface ProductionClientProps {
  userRole: string;
  userId: string;
}

// Animated Counter Component
const AnimatedCounter = ({ value, className }: { value: number; className?: string }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration: 1, ease: "easeOut" });
    return controls.stop;
  }, [value, count]);

  return <motion.span className={className}>{rounded}</motion.span>;
};

// Metric Card Component
const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  delay = 0,
  loading = false 
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  delay?: number;
  loading?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ 
      duration: 0.5, 
      delay,
      ease: [0.25, 0.46, 0.45, 0.94]
    }}
    whileHover={{ 
      scale: 1.02,
      transition: { duration: 0.2 }
    }}
  >
    <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50">
      <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <div className="flex items-baseline gap-1">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <AnimatedCounter 
                  value={value} 
                  className="text-3xl font-bold text-gray-900" 
                />
              )}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Batch Item Component
const BatchItem = ({ 
  batch, 
  index 
}: { 
  batch: any; 
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ 
      delay: index * 0.1,
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94]
    }}
    whileHover={{ 
      scale: 1.01,
      transition: { duration: 0.2 }
    }}
    className="group relative"
  >
    <div className="p-4 rounded-xl border border-gray-100 bg-white hover:border-orange-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
              {(batch as any).bread_type?.name || 'Unknown'}
            </h3>
            <Badge 
              variant="secondary" 
              className="text-xs bg-orange-100 text-orange-700 border-orange-200"
            >
              #{batch.batch_number}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Created {format(new Date(batch.created_at), 'h:mm a')}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <AnimatedCounter 
              value={batch.actual_quantity || 0} 
              className="text-xl font-bold text-gray-900" 
            />
            <span className="text-xs text-gray-500">units</span>
          </div>
          <div className="w-16 h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((batch.actual_quantity || 0) / 100 * 100, 100)}%` }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
            />
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// Empty State Component
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    className="text-center py-12"
  >
    <div className="relative">
      <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
        <Package className="w-10 h-10 text-orange-600" />
      </div>
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
        <Sparkles className="w-3 h-3 text-white" />
      </div>
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Batches</h3>
    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
      Start your production journey by creating your first batch
    </p>
    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
      <Activity className="w-4 h-4" />
      <span>Ready to begin production</span>
    </div>
  </motion.div>
);

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} className="h-32" />
      ))}
    </div>
    
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-4 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBatchCreated = () => {
    setIsCreateModalOpen(false);
    toast({
      title: '🎉 Batch Created Successfully!',
      description: 'Your new production batch has been added to the system',
      type: 'success'
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshBatches();
      toast({
        title: '🔄 Data Refreshed',
        description: 'Production data has been updated',
        type: 'success'
      });
    } catch (error) {
      toast({
        title: '❌ Refresh Failed',
        description: 'Unable to refresh data. Please try again.',
        type: 'error'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportAll = () => {
    setIsExportModalOpen(true);
  };

  const handleReports = () => {
    setIsViewAllModalOpen(true);
  };

  const totalProduction = activeBatches.reduce((sum, batch) => sum + (batch.actual_quantity || 0), 0);
  const uniqueBreadTypes = new Set(activeBatches.map(batch => (batch as any).bread_type?.name)).size;

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Production</h1>
                <p className="text-gray-600">{currentShift} Shift • Active</p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                  <Clock className="w-3 h-3 mr-1" />
                  Live
                </Badge>
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
            <Card className="border-red-200 bg-white/80 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
                <p className="text-gray-600 mb-6">Unable to load production data. Please check your connection.</p>
                <Button 
                  onClick={handleRefresh} 
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <motion.h1 
                className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                Production
              </motion.h1>
              <motion.p 
                className="text-gray-600 flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                {currentShift} Shift • Active
              </motion.p>
            </div>
            <motion.div 
              className="mt-4 sm:mt-0 flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                <Clock className="w-3 h-3 mr-1" />
                Live
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
                className="text-gray-600 hover:text-orange-600"
              >
                Refresh
              </Button>
            </motion.div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <MetricCard
              title="Total Production"
              value={totalProduction}
              icon={TrendingUp}
              color="bg-orange-500"
              delay={0.1}
              loading={isLoading}
            />
            <MetricCard
              title="Active Batches"
              value={activeBatches.length}
              icon={Package}
              color="bg-blue-500"
              delay={0.2}
              loading={isLoading}
            />
            <MetricCard
              title="Bread Types"
              value={uniqueBreadTypes}
              icon={BarChart3}
              color="bg-green-500"
              delay={0.3}
              loading={isLoading}
            />
          </div>

          {/* Batches List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">Current Batches</CardTitle>
                    <CardDescription className="text-gray-600">Active production batches for this shift</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-500">{activeBatches.length} active</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {activeBatches.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="p-4 space-y-3">
                    <AnimatePresence>
                      {activeBatches.map((batch, index) => (
                        <BatchItem key={batch.id} batch={batch} index={index} />
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
            className="mt-8 space-y-4"
          >
            <Button 
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-base font-semibold py-4 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] rounded-xl"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<PlusCircle size={20} />}
            >
              <span>Create New Batch</span>
              <Zap className="w-4 h-4" />
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-base font-semibold py-4 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] rounded-xl"
                onClick={handleExportAll}
                leftIcon={<Download size={20} />}
              >
                <span>Export All</span>
              </Button>
              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-base font-semibold py-4 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] rounded-xl"
                onClick={handleReports}
                leftIcon={<FileText size={20} />}
              >
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
