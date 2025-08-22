"use client";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMobileNotifications, NotificationHelpers } from '@/components/ui/mobile-notifications-fixed';
import { 
  deleteBreadTypeAction, 
  deactivateBreadTypeAction,
  reactivateBreadTypeAction,
  refetchBreadTypesAction 
} from './actions';
import { useRouter } from 'next/navigation';
import { BreadType } from '@/types/database';
import { 
  RefreshCw, Cookie, MoreVertical, Edit, Trash2, Loader2, Plus, DollarSign, 
  Package, CheckCircle, XCircle, Power, PowerOff, Eye, EyeOff 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { withRetry } from '@/lib/utils/error-handling';

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
  const [showInactive, setShowInactive] = useState(false);
  const router = useRouter();
  const { showNotification } = useMobileNotifications();

  const refetchBreadTypes = async (showSuccessMessage: boolean = false, includeInactive: boolean = showInactive) => {
    try {
      setIsRefreshing(true);
      setLoadingId('refetch');
      
      const updated = await withRetry(async () => {
        return await refetchBreadTypesAction(includeInactive);
      }, 3, 1000);
      
      setBreadTypes(updated);
      
      if (showSuccessMessage) {
        showNotification(NotificationHelpers.success('Success', 'Bread types refreshed successfully!'));
      }
    } catch (error) {
      console.error('REFRESH ERROR:', error);
      showNotification(NotificationHelpers.error('Error', 'Failed to refresh bread types. Please try again.'));
    } finally {
      setLoadingId(null);
      setIsRefreshing(false);
    }
  };

  const handleEdit = (breadType: BreadType) => {
    router.push(`/dashboard/bread-types/new?id=${breadType.id}`);
  };
  
  const handleDeactivate = async (breadType: BreadType) => {
    const confirmMessage = `Deactivate "${breadType.name}"?\n\nThis will hide the bread type from daily operations while preserving all historical data.\n\nYou can reactivate it later if needed.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    setLoadingId(breadType.id);
    setLoadingAction('deactivate');
    
    try {
      const result = await withRetry(async () => {
        return await deactivateBreadTypeAction(user, breadType.id);
      }, 2, 1500);
      
      if (result?.success) {
        showNotification(NotificationHelpers.success('Success', `"${breadType.name}" deactivated successfully!`));
        await refetchBreadTypes(false);
      } else {
        showNotification(NotificationHelpers.error('Error', result?.error || `Failed to deactivate "${breadType.name}". Please try again.`));
      }
    } catch (error) {
      console.error('DEACTIVATE ERROR:', error);
      showNotification(NotificationHelpers.error('Error', `Failed to deactivate "${breadType.name}". Please try again.`));
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  const handleReactivate = async (breadType: BreadType) => {
    const confirmMessage = `Reactivate "${breadType.name}"?\n\nThis will make the bread type available for daily operations again.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    setLoadingId(breadType.id);
    setLoadingAction('reactivate');
    
    try {
      const result = await withRetry(async () => {
        return await reactivateBreadTypeAction(user, breadType.id);
      }, 2, 1500);
      
      if (result?.success) {
        showNotification(NotificationHelpers.success('Success', `"${breadType.name}" reactivated successfully!`));
        await refetchBreadTypes(false);
      } else {
        showNotification(NotificationHelpers.error('Error', result?.error || `Failed to reactivate "${breadType.name}". Please try again.`));
      }
    } catch (error) {
      console.error('REACTIVATE ERROR:', error);
      showNotification(NotificationHelpers.error('Error', `Failed to reactivate "${breadType.name}". Please try again.`));
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };
  
  const handlePermanentDelete = async (breadType: BreadType) => {
    const confirmMessage = `⚠️  PERMANENTLY DELETE "${breadType.name}"?\n\n` +
      `🚨 THIS ACTION CANNOT BE UNDONE! 🚨\n\n` +
      `This will completely remove the bread type from your system.\n` +
      `Only proceed if you're absolutely certain.\n\n` +
      `💡 TIP: Consider keeping it deactivated instead.\n\n` +
      `Type "DELETE" to confirm permanent deletion:`;
    
    const userInput = window.prompt(confirmMessage);
    if (userInput !== 'DELETE') {
      if (userInput !== null) {
        alert('❌ Deletion cancelled. Please type "DELETE" exactly to confirm.');
      }
      return;
    }
    
    setLoadingId(breadType.id);
    setLoadingAction('delete');
    
    try {
      const result = await withRetry(async () => {
        return await deleteBreadTypeAction(user, breadType.id);
      }, 2, 1500);
      
      if (result?.success) {
        showNotification(NotificationHelpers.success('Success', `"${breadType.name}" permanently deleted successfully!`));
        await refetchBreadTypes(false);
      } else {
        showNotification(NotificationHelpers.error('Error', result?.error || `Failed to delete "${breadType.name}". Please try again.`));
      }
    } catch (error) {
      console.error('DELETE ERROR:', error);
      showNotification(NotificationHelpers.error('Error', `Failed to delete "${breadType.name}". Please try again.`));
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  const handleAddBreadType = useCallback(() => {
    setLoadingId('add');
    router.push('/dashboard/bread-types/new');
  }, [router]);

  const toggleShowInactive = async () => {
    const newShowInactive = !showInactive;
    setShowInactive(newShowInactive);
    await refetchBreadTypes(false, newShowInactive);
  };

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
      : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-200';
  };

  const isLoading = (breadTypeId: string, action: string) => {
    return loadingId === breadTypeId && loadingAction === action;
  };

  const getDropdownItems = (breadType: BreadType) => {
    const isActive = breadType.is_active !== false;
    const items = [
      {
        label: 'Edit Bread Type',
        icon: <Edit className="w-4 h-4" />,
        onClick: () => {
          handleEdit(breadType);
          setActiveDropdownId(null);
        },
        disabled: isLoading(breadType.id, 'edit'),
        className: 'text-blue-600 hover:bg-blue-50'
      }
    ];

    if (isActive) {
      // Active bread type - show deactivate option
      items.push({
        label: 'Deactivate',
        icon: <PowerOff className="w-4 h-4" />,
        onClick: () => {
          handleDeactivate(breadType);
          setActiveDropdownId(null);
        },
        disabled: isLoading(breadType.id, 'deactivate'),
        className: 'text-orange-600 hover:bg-orange-50'
      });
    } else {
      // Inactive bread type - show reactivate option
      items.push({
        label: 'Reactivate',
        icon: <Power className="w-4 h-4" />,
        onClick: () => {
          handleReactivate(breadType);
          setActiveDropdownId(null);
        },
        disabled: isLoading(breadType.id, 'reactivate'),
        className: 'text-green-600 hover:bg-green-50'
      });
    }

    // Only owners can permanently delete (and only inactive items)
    if (user.role === 'owner' && !isActive) {
      items.push({
        label: 'Permanent Delete',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => {
          handlePermanentDelete(breadType);
          setActiveDropdownId(null);
        },
        disabled: isLoading(breadType.id, 'delete'),
        className: 'text-red-600 hover:bg-red-50 border-t border-gray-200'
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
          className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
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
              className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-xl z-50"
              style={{
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
                    className={`group flex w-full items-center px-4 py-3 text-sm transition-all duration-200 min-h-[44px] ${
                      item.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : `${item.className || 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`
                    } ${item.label.includes('Delete') ? 'border-t border-gray-200' : ''}`}
                  >
                    <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="truncate font-medium">{item.label}</span>
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
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/20"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 md:p-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-lg"
              >
                <Cookie className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Bread Types
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 text-xs">
                    <Package className="w-3 h-3 mr-1" />
                    {breadTypes.length} Total
                  </Badge>
                  <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-1 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {activeBreadTypes} Active
                  </Badge>
                  {inactiveBreadTypes > 0 && (
                    <Badge className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-2 py-1 text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      {inactiveBreadTypes} Inactive
                    </Badge>
                  )}
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-2 py-1 text-xs">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {formatPrice(totalRevenue)}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    onClick={() => refetchBreadTypes(true)}
                    disabled={isRefreshing}
                    className="bg-white/50 backdrop-blur border-white/30 hover:bg-white/70 transition-all duration-300 shadow-lg min-h-[44px]"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </motion.div>
                
                {inactiveBreadTypes > 0 && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      onClick={toggleShowInactive}
                      className="bg-white/50 backdrop-blur border-white/30 hover:bg-white/70 transition-all duration-300 shadow-lg min-h-[44px]"
                    >
                      {showInactive ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide Inactive
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Show Inactive ({inactiveBreadTypes})
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleAddBreadType}
                  disabled={!!loadingId}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-h-[44px] w-full sm:w-auto"
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
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 text-center shadow-2xl border border-white/20"
              >
                <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 flex items-center justify-center">
                  <Cookie className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
                  {showInactive ? 'No Inactive Bread Types' : 'No Bread Types Found'}
                </h3>
                <p className="text-sm md:text-base text-gray-500 mb-4">
                  {showInactive 
                    ? 'All your bread types are currently active.'
                    : 'Start by adding your first bread type to manage your bakery products.'
                  }
                </p>
                {!showInactive && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleAddBreadType}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg min-h-[44px]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Bread Type
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              breadTypes.map((breadType, index) => {
                const isActive = breadType.is_active !== false;
                return (
                  <motion.div
                    key={breadType.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.1 * index, duration: 0.5, ease: "easeOut" }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    className={`bg-white/80 backdrop-blur-xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300 ${
                      activeDropdownId === breadType.id ? 'z-50 relative' : ''
                    } ${!isActive ? 'opacity-75' : ''}`}
                    style={{
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)',
                      zIndex: activeDropdownId === breadType.id ? 1000 : 'auto'
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        {/* 3D Bread Icon */}
                        <motion.div 
                          whileHover={{ scale: 1.1, rotateY: 10 }}
                          className="relative flex-shrink-0"
                        >
                          <div 
                            className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl ${
                              isActive 
                                ? 'bg-gradient-to-br from-amber-400 to-orange-600' 
                                : 'bg-gradient-to-br from-gray-400 to-gray-600'
                            } flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-300`}
                            style={{
                              boxShadow: isActive 
                                ? '0 10px 25px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                : '0 10px 25px rgba(107, 114, 128, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                            }}
                          >
                            <span className="text-lg md:text-xl font-bold text-white">
                              {breadType.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className={`absolute -inset-1 ${
                            isActive 
                              ? 'bg-gradient-to-br from-amber-400 to-orange-600' 
                              : 'bg-gradient-to-br from-gray-400 to-gray-600'
                          } rounded-2xl blur opacity-20 -z-10`}></div>
                        </motion.div>

                        {/* Bread Type Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base md:text-lg font-bold text-gray-900 truncate">
                              {breadType.name}
                            </h3>
                            {!isActive && (
                              <Badge className="bg-gray-500 text-white text-xs px-2 py-1">
                                INACTIVE
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs md:text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                              {breadType.size || 'No size'}
                            </span>
                            <span className="text-xs md:text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              {formatPrice(breadType.unit_price)}
                            </span>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="flex items-center">
                            <Badge className={`text-xs font-semibold px-3 py-1 ${getStatusColor(isActive)} shadow-md`}>
                              {isActive ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  ACTIVE
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  INACTIVE
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
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}