'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBatchMutations } from '@/hooks/use-batches-query';
import { useAuth } from '@/hooks/use-auth';
import { useShift } from '@/contexts/ShiftContext';

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
  const { createBatch, generateBatchNumber, isCreatingBatch } = useBatchMutations();
  const { user } = useAuth();
  const { currentShift: contextShift } = useShift();
  
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
        toast.error('Failed to load bread types');
        return;
      }

      setBreadTypes(result.data || []);
      console.log('✅ Bread types loaded:', result.data?.length || 0, 'items');
    } catch (error) {
      console.error('❌ Error fetching bread types:', error);
      toast.error('Failed to load bread types');
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
      toast.error('Please fill in all required fields');
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      console.error('❌ Validation failed - invalid quantity');
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('⏳ Setting submitting state to true');

      // Generate batch number for the selected bread type and shift
      console.log('🔢 Generating batch number for bread type:', formData.breadTypeId, 'shift:', shift);
      const batchNumber = await generateBatchNumber({ 
        breadTypeId: formData.breadTypeId, 
        shift: shift 
      });
      console.log('✅ Generated batch number:', batchNumber);

      // Create the batch with shift information
      console.log('🏭 Creating batch with data:', {
        bread_type_id: formData.breadTypeId,
        batch_number: batchNumber,
        target_quantity: quantity,
        notes: formData.notes || undefined,
        shift: shift
      });

      const newBatch = await createBatch({
        bread_type_id: formData.breadTypeId,
        batch_number: batchNumber,
        target_quantity: quantity,
        notes: formData.notes || undefined,
        shift: shift
      });

      console.log('✅ Batch created successfully:', newBatch);

      // Show success message
      toast.success(`Batch #${batchNumber} created successfully for ${shift} shift!`);

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
      
      toast.error(errorMessage);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Batch</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Shift Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">
                Creating batch for {shift === 'morning' ? '🌅 Morning' : '🌙 Night'} shift
              </span>
            </div>
          </div>

          {/* Bread Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Bread Type *
            </label>
            <Select
              value={formData.breadTypeId}
              onValueChange={handleBreadTypeChange}
              disabled={loading}
            >
              <SelectTrigger className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white">
                <SelectValue placeholder={loading ? "Loading..." : "Select bread type..."} />
              </SelectTrigger>
              <SelectContent 
                position="popper" 
                side="bottom" 
                sideOffset={4}
                className="z-[200] w-[var(--radix-select-trigger-width)] max-h-[40vh] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
                align="start"
              >
                {breadTypes.map(type => (
                  <SelectItem 
                    key={type.id} 
                    value={type.id}
                    className="px-4 py-3 text-sm cursor-pointer hover:bg-orange-50 focus:bg-orange-50 focus:text-orange-900 data-[highlighted]:bg-orange-50 data-[highlighted]:text-orange-900"
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
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Target Quantity *
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQuantityChange(parseInt(formData.quantity) - 1)}
                disabled={!formData.quantity || parseInt(formData.quantity) <= 1}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                min="1"
                max="1000"
                className="flex-1 h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter quantity"
              />
              <button
                type="button"
                onClick={() => handleQuantityChange(parseInt(formData.quantity) + 1)}
                disabled={!formData.quantity || parseInt(formData.quantity) >= 1000}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Add any notes about this batch..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.breadTypeId || !formData.quantity}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Creating Batch...
              </>
            ) : (
              <>
                <Plus size={20} />
                Create Batch
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
