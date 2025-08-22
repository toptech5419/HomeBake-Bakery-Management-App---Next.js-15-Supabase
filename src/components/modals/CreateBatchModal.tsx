'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Minus, Loader2, Sparkles, Package, Clock } from 'lucide-react';
import { useMobileNotifications, NotificationHelpers } from '@/components/ui/mobile-notifications-enhanced';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBatchMutations } from '@/hooks/use-batches-query';
import { useAuth } from '@/hooks/use-auth';
import { useShift } from '@/contexts/ShiftContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent } from '@/components/ui/card';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

interface BreadType {
  id: string;
  name: string;
  size: string | null;
  unit_price: number;
}

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchCreated?: () => void;
  currentShift?: 'morning' | 'night';
}

interface FormData {
  breadTypeId: string;
  quantity: string;
  notes: string;
}

export function CreateBatchModal({ isOpen, onClose, onBatchCreated, currentShift }: CreateBatchModalProps) {
  const { createBatch } = useBatchMutations();
  const { user } = useAuth();
  const { currentShift: contextShift } = useShift();
  const { showNotification } = useMobileNotifications();
  
  // Use prop currentShift or fallback to context
  const shift = currentShift || contextShift;
  
  console.log('🔑 CreateBatchModal - User:', user);
  console.log('🌅 CreateBatchModal - Current Shift:', shift);
  
  const [breadTypes, setBreadTypes] = useState<BreadType[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    breadTypeId: '',
    quantity: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bread types when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('📂 Modal opened - fetching bread types...');
      fetchBreadTypes();
      resetForm();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('❌ Modal closed - resetting form');
      resetForm();
    }
  }, [isOpen]);

  // Disable background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  // Fetch bread types from Supabase
  const fetchBreadTypes = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching bread types from API...');
      
      const response = await fetch('/api/bread-types');
      const result = await response.json();
      
      console.log('📦 Bread types response:', result);
      
      if (result.error) {
        console.error('❌ Error fetching bread types:', result.error);
        showNotification(NotificationHelpers.error('Failed to load bread types', 'Please check your connection and try again'));
        return;
      }

      setBreadTypes(result.data || []);
      console.log('✅ Bread types loaded:', result.data?.length || 0, 'items');
    } catch (error) {
      console.error('❌ Error fetching bread types:', error);
      showNotification(NotificationHelpers.error('Failed to load bread types', 'Please check your connection and try again'));
    } finally {
      setLoading(false);
    }
  };

  // Reset form to initial state
  const resetForm = useCallback(() => {
    console.log('🔄 Resetting form data...');
    setFormData({
      breadTypeId: '',
      quantity: '',
      notes: ''
    });
    setIsSubmitting(false);
  }, []);

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    console.log('🚀 Starting batch creation process...');
    console.log('📝 Form data:', formData);
    console.log('🌅 Shift:', shift);

    // Validate form data
    if (!formData.breadTypeId || !formData.quantity) {
      console.error('❌ Validation failed - missing required fields');
      showNotification(NotificationHelpers.error('Validation Error', 'Please fill in all required fields'));
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      console.error('❌ Validation failed - invalid quantity');
      showNotification(NotificationHelpers.error('Validation Error', 'Please enter a valid quantity'));
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('⏳ Setting submitting state to true');

      // Get bread type info for optimistic updates
      const breadType = breadTypes.find(bt => bt.id === formData.breadTypeId);
      
      // Create the batch with shift information and bread type info
      console.log('🏭 Creating batch with data:', {
        bread_type_id: formData.breadTypeId,
        actual_quantity: quantity,
        notes: formData.notes || undefined,
        shift: shift,
        breadType: breadType?.name
      });

      const newBatch = await createBatch({
        bread_type_id: formData.breadTypeId,
        actual_quantity: quantity,
        notes: formData.notes || undefined,
        shift: shift,
        // Pass bread type info for optimistic updates
        breadTypeInfo: breadType ? {
          id: breadType.id,
          name: breadType.name,
          size: breadType.size,
          unit_price: breadType.unit_price
        } : null
      });

      console.log('✅ Batch created successfully:', newBatch);

      // Show success message
      // Use the breadType variable we already found above
      const breadTypeName = breadType ? `${breadType.name}${breadType.size ? ` (${breadType.size})` : ''}` : 'bread';
      
      showNotification(NotificationHelpers.success('Batch Created', `${breadTypeName} - ${quantity} units`));

      // Reset form
      resetForm();

      // Close modal
      onClose();

      // Call callback if provided
      if (onBatchCreated) {
        console.log('🔄 Calling onBatchCreated callback');
        onBatchCreated();
      }

    } catch (error) {
      console.error('❌ Error creating batch:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to create batch';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      showNotification(NotificationHelpers.error('Failed to Create Batch', errorMessage));
    } finally {
      setIsSubmitting(false);
      console.log('⏳ Setting submitting state to false');
    }
  };

  // Handle quantity changes
  const handleQuantityChange = (newQuantity: number) => {
    const clampedQuantity = Math.max(1, Math.min(1000, newQuantity));
    setFormData(prev => ({ ...prev, quantity: clampedQuantity.toString() }));
  };

  // Handle bread type selection
  const handleBreadTypeChange = (value: string) => {
    console.log('🍞 Bread type selected:', value);
    setFormData(prev => ({ ...prev, breadTypeId: value }));
  };

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setFormData(prev => ({ ...prev, notes: value }));
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Modal backdrop with click to close */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden"
        onClick={handleBackdropClick}
      >
        {/* Proper modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl border-0 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fixed Header */}
          <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white flex-shrink-0 rounded-t-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Create New Batch</h2>
                  <p className="text-orange-100 text-sm">Add production batch</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors touch-manipulation"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Shift Display */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {shift === 'morning' ? '🌅 Morning' : '🌙 Night'} Shift
                          </p>
                          <p className="text-xs text-blue-700">Creating batch for current shift</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Bread Type Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  <label className="block text-sm font-semibold text-gray-700">
                    Bread Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.breadTypeId}
                    onValueChange={handleBreadTypeChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:border-gray-300 transition-colors">
                      <SelectValue placeholder={loading ? "Loading bread types..." : "Select bread type..."} />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      sideOffset={4}
                      className="z-[200] w-[var(--radix-select-trigger-width)] max-h-[50vh] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl"
                      align="start"
                    >
                      {breadTypes.map(type => (
                        <SelectItem 
                          key={type.id} 
                          value={type.id}
                          className="px-4 py-3 text-sm cursor-pointer hover:bg-orange-50 focus:bg-orange-50 focus:text-orange-900 data-[highlighted]:bg-orange-50 data-[highlighted]:text-orange-900 rounded-lg mx-2 my-1"
                        >
                          <div className="flex flex-col space-y-1">
                            <span className="font-medium text-gray-900">{type.name}</span>
                            {type.size && (
                              <span className="text-xs text-gray-500">Size: {type.size}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loading && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading bread types...
                    </div>
                  )}
                </motion.div>

                {/* Quantity Input */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <label className="block text-sm font-semibold text-gray-700">
                    Actual Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(parseInt(formData.quantity) - 1)}
                      disabled={!formData.quantity || parseInt(formData.quantity) <= 1}
                      className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      min="1"
                      max="1000"
                      className="flex-1 h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center text-lg font-semibold transition-colors"
                      placeholder="0"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(parseInt(formData.quantity) + 1)}
                      disabled={!formData.quantity || parseInt(formData.quantity) >= 1000}
                      className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      aria-label="Increase quantity"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </motion.div>

                {/* Notes */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <label className="block text-sm font-semibold text-gray-700">
                    Notes <span className="text-gray-400">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-colors"
                    placeholder="Add any notes about this batch..."
                  />
                </motion.div>
              </form>
            </div>

          {/* Fixed Bottom Button */}
          <div className="flex-shrink-0 p-6 border-t border-gray-100">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <LoadingButton
                type="submit"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                loadingText="Creating Batch..."
                icon={Sparkles}
                disabled={!formData.breadTypeId || !formData.quantity}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-base font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                size="lg"
              >
                Create Batch
              </LoadingButton>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
