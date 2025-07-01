"use client";
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productionFormSchema, ProductionFormData } from '@/lib/validations/production';
import { insertProductionLog, saveFeedback } from '@/lib/production/actions';
import { useInventoryMutations } from '@/hooks/use-inventory';
import { useOfflineProductionMutation } from '@/hooks/use-offline-mutations';
import { useOfflineStatus } from '@/hooks/use-offline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import { useShift } from '@/contexts/ShiftContext';
import { Package, Save, Loader2 } from 'lucide-react';

interface BreadType {
  id: string;
  name: string;
}

interface ProductionFormProps {
  breadTypes: BreadType[];
  managerId: string;
  onSuccess?: () => void;
}

export default function ProductionForm({ breadTypes, managerId, onSuccess }: ProductionFormProps) {
  const { currentShift } = useShift();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const { isOnline } = useOfflineStatus();
  const offlineProductionMutation = useOfflineProductionMutation(managerId);
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<ProductionFormData>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: { 
      entries: breadTypes.map(b => ({ 
        bread_type_id: b.id, 
        quantity: 0, 
        shift: currentShift
      })) 
    },
  });

  const onSubmit = async (data: ProductionFormData) => {
    setLoading(true);
    try {
      const validEntries = data.entries.filter(entry => entry.quantity > 0);
      if (validEntries.length === 0) {
        toast.error('Please enter at least one quantity greater than 0.');
        setLoading(false);
        return;
      }

      // Save feedback once for the shift (if provided)
      if (feedback.trim()) {
        const feedbackResult = await saveFeedback({
          user_id: managerId,
          shift: currentShift,
          note: feedback.trim()
        });
        if (feedbackResult.error) {
          console.warn('Failed to save feedback:', feedbackResult.error);
          // Don't fail the entire operation for feedback errors
        }
      }

      // Save each production entry using offline-aware mutation
      for (const entry of validEntries) {
        await offlineProductionMutation.mutateAsync({ 
          bread_type_id: entry.bread_type_id,
          quantity: entry.quantity,
          shift: entry.shift,
          recorded_by: managerId,
        });
      }
      
      const syncMessage = isOnline 
        ? 'Inventory will update automatically.' 
        : 'Data will sync when connection is restored.';
      toast.success(`Production log saved for ${validEntries.length} bread type(s)! ${syncMessage}`);
      reset();
      setFeedback('');
      onSuccess?.();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to save production log.');
    } finally {
      setLoading(false);
    }
  };

  if (!breadTypes.length) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <Package className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No bread types available</p>
      </Card>
    );
  }

  const isSubmitting = loading || offlineProductionMutation.isPending;

  return (
    <Card className="w-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-semibold">Log Production</span>
        <Badge className={`${currentShift === 'morning' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'}`}>
          {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} Shift
        </Badge>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {breadTypes.map((bread, idx) => (
          <div key={bread.id} className="space-y-2">
            <Label htmlFor={`quantity-${bread.id}`} className="text-sm font-medium">
              {bread.name}
            </Label>
            <Controller
              name={`entries.${idx}.quantity` as const}
              control={control}
              render={({ field }) => (
                <Input
                  id={`quantity-${bread.id}`}
                  type="number"
                  min="0"
                  placeholder="Enter quantity produced"
                  className="w-full"
                  {...field}
                  value={field.value || 0}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.entries?.[idx]?.quantity}
                />
              )}
            />
            {errors.entries?.[idx]?.quantity && (
              <p className="text-xs text-destructive">
                {errors.entries[idx]?.quantity?.message}
              </p>
            )}
          </div>
        ))}

        {/* Feedback Section */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="feedback" className="text-sm font-medium">
            Notes & Feedback (Optional)
          </Label>
          <Textarea
            id="feedback"
            placeholder="Any notes about today's production, issues, or suggestions..."
            className="w-full"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            This feedback will be saved with your shift notes for management review.
          </p>
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full mt-6"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving Production Log...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Production Log
            </>
          )}
        </Button>
        
        {offlineProductionMutation.isPending && (
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