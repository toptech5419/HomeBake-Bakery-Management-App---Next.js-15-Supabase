'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Minus, ShoppingCart, Calculator, AlertCircle, Check } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { useToast } from '@/hooks/use-toast';
import { createSalesLog } from '@/lib/sales/actions';
import { useShift } from '@/contexts/ShiftContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface RecordSalesClientProps {
  userId: string;
  userName: string;
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

export function RecordSalesClient({ userId, userName }: RecordSalesClientProps) {
  const [breadTypes, setBreadTypes] = useState<BreadType[]>([]);
  const [selectedBreadType, setSelectedBreadType] = useState<BreadType | null>(null);
  const router = useRouter();
  const { currentShift } = useShift();
  
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
    fetchBreadTypes();
    resetForm();
  }, []);

  const fetchBreadTypes = async () => {
    try {
      setLoading(true);
      console.log('Fetching bread types...');
      
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
        toast.info('No Bread Types Found - Please add bread types first before recording sales.');
      } else {
        console.log(`Found ${data.length} bread types:`, data);
      }

      setBreadTypes(data || []);
    } catch (error) {
      console.error('Error fetching bread types:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to Load Bread Types - ${errorMessage}`);
      
      if (error instanceof Error && (error.message?.includes('permission') || error.message?.includes('policy'))) {
        console.error('RLS Policy Issue Detected:', error);
        toast.error('Permission Denied - Please check database policies.');
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
      toast.error('Please select a bread type');
      return;
    }

    if (formData.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      setSubmitting(true);

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

      toast.success(`Sale recorded: ${formData.breadTypeName} x${formData.quantity} units`);
      
      // Navigate back to dashboard after successful recording
      setTimeout(() => {
        router.push('/dashboard/sales');
      }, 1500);
      
    } catch (error) {
      console.error('Error recording sales:', error);
      toast.error('Failed to record sale. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Record Sales</h1>
              <p className="text-orange-100 text-xs sm:text-sm truncate">
                {currentShift?.charAt(0).toUpperCase() + currentShift?.slice(1)} Shift • {userName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-orange-50 to-amber-50">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-6 text-gray-600 text-lg">Loading bread types...</p>
          </div>
        ) : (
          <div className="px-3 sm:px-4 py-4 space-y-4 sm:space-y-8">
            
            {/* Bread Type Selection */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-3 rounded-xl">
                  <Calculator className="h-6 w-6 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Select Bread Type</h2>
              </div>
              
              {breadTypes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-orange-500" />
                  <p className="text-xl">No bread types available</p>
                  <p className="text-sm mt-2">Please add bread types first</p>
                </div>
              ) : (
                <div ref={breadTypesContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {breadTypes.map((breadType) => (
                    <button
                      key={breadType.id}
                      type="button"
                      onClick={() => handleBreadTypeSelect(breadType)}
                      className={`relative p-6 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-105 transform touch-manipulation min-h-[80px] ${
                        selectedBreadType?.id === breadType.id
                          ? 'border-orange-500 bg-orange-50 shadow-lg ring-2 ring-orange-200'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg mb-2">
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
                      <h3 className="font-bold text-gray-900 text-xl mb-2">
                        {selectedBreadType.name}
                      </h3>
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
              <div className="space-y-8">
                
                {/* Quantity Input */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">Quantity Sold</h3>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => handleQuantityChange(formData.quantity - 1)}
                      disabled={formData.quantity === 0}
                      className="h-16 w-16 rounded-2xl border-2 hover:border-orange-400 disabled:opacity-50 touch-manipulation"
                    >
                      <Minus className="h-8 w-8" />
                    </Button>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        value={formData.quantity === 0 ? '' : formData.quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                        className="w-full text-center text-4xl font-bold border-2 border-gray-300 rounded-2xl py-6 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 touch-manipulation"
                        placeholder="0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => handleQuantityChange(formData.quantity + 1)}
                      className="h-16 w-16 rounded-2xl border-2 hover:border-orange-400 touch-manipulation"
                    >
                      <Plus className="h-8 w-8" />
                    </Button>
                  </div>
                </div>

                {/* Discount Input */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">Discount (Optional)</h3>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-2xl">
                      ₦
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                      className="w-full pl-16 pr-6 py-6 text-2xl border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 touch-manipulation"
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
                    <p className="text-5xl font-bold text-green-600 mb-4">
                      {formatCurrencyNGN(formData.totalAmount)}
                    </p>
                    <div className="bg-white/70 rounded-xl p-4 inline-block">
                      <p className="text-base text-gray-600">
                        {formData.breadTypeName} × {formData.quantity} units
                        {formData.discount > 0 && (
                          <span className="block text-red-600 font-medium mt-1">
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

      {/* Fixed Bottom Action Bar - Mobile Optimized */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
            className="flex-1 py-4 rounded-2xl border-2 hover:border-orange-400 transition-all duration-200 text-base font-semibold touch-manipulation min-h-[56px]"
            size="lg"
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            isLoading={submitting}
            loadingText="Recording Sale..."
            icon={ShoppingCart}
            disabled={!formData.breadTypeId || formData.quantity <= 0}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-base font-semibold touch-manipulation min-h-[56px]"
            size="lg"
          >
            Record Sale
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}