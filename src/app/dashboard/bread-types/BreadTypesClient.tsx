"use client";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useOptimizedToast } from '@/components/ui/toast-optimized';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteBreadTypeAction, refetchBreadTypesAction } from './actions';
import { useRouter } from 'next/navigation';
import { BreadType } from '@/types/database';
import { RefreshCw, Cookie, MoreVertical, Edit, Trash2, Loader2, Plus, DollarSign, Package, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createUserMessages, withRetry } from '@/lib/utils/error-handling';

interface User {
  id: string;
  email?: string;
  role: string;
}

export default function BreadTypesClient({ breadTypes: initialBreadTypes, user }: { breadTypes: BreadType[]; user: User }) {
  const [breadTypes, setBreadTypes] = useState(initialBreadTypes);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useOptimizedToast();
  const router = useRouter();


  const refetchBreadTypes = async (showSuccessMessage: boolean = false) => {
    try {
      setIsRefreshing(true);
      setLoadingId('refetch');
      
      const updated = await withRetry(async () => {
        return await refetchBreadTypesAction();
      }, 3, 1000);
      
      setBreadTypes(updated);
      setRetryCount(0); // Reset retry count on success
      
      if (showSuccessMessage) {
        const message = createUserMessages.dashboard.dataRefreshSuccess();
        toast({
          title: message.title || 'Data Refreshed',
          description: message.message,
          type: 'success',
          duration: message.duration || 4000
        });
      }
    } catch (error) {
      const message = createUserMessages.breadTypes.refreshError(error);
      toast({
        title: message.title || 'Refresh Failed',
        description: message.message,
        type: message.type === 'error' ? 'error' : 'warning',
        duration: message.duration || 6000
      });
      setRetryCount(prev => prev + 1);
    } finally {
      setLoadingId(null);
      setIsRefreshing(false);
    }
  };

  const handleEdit = (breadType: BreadType) => {
    router.push(`/dashboard/bread-types/new?id=${breadType.id}`);
  };
  
  const handleDelete = async (breadType: BreadType) => {
    // Enhanced confirmation dialog with more context
    const confirmMessage = `Delete "${breadType.name}"?\n\nThis action cannot be undone. The bread type will be permanently removed from your system.\n\nNote: If this bread type has any production history, sales records, or inventory, deletion will be blocked to preserve your business data.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    setLoadingId(breadType.id);
    setLoadingAction('delete');
    
    try {
      const result = await withRetry(async () => {
        return await deleteBreadTypeAction(user, breadType.id);
      }, 2, 1500); // Less retries for delete operations
      
      if (result?.success) {
        const message = createUserMessages.breadTypes.deleteSuccess(breadType.name);
        toast({
          title: message.title || 'Bread Type Deleted',
          description: message.message,
          type: 'success',
          duration: 8000
        });
        await refetchBreadTypes(false); // Don't show success message for auto-refresh
      } else {
        // Enhanced error handling for mobile visibility
        const message = createUserMessages.breadTypes.deleteError(breadType.name, result?.error);
        toast({
          title: "Cannot Delete Bread Type",
          description: message.message,
          type: message.type === 'warning' ? 'warning' : 'error',
          duration: 12000 // 12 seconds for error messages to be fully read
        });
      }
    } catch (error) {
      // Enhanced error handling for mobile visibility
      const message = createUserMessages.breadTypes.deleteError(breadType.name, error);
      toast({
        title: "Deletion Failed",
        description: message.message,
        type: message.type === 'warning' ? 'warning' : 'error',
        duration: 12000 // 12 seconds for error messages
      });
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  const handleAddBreadType = useCallback(() => {
    setLoadingId('add');
    router.push('/dashboard/bread-types/new');
  }, [router]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-green-200' 
      : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-200';
  };

  const isLoading = (breadTypeId: string, action: string) => {
    return loadingId === breadTypeId && loadingAction === action;
  };

  const getDropdownItems = (breadType: BreadType) => {
    const items = [
      {
        label: 'Edit Bread Type',
        icon: <Edit className="w-4 h-4" />,
        onClick: () => {
          handleEdit(breadType);
          setActiveDropdownId(null);
        },
        disabled: isLoading(breadType.id, 'edit')
      }
    ];

    // Only owners can delete bread types (based on RLS policy)
    if (user.role === 'owner') {
      items.push({
        label: 'Delete Bread Type',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => {
          handleDelete(breadType);
          setActiveDropdownId(null);
        },
        disabled: isLoading(breadType.id, 'delete'),
        // removed variant property to fix TypeScript error
      });
    }

    return items;
  };

  // Custom dropdown component for bread type actions
  const BreadTypeDropdown = ({ breadType }: { breadType: BreadType }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isOpen = activeDropdownId === breadType.id;

    const handleToggle = () => {
      if (isOpen) {
        setActiveDropdownId(null);
      } else {
        setActiveDropdownId(breadType.id);
      }
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setActiveDropdownId(null);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    return (
      <div className="relative" ref={dropdownRef}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={!!loadingId}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {loadingId === breadType.id ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          ) : (
            <MoreVertical className="w-5 h-5 text-gray-600 hover:text-gray-900" />
          )}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-xl"
              style={{
                zIndex: 10000,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="py-2">
                {getDropdownItems(breadType).map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      item.onClick();
                      setActiveDropdownId(null);
                    }}
                    disabled={item.disabled}
                    className={`group flex w-full items-center px-4 py-3 text-sm transition-all duration-200 ${
                      item.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : item.label.includes('Delete')
                          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="mr-3 flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const activeBreadTypes = breadTypes.filter(bt => bt.is_active !== false).length;
  const inactiveBreadTypes = breadTypes.filter(bt => bt.is_active === false).length;
  const totalRevenue = breadTypes.reduce((sum, bt) => sum + (bt.unit_price || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Modern Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="p-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-lg"
              >
                <Cookie className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Bread Types
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1">
                    <Package className="w-3 h-3 mr-1" />
                    {breadTypes.length} Total
                  </Badge>
                  <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {activeBreadTypes} Active
                  </Badge>
                  <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1">
                    <XCircle className="w-3 h-3 mr-1" />
                    {inactiveBreadTypes} Inactive
                  </Badge>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {formatPrice(totalRevenue)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={() => refetchBreadTypes(true)}
                  disabled={isRefreshing}
                  className="bg-white/50 backdrop-blur border-white/30 hover:bg-white/70 transition-all duration-300 shadow-lg"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleAddBreadType}
                  disabled={!!loadingId}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {loadingId === 'add' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add Bread Type
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Modern Bread Type Cards */}
        <AnimatePresence>
          <motion.div 
            className="grid gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {breadTypes.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 text-center shadow-2xl border border-white/20"
              >
                <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Cookie className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Bread Types Found</h3>
                <p className="text-gray-500 mb-4">Start by adding your first bread type to manage your bakery products.</p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleAddBreadType}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Bread Type
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              breadTypes.map((breadType, index) => (
                <motion.div
                  key={breadType.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.1 * index, duration: 0.5, ease: "easeOut" }}
                  whileHover={{ y: -2, scale: 1.01 }}
                  className={`bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300 ${
                    activeDropdownId === breadType.id ? 'z-50 relative' : ''
                  }`}
                  style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)',
                    zIndex: activeDropdownId === breadType.id ? 1000 : 'auto'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* 3D Bread Icon */}
                      <motion.div 
                        whileHover={{ scale: 1.1, rotateY: 10 }}
                        className="relative flex-shrink-0"
                      >
                        <div 
                          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-300"
                          style={{
                            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          <span className="text-xl font-bold text-white">
                            {breadType.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl blur opacity-20 -z-10"></div>
                      </motion.div>

                      {/* Bread Type Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 truncate mb-1">
                          {breadType.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                            {breadType.size || 'No size'}
                          </span>
                          <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            {formatPrice(breadType.unit_price)}
                          </span>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex items-center">
                          <Badge className={`text-xs font-semibold px-3 py-1 ${getStatusColor(breadType.is_active !== false)} shadow-md`}>
                            {breadType.is_active === false ? (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                INACTIVE
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                ACTIVE
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions Dropdown */}
                    {(user.role === 'owner' || user.role === 'manager') && (
                      <BreadTypeDropdown breadType={breadType} />
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 