import { z } from 'zod';

export const salesEntrySchema = z.object({
  bread_type_id: z.string().min(1, 'Bread type is required'),
  quantity_sold: z.number().min(0, 'Quantity sold must be a non-negative number'),
  discount_percentage: z.number().min(0).max(100).optional().default(0),
  shift: z.enum(['morning', 'night'], {
    required_error: 'Shift is required',
    invalid_type_error: 'Shift must be morning or night',
  }),
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