"use client";
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { salesFormSchema, SalesFormData } from '@/lib/validations/sales';

import { useOfflineSalesMutation } from '@/hooks/use-offline-mutations';
import { useOfflineStatus } from '@/hooks/use-offline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useShift } from '@/hooks/use-shift';
import { ShoppingCart, Save, Percent, Loader2 } from 'lucide-react';

interface BreadType {
  id: string;
  name: string;
  unit_price: number;
}

interface SalesFormProps {
  breadTypes: BreadType[];
  userId: string;
  onSuccess?: () => void;
}

export default function SalesForm({ breadTypes, userId, onSuccess }: SalesFormProps) {
  const { shift } = useShift();
  const [loading, setLoading] = useState(false);
  const { isOnline } = useOfflineStatus();
  const offlineSalesMutation = useOfflineSalesMutation(userId);
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<SalesFormData>({
    resolver: zodResolver(salesFormSchema),
    defaultValues: { 
      entries: breadTypes.map(b => ({ 
        bread_type_id: b.id, 
        quantity_sold: 0, 
        discount_percentage: 0, 
        shift 
      })) 
    },
  });

  const onSubmit = async (data: SalesFormData) => {
    setLoading(true);
    try {
      const validEntries = data.entries.filter(entry => entry.quantity_sold > 0);
      if (validEntries.length === 0) {
        toast.error('Please enter at least one quantity sold greater than 0.');
        setLoading(false);
        return;
      }

      // Save each sales entry using offline-aware mutation
      for (const entry of validEntries) {
        const breadType = breadTypes.find(b => b.id === entry.bread_type_id);
        const unitPrice = breadType?.unit_price || 0;
        const discountAmount = (unitPrice * entry.discount_percentage) / 100;
        const finalPrice = unitPrice - discountAmount;

        await offlineSalesMutation.mutateAsync({ 
          bread_type_id: entry.bread_type_id,
          quantity: entry.quantity_sold,
          unit_price: finalPrice,
          discount: discountAmount,
          shift: entry.shift,
          recorded_by: userId,
        });
      }
      
      const syncMessage = isOnline 
        ? 'Inventory will update automatically.' 
        : 'Data will sync when connection is restored.';
      toast.success(`Sales log saved for ${validEntries.length} bread type(s)! ${syncMessage}`);
      reset();
      onSuccess?.();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to save sales log.');
    } finally {
      setLoading(false);
    }
  };

  if (!breadTypes.length) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <ShoppingCart className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No bread types available for sale</p>
      </Card>
    );
  }

  const isSubmitting = loading || offlineSalesMutation.isPending;

  return (
    <Card className="w-full">
      <div className="flex items-center justify-between mb-6">
        <span className="text-lg font-semibold">Log Sales</span>
        <Badge variant={shift === 'morning' ? 'default' : 'secondary'}>
          {shift.charAt(0).toUpperCase() + shift.slice(1)} Shift
        </Badge>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {breadTypes.map((bread, idx) => (
          <div key={bread.id} className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{bread.name}</Label>
              <span className="text-sm text-muted-foreground">
                ${bread.unit_price.toFixed(2)} each
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`quantity-${bread.id}`} className="text-sm">
                  Quantity Sold
                </Label>
                <Controller
                  name={`entries.${idx}.quantity_sold` as const}
                  control={control}
                  render={({ field }) => (
                    <Input
                      id={`quantity-${bread.id}`}
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      disabled={isSubmitting}
                      aria-invalid={!!errors.entries?.[idx]?.quantity_sold}
                    />
                  )}
                />
                {errors.entries?.[idx]?.quantity_sold && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.entries[idx]?.quantity_sold?.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor={`discount-${bread.id}`} className="text-sm flex items-center">
                  <Percent className="h-3 w-3 mr-1" />
                  Discount %
                </Label>
                <Controller
                  name={`entries.${idx}.discount_percentage` as const}
                  control={control}
                  render={({ field }) => (
                    <Input
                      id={`discount-${bread.id}`}
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      className="w-full"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      disabled={isSubmitting}
                      aria-invalid={!!errors.entries?.[idx]?.discount_percentage}
                    />
                  )}
                />
                {errors.entries?.[idx]?.discount_percentage && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.entries[idx]?.discount_percentage?.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving Sales Log...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Sales Log
            </>
          )}
        </Button>
        
        {offlineSalesMutation.isPending && (
          <p className="text-sm text-muted-foreground text-center">
            {isOnline 
              ? 'Inventory will be updated automatically after saving...' 
              : 'Saving offline. Will sync when connection is restored...'}
          </p>
        )}
      </form>
    </Card>
  );
} 