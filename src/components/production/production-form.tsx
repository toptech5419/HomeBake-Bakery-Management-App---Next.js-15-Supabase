"use client";
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productionFormSchema, ProductionFormData } from '@/lib/validations/production';
import { insertProductionLog } from '@/lib/production/actions';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useShift } from '@/hooks/use-shift';
import { Package, Save } from 'lucide-react';

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
  const { shift } = useShift();
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<ProductionFormData>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: { 
      entries: breadTypes.map(b => ({ 
        bread_type_id: b.id, 
        quantity: 0, 
        shift,
        feedback: ''
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

      for (const entry of validEntries) {
        const result = await insertProductionLog({ ...entry, manager_id: managerId });
        if (result.error) throw new Error(result.error);
      }
      
      toast.success(`Production log saved for ${validEntries.length} bread type(s)!`);
      reset();
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

  return (
    <Card className="w-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-semibold">Log Production</span>
        <Badge variant={shift === 'morning' ? 'default' : 'secondary'}>
          {shift.charAt(0).toUpperCase() + shift.slice(1)} Shift
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
                  placeholder="0"
                  className="w-full"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  disabled={loading}
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
        
        {/* Feedback field for optional notes */}
        <div className="space-y-2">
          <Label htmlFor="feedback" className="text-sm font-medium">
            Notes (Optional)
          </Label>
          <Controller
            name="entries.0.feedback"
            control={control}
            render={({ field }) => (
              <Textarea
                id="feedback"
                placeholder="Any notes about today's production..."
                className="w-full"
                rows={3}
                {...field}
                disabled={loading}
              />
            )}
          />
        </div>

        <Button 
          type="submit" 
          loading={loading} 
          disabled={loading}
          className="w-full mt-6"
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving Production Log...' : 'Save Production Log'}
        </Button>
      </form>
    </Card>
  );
} 