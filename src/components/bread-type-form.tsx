import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { breadTypeSchema } from '@/lib/validations/bread-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BreadTypeFormData {
  name: string;
  size?: string;
  unit_price: number;
}

interface BreadTypeFormProps {
  initialValues: Partial<BreadTypeFormData>;
  onSubmit: (data: BreadTypeFormData) => Promise<void>;
  loading: boolean;
}

export function BreadTypeForm({ initialValues, onSubmit, loading }: BreadTypeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BreadTypeFormData>({
    resolver: zodResolver(breadTypeSchema),
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white rounded shadow p-4 w-full max-w-md mx-auto">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., White Bread"
          className="mt-1 w-full"
          aria-invalid={!!errors.name}
          aria-describedby="name-error"
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="size">Size (optional)</Label>
        <Input
          id="size"
          {...register('size')}
          placeholder="e.g., 500g"
          className="mt-1 w-full"
          aria-invalid={!!errors.size}
          aria-describedby="size-error"
        />
        {errors.size && (
          <p id="size-error" className="text-sm text-red-500 mt-1">{errors.size.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="unit_price">Unit Price</Label>
        <Input
          id="unit_price"
          type="number"
          step="0.01"
          {...register('unit_price', { valueAsNumber: true })}
          placeholder="0.00"
          className="mt-1 w-full"
          aria-invalid={!!errors.unit_price}
          aria-describedby="unit_price-error"
        />
        {errors.unit_price && (
          <p id="unit_price-error" className="text-sm text-red-500 mt-1">{errors.unit_price.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 transition flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
        aria-busy={loading}
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
        ) : null}
        {loading ? 'Saving...' : 'Save Bread Type'}
      </button>
    </form>
  );
} 