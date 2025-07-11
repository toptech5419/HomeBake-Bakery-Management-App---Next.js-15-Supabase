import { z } from 'zod';

export const salesEntrySchema = z.object({
  bread_type_id: z.string().min(1, 'Bread type is required'),
  quantity: z.number().min(0, 'Quantity must be a non-negative number'),
  unit_price: z.number().min(0, 'Unit price must be a non-negative number').optional(),
  discount: z.number().min(0, 'Discount must be a non-negative number').optional().default(0),
  leftover: z.number().min(0, 'Leftover must be a non-negative number').optional().default(0),
  shift: z.enum(['morning', 'night'], {
    required_error: 'Shift is required',
    invalid_type_error: 'Shift must be morning or night',
  }),
  recorded_by: z.string().min(1, 'Recorded by is required'),
  returned: z.boolean().optional().default(false),
});

export const salesFormSchema = z.object({
  entries: z.array(salesEntrySchema).min(1, 'At least one sale entry is required'),
});

export const shiftSummarySchema = z.object({
  shift: z.enum(['morning', 'night']),
  total_sales: z.number().min(0),
  total_revenue: z.number().min(0),
  unsold_loaves: z.number().min(0),
});

export type SalesEntry = z.infer<typeof salesEntrySchema>;
export type SalesFormData = z.infer<typeof salesFormSchema>;
export type ShiftSummary = z.infer<typeof shiftSummarySchema>; 