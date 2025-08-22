import { z } from 'zod';

export const breadTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  size: z.string().optional(),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  is_active: z.boolean().optional().default(true),
});

// Enhanced schema for soft delete operations
export const breadTypeUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  size: z.string().optional(),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  is_active: z.boolean().optional(),
});

// Schema for status-only updates (activate/deactivate)
export const breadTypeStatusSchema = z.object({
  is_active: z.boolean(),
}); 