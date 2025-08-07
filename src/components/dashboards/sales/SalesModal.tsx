'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, ShoppingCart, Calculator, AlertCircle, Check } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { useToast } from '@/hooks/use-toast';
import { createSalesLog } from '@/lib/sales/actions';

interface SalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentShift: 'morning' | 'night';
  onSalesRecorded: () => void;
}

interface BreadType {
  id: string;
  name: string;
  unit_price: number;
}

interface SaleForm {
  breadTypeId: string;
  breadTypeName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  totalAmount: number;
}

export function SalesModal({ isOpen, onClose, userId, currentShift, onSalesRecorded }: SalesModalProps) {
  const [breadTypes, setBreadTypes] = useState<BreadType[]>([]);
  const [selectedBreadType, setSelectedBreadType] = useState<BreadType | null>(null);
  const toast = useToast();
  const [formData, setFormData] = useState<SaleForm>({
    breadTypeId: '',
    breadTypeName: '',
    unitPrice: 0,
    quantity: 0,
    discount: 0,
    totalAmount: 0
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ref for auto-scroll functionality
  const selectedBreadRef = useRef<HTMLDivElement>(null);
  const breadTypesContainerRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    setSelectedBreadType(null);
    setFormData({
      breadTypeId: '',
      breadTypeName: '',
      unitPrice: 0,
      quantity: 0,
      discount: 0,
      totalAmount: 0
    });
  };

  useEffect(() => {
    if (isOpen) {
      fetchBreadTypes();
      resetForm();
    }
  }, [isOpen]);

  const fetchBreadTypes = async () => {
    try {
      setLoading(true);
      console.log('Fetching bread types...');
      
      // Use the correct RLS policy - bread_types_select_all should allow all authenticated users
      const { data, error } = await supabase
        .from('bread_types')
        .select('id, name, unit_price')
        .order('name');

      console.log('Bread types response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No bread types found in database');
        toast.info('No Bread Types Found', 'Please add bread types first before recording sales.');
        
        // Debug: Try without ordering to see if it's an ordering issue
        const { data: debugData, error: debugError } = await supabase
          .from('bread_types')
          .select('*');
        
        console.log('Debug - all bread types:', { debugData, debugError });
        
      } else {
        console.log(`Found ${data.length} bread types:`, data);
      }

      setBreadTypes(data || []);
    } catch (error) {
      console.error('Error fetching bread types:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Failed to Load Bread Types', errorMessage);
      
      // Additional debugging for RLS issues
      if (error instanceof Error && (error.message?.includes('permission') || error.message?.includes('policy'))) {
        console.error('RLS Policy Issue Detected:', error);
        toast.error('Permission Denied', 'Please check database policies.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBreadTypeSelect = (breadType: BreadType) => {
    setSelectedBreadType(breadType);
    setFormData({
      breadTypeId: breadType.id,
      breadTypeName: breadType.name,
      unitPrice: breadType.unit_price,
      quantity: 0,
      discount: 0,
      totalAmount: 0
    });

    // Auto-scroll to the selected bread type summary
    setTimeout(() => {
      scrollToSelectedBread();
    }, 100);
  };

  const scrollToSelectedBread = () => {
    if (selectedBreadRef.current) {
      selectedBreadRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }
  };

  const scrollToBreadTypes = () => {
    if (breadTypesContainerRef.current) {
      breadTypesContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  const handleQuantityChange = (quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    const newTotal = (newQuantity * formData.unitPrice) - formData.discount;
    
    setFormData(prev => ({
      ...prev,
      quantity: newQuantity,
      totalAmount: Math.max(0, newTotal)
    }));
  };

  const handleDiscountChange = (discount: number) => {
    const newDiscount = Math.max(0, discount);
    const newTotal = (formData.quantity * formData.unitPrice) - newDiscount;
    
    setFormData(prev => ({
      ...prev,
      discount: newDiscount,
      totalAmount: Math.max(0, newTotal)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.breadTypeId) {
      toast.validationError('bread type');
      return;
    }

    if (formData.quantity <= 0) {
      toast.validationError('quantity');
      return;
    }

    try {
      setSubmitting(true);

      // Use server action for sales recording with activity logging
      console.log('Recording sale using server action:', {
        bread_type_id: formData.breadTypeId,
        quantity: formData.quantity,
        unit_price: formData.unitPrice,
        discount: formData.discount,
        shift: currentShift,
        recorded_by: userId
      });

      await createSalesLog({
        bread_type_id: formData.breadTypeId,
        quantity: formData.quantity,
        unit_price: formData.unitPrice,
        discount: formData.discount,
        shift: currentShift,
        recorded_by: userId
      });

      toast.saleRecorded(formData.breadTypeName, formData.quantity);
      
      // Call the callback immediately to refresh dashboard
      onSalesRecorded();
      
      // Auto-close after 1.5 seconds
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
      
    } catch (error) {
      console.error('Error recording sales:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      {/* Mobile: Full Screen, Desktop: Centered Modal */}
      <div className="h-full w-full md:flex md:items-center md:justify-center md:p-4">
        <div className="bg-white h-full w-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-2xl md:rounded-2xl shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Record Sales</h2>
                  <p className="text-orange-100 text-sm">
                    {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} Shift
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                <p className="mt-6 text-gray-600 text-lg">Loading bread types...</p>
              </div>
            ) : (
              <div className="p-6 space-y-8">
                
                {/* Bread Type Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Calculator className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Select Bread Type</h3>
                  </div>
                  
                  {breadTypes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                      <p className="text-lg">No bread types available</p>
                    </div>
                  ) : (
                    <div ref={breadTypesContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {breadTypes.map((breadType) => (
                        <button
                          key={breadType.id}
                          type="button"
                          onClick={() => handleBreadTypeSelect(breadType)}
                          className={`relative p-6 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-105 transform ${
                            selectedBreadType?.id === breadType.id
                              ? 'border-orange-500 bg-orange-50 shadow-lg ring-2 ring-orange-200'
                              : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-lg mb-1">
                                {breadType.name}
                              </h4>
                              <p className="text-orange-600 font-bold text-xl">
                                {formatCurrencyNGN(breadType.unit_price)}
                              </p>
                            </div>
                            {selectedBreadType?.id === breadType.id && (
                              <div className="ml-4 bg-orange-500 text-white rounded-full p-2">
                                <Check className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Bread Summary */}
                {selectedBreadType && (
                  <div ref={selectedBreadRef} className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 shadow-lg rounded-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Selected Item</p>
                          <h4 className="font-bold text-gray-900 text-xl mb-2">
                            {selectedBreadType.name}
                          </h4>
                          <p className="text-2xl font-bold text-orange-600">
                            {formatCurrencyNGN(formData.unitPrice)} per unit
                          </p>
                        </div>
                        <div className="bg-orange-100 p-4 rounded-2xl">
                          <Calculator className="h-8 w-8 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </div>
                )}

                {/* Quantity and Discount */}
                {selectedBreadType && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Quantity Input */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-bold text-gray-900">Quantity Sold</h4>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          onClick={() => handleQuantityChange(formData.quantity - 1)}
                          disabled={formData.quantity === 0}
                          className="h-14 w-14 rounded-2xl border-2 hover:border-orange-400 disabled:opacity-50"
                        >
                          <Minus className="h-6 w-6" />
                        </Button>
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            value={formData.quantity === 0 ? '' : formData.quantity}
                            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                            className="w-full text-center text-3xl font-bold border-2 border-gray-300 rounded-2xl py-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                            placeholder="0"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          onClick={() => handleQuantityChange(formData.quantity + 1)}
                          className="h-14 w-14 rounded-2xl border-2 hover:border-orange-400"
                        >
                          <Plus className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>

                    {/* Discount Input */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-bold text-gray-900">Discount (Optional)</h4>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-xl">
                          ₦
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.discount}
                          onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                          className="w-full pl-12 pr-4 py-4 text-xl border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Amount */}
                {selectedBreadType && formData.quantity > 0 && (
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
                    <CardContent className="p-8">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">Total Amount</p>
                        <p className="text-4xl font-bold text-green-600 mb-4">
                          {formatCurrencyNGN(formData.totalAmount)}
                        </p>
                        <div className="bg-white/70 rounded-xl p-4 inline-block">
                          <p className="text-sm text-gray-600">
                            {formData.breadTypeName} × {formData.quantity} units
                            {formData.discount > 0 && (
                              <span className="block text-red-600 font-medium">
                                - ₦{formData.discount.toFixed(2)} discount
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t flex-shrink-0">
            <div className="flex gap-4">
              <LoadingButton
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-4 rounded-2xl border-2 hover:border-orange-400 transition-all duration-200 text-sm md:text-base font-semibold"
                size="lg"
              >
                <span className="text-sm md:text-base font-semibold">Cancel</span>
              </LoadingButton>
              <LoadingButton
                onClick={handleSubmit}
                isLoading={submitting}
                loadingText="Recording Sale..."
                icon={ShoppingCart}
                disabled={!formData.breadTypeId || formData.quantity <= 0}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-sm md:text-base font-semibold"
                size="lg"
              >
                <span className="text-sm md:text-base font-semibold">Record Sale</span>
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
