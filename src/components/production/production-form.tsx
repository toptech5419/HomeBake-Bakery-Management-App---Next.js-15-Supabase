"use client";
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productionFormSchema, ProductionFormData } from '@/lib/validations/production';
import { saveFeedback } from '@/lib/production/actions';
import { useOfflineProductionMutation } from '@/hooks/use-offline-mutations';
import { useOfflineStatus } from '@/hooks/use-offline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase/client';

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
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
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

  // Simplified Supabase authentication - OPTIMIZED to prevent browser crashes
  useEffect(() => {
    async function ensureSupabaseAuth() {
      try {
        // Check if already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setIsAuthenticating(false);
          return;
        }

        // Simple authentication without creating users
        const managerEmail = `manager-${managerId}@homebake.local`;
        const tempPassword = 'temp-password-123';
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: managerEmail,
          password: tempPassword
        });

        if (signInError) {
          // If sign in fails, just continue without auth - the app will work without Supabase auth
          console.log('Continuing without Supabase auth');
          setIsAuthenticating(false);
          return;
        }

        if (signInData?.user) {
          setIsAuthenticating(false);
        }

      } catch (error) {
        // Don't break the app if auth fails
        console.log('Auth skipped, continuing...');
        setIsAuthenticating(false);
      }
    }

    ensureSupabaseAuth();
  }, [managerId]);

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
        const productionData = { 
          bread_type_id: entry.bread_type_id,
          quantity: entry.quantity,
          shift: entry.shift,
          recorded_by: managerId,
        };
        
        await offlineProductionMutation.mutateAsync(productionData);
      }
      
      const syncMessage = isOnline 
        ? 'Inventory will update automatically.' 
        : 'Data will sync when connection is restored.';
      toast.success(`Production log saved for ${validEntries.length} bread type(s)! ${syncMessage}`);
      reset();
      setFeedback('');
      onSuccess?.();
    } catch (err) {
      // Simplified error handling without excessive logging
      const errorMessage = (err as Error)?.message || 'Failed to save production log.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitting = loading || offlineProductionMutation.isPending;

  // Show authentication loading
  if (isAuthenticating) {
    return (
      <Card className="w-full p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Setting up authentication...</p>
      </Card>
    );
  }

  // Show authentication error
  if (authError) {
    return (
      <Card className="w-full p-6 text-center border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Authentication Error</h3>
        <p className="text-sm text-red-600 mb-4">{authError}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </Card>
    );
  }

  // Show no bread types message
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
                  step="1"
                  placeholder={`Enter ${bread.name} quantity produced`}
                  className="w-full"
                  value={field.value === 0 ? '' : field.value}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only update if it's a valid number or empty
                    if (value === '') {
                      field.onChange(0);
                    } else if (!isNaN(Number(value)) && Number(value) >= 0) {
                      field.onChange(Number(value));
                    }
                    // If invalid input, don't update the field (prevents auto-changing)
                  }}
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