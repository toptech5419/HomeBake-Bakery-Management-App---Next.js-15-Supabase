import { z } from 'zod';

export const productionEntrySchema = z.object({
  bread_type_id: z.string().min(1, 'Bread type is required'),
  quantity: z.number().min(0, 'Quantity must be a non-negative number'),
  shift: z.enum(['morning', 'night'], {
    required_error: 'Shift is required',
    invalid_type_error: 'Shift must be morning or night',
  }),
  feedback: z.string().optional(),
});

export const productionFormSchema = z.object({
  entries: z.array(productionEntrySchema).min(1, 'At least one entry is required'),
});

export type ProductionEntry = z.infer<typeof productionEntrySchema>;
export type ProductionFormData = z.infer<typeof productionFormSchema>; 