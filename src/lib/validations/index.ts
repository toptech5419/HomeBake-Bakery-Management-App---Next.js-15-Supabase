// Re-export all validation schemas from modules
export * from './bread-types';
export * from './sales';
export * from './production';

// Common validation patterns
import { z } from 'zod';

// User validation schemas
export const userEmailSchema = z.string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

export const userPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters');

export const userNameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

export const userRoleSchema = z.enum(['owner', 'manager', 'sales_rep'], {
  required_error: 'Role is required',
  invalid_type_error: 'Invalid role selected',
});

// User profile schemas
export const userProfileSchema = z.object({
  email: userEmailSchema,
  full_name: userNameSchema,
  role: userRoleSchema,
});

export const userInviteSchema = z.object({
  email: userEmailSchema,
  full_name: userNameSchema,
  role: userRoleSchema,
});

export const userUpdateSchema = z.object({
  full_name: userNameSchema.optional(),
  role: userRoleSchema.optional(),
});

// Auth validation schemas
export const loginSchema = z.object({
  email: userEmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: userEmailSchema,
  password: userPasswordSchema,
  confirmPassword: z.string(),
  full_name: userNameSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  email: userEmailSchema,
});

export const newPasswordSchema = z.object({
  password: userPasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Shift validation schemas
export const shiftSchema = z.enum(['morning', 'night'], {
  required_error: 'Shift is required',
  invalid_type_error: 'Shift must be morning or night',
});

export const shiftFeedbackSchema = z.object({
  shift: shiftSchema,
  note: z.string()
    .min(1, 'Feedback note is required')
    .max(1000, 'Feedback note must be less than 1000 characters'),
  rating: z.number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5')
    .optional(),
});

// Common field validation schemas
export const positiveNumberSchema = z.number()
  .positive('Must be a positive number')
  .finite('Must be a finite number');

export const nonNegativeNumberSchema = z.number()
  .min(0, 'Must be zero or greater')
  .finite('Must be a finite number');

export const percentageSchema = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

export const currencySchema = z.number()
  .min(0, 'Amount cannot be negative')
  .finite('Amount must be a finite number');

export const quantitySchema = z.number()
  .int('Quantity must be a whole number')
  .min(0, 'Quantity cannot be negative');

export const idSchema = z.string()
  .min(1, 'ID is required')
  .uuid('Invalid ID format');

export const dateSchema = z.date({
  required_error: 'Date is required',
  invalid_type_error: 'Invalid date format',
});

export const optionalDateSchema = z.date().optional();

// Search and filter schemas
export const searchSchema = z.object({
  query: z.string()
    .max(100, 'Search query too long')
    .optional(),
  page: z.number()
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1')
    .optional()
    .default(1),
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
});

export const dateRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
}).refine((data) => data.startDate <= data.endDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const reportFiltersSchema = z.object({
  dateRange: dateRangeSchema.optional(),
  shift: shiftSchema.optional(),
  breadTypeId: idSchema.optional(),
});

// Type exports for all schemas
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserInvite = z.infer<typeof userInviteSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type NewPasswordData = z.infer<typeof newPasswordSchema>;
export type ShiftFeedback = z.infer<typeof shiftFeedbackSchema>;
export type SearchParams = z.infer<typeof searchSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

// Validation helper functions
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
}

export function formatValidationError(error: z.ZodError): string {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
}