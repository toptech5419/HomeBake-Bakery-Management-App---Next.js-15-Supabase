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
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { CreateBatchModal } from '@/components/modals/CreateBatchModal';
import { ExportAllBatchesModal } from '@/components/modals/ExportAllBatchesModal';
import { ViewAllBatchesModal } from '@/components/modals/ViewAllBatchesModal';
import { format } from 'date-fns';
import { useOptimizedToast } from '@/components/ui/toast-optimized';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';

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

// Metric Card Component - Mobile-First Optimized
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
    initial={{ opacity: 0, y: 15, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ 
      duration: 0.4, 
      delay,
      ease: [0.25, 0.46, 0.45, 0.94]
    }}
    whileHover={{ 
      scale: 1.01,
      transition: { duration: 0.15 }
    }}
    whileTap={{ scale: 0.99 }}
  >
    <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
      <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-0 group-hover:opacity-3 transition-opacity duration-200`} />
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between min-h-[3rem]">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">{title}</p>
            <div className="flex items-baseline">
              {loading ? (
                <Skeleton className="h-6 w-12 sm:h-7 sm:w-16" />
              ) : (
                <AnimatedCounter 
                  value={value} 
                  className="text-xl sm:text-2xl font-bold text-gray-900" 
                />
              )}
            </div>
          </div>
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${color} bg-opacity-10 group-hover:bg-opacity-15 transition-all duration-200 flex-shrink-0 ml-2`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Batch Item Component - Mobile-First Optimized
const BatchItem = ({ 
  batch, 
  index 
}: { 
  batch: unknown; 
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -15 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 15 }}
    transition={{ 
      delay: index * 0.05,
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94]
    }}
    whileHover={{ 
      scale: 1.005,
      transition: { duration: 0.15 }
    }}
    whileTap={{ scale: 0.995 }}
    className="group relative"
  >
    <div className="p-3 sm:p-4 rounded-lg border border-gray-100 bg-white hover:border-orange-200 hover:shadow-sm transition-all duration-150 min-h-[4.5rem] touch-manipulation">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 group-hover:text-orange-600 transition-colors truncate">
              {(batch as { bread_type?: { name?: string } }).bread_type?.name || 'Unknown'}
            </h3>
            <Badge 
              variant="secondary" 
              className="text-xs bg-orange-100 text-orange-700 border-orange-200 px-2 py-0.5 flex-shrink-0"
            >
              #{batch.batch_number.slice(-3)}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Created {format(new Date(batch.created_at), 'h:mm a')}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-1">
            <AnimatedCounter 
              value={batch.actual_quantity || 0} 
              className="text-lg sm:text-xl font-bold text-gray-900" 
            />
            <span className="text-xs text-gray-500">units</span>
          </div>
          <div className="w-12 sm:w-16 h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((batch.actual_quantity || 0) / 100 * 100, 100)}%` }}
              transition={{ delay: 0.3 + index * 0.05, duration: 0.6 }}
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


export function ProductionClient({ }: ProductionClientProps) {
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
    } catch {
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
  const uniqueBreadTypes = new Set(activeBatches.map(batch => (batch as { bread_type?: { name?: string } }).bread_type?.name)).size;

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
        <div className="container mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Loading Header */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="absolute -inset-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl blur opacity-20"></div>
                <div className="relative bg-white px-6 py-4 rounded-xl shadow-lg border border-orange-100">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent mb-2">
                    Production Hub
                  </h1>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">{currentShift} Shift Active</span>
                    <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs ml-2">
                      <Clock className="w-3 h-3 mr-1" />
                      Live
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Skeleton with New Layout */}
            <div className="space-y-8">
              {/* Stats Section Skeleton */}
              <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <Skeleton className="h-6 w-64 mx-auto mb-2" />
                    <div className="w-16 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mx-auto"></div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                      <div className="flex items-center justify-between relative z-10">
                        <div>
                          <div className="text-orange-100 text-sm font-medium mb-1">Total Production</div>
                          <Skeleton className="h-8 w-16 bg-white bg-opacity-20" />
                        </div>
                        <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-7 h-7 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                        <div className="text-center">
                          <Package className="w-8 h-8 mx-auto mb-2 text-blue-100" />
                          <p className="text-blue-100 text-xs font-medium mb-1">Active Batches</p>
                          <Skeleton className="h-6 w-8 mx-auto bg-white bg-opacity-20" />
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-green-100" />
                          <p className="text-green-100 text-xs font-medium mb-1">Bread Types</p>
                          <Skeleton className="h-6 w-8 mx-auto bg-white bg-opacity-20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Batches Section Skeleton */}
              <Card className="bg-white border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 rounded-lg border border-gray-100 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-6 w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100">
        <div className="container mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto mt-20"
          >
            <Card className="border-red-200 bg-white shadow-xl">
              <CardContent className="text-center py-16 px-8">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Connection Error</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Unable to load production data. Please check your connection and try again.
                </p>
                <Button 
                  onClick={handleRefresh} 
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
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
      <div className="container mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Beautiful Mobile-First Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative inline-block"
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl blur opacity-20"></div>
              <div className="relative bg-white px-6 py-4 rounded-xl shadow-lg border border-orange-100">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent mb-2">
                  Production Hub
                </h1>
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{currentShift} Shift Active</span>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs ml-2">
                    <Clock className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Hero Stats Section - Much More Appealing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Today's Production Overview</h2>
                  <div className="w-16 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mx-auto"></div>
                </div>
                
                {/* Single Column Stats for Mobile Appeal */}
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-orange-100 text-sm font-medium mb-1">Total Production</p>
                        <div className="flex items-baseline gap-2">
                          {isLoading ? (
                            <Skeleton className="h-8 w-16 bg-white bg-opacity-20" />
                          ) : (
                            <AnimatedCounter value={totalProduction} className="text-3xl font-bold" />
                          )}
                          <span className="text-orange-200 text-sm">units</span>
                        </div>
                      </div>
                      <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white"
                    >
                      <div className="text-center">
                        <Package className="w-8 h-8 mx-auto mb-2 text-blue-100" />
                        <p className="text-blue-100 text-xs font-medium mb-1">Active Batches</p>
                        {isLoading ? (
                          <Skeleton className="h-6 w-8 mx-auto bg-white bg-opacity-20" />
                        ) : (
                          <AnimatedCounter value={activeBatches.length} className="text-2xl font-bold" />
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                      className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white"
                    >
                      <div className="text-center">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-green-100" />
                        <p className="text-green-100 text-xs font-medium mb-1">Bread Types</p>
                        {isLoading ? (
                          <Skeleton className="h-6 w-8 mx-auto bg-white bg-opacity-20" />
                        ) : (
                          <AnimatedCounter value={uniqueBreadTypes} className="text-2xl font-bold" />
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Current Batches - Redesigned for Better Appeal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mb-8"
          >
            <Card className="bg-white border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-orange-500" />
                      Current Batches
                    </CardTitle>
                    <CardDescription className="text-gray-600 mt-1">
                      Active production for {currentShift} shift
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="text-gray-500 hover:text-orange-600 h-8 w-8 p-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {activeBatches.length === 0 ? (
                  <div className="py-16 px-6 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-10 h-10 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to Start Production</h3>
                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                      Create your first batch to begin tracking production for this shift
                    </p>
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Create First Batch
                    </Button>
                  </div>
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

          {/* Action Buttons - Much More Appealing Layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="space-y-4"
          >
            {/* Primary Action - Create Batch */}
            <Button 
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold h-14 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] rounded-2xl relative overflow-hidden"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <PlusCircle className="w-5 h-5" />
              <span className="text-base">Create New Batch</span>
              <Sparkles className="w-4 h-4" />
            </Button>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                className="h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] rounded-xl"
                onClick={handleExportAll}
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </Button>
              <Button 
                className="h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] rounded-xl"
                onClick={handleReports}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">Reports</span>
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
