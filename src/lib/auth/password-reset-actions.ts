'use server';

import { createServer } from '@/lib/supabase/server';
import { z } from 'zod';
import { redirect } from 'next/navigation';

// Validation schemas
const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
});

const resetPasswordSchema = z.object({
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .max(128, 'Password is too long'),
  confirmPassword: z.string()
    .min(6, 'Password confirmation is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Production-grade forgot password implementation
 * Sends secure password reset email via Supabase Auth with Gmail SMTP
 */
export async function forgotPassword(
  prevState: { error?: { email?: string[]; _form?: string } }, 
  formData: FormData
) {
  try {
    // Validate input data
    const result = forgotPasswordSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!result.success) {
      console.warn('🔍 Forgot password validation failed:', result.error.flatten().fieldErrors);
      return {
        error: result.error.flatten().fieldErrors,
      };
    }

    const { email } = result.data;

    console.log(`🔄 Processing password reset request for: ${email}`);
    
    const supabase = await createServer();
    
    // Check if user exists in our system (security: don't reveal if email exists)
    const { data: userExists, error: userQueryError } = await supabase
      .from('users')
      .select('id, email, is_active')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (userQueryError && userQueryError.code !== 'PGRST116') {
      console.error('❌ Database query error:', userQueryError);
      return { 
        error: { _form: 'Database connection issue. Please try again.' }
      };
    }

    // Determine the correct redirect URL based on environment
    const getRedirectUrl = () => {
      // For development, always use localhost
      if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000/auth/reset-password';
      }
      
      // For production, use the configured URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!baseUrl) {
        console.error('❌ NEXT_PUBLIC_APP_URL not configured for production');
        return 'http://localhost:3000/auth/reset-password'; // fallback
      }
      
      return `${baseUrl}/auth/reset-password`;
    };

    const redirectUrl = getRedirectUrl();
    console.log(`🔗 Using redirect URL: ${redirectUrl}`);

    // Always show success message (security: don't reveal if email exists)
    // But only send email if user actually exists and is active
    if (userExists) {
      console.log(`✅ User found, sending reset email to: ${email}`);
      
      // Send password reset email with enhanced error handling
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
        captchaToken: undefined, // Not using captcha for now
      });

      if (resetError) {
        console.error('❌ Password reset email failed:', {
          error: resetError,
          email: email,
          redirectUrl: redirectUrl,
          code: resetError.status,
          message: resetError.message
        });
        
        // Provide more specific error messages for debugging
        if (resetError.message?.includes('SMTP') || resetError.message?.includes('email')) {
          return { 
            error: { _form: 'Email service configuration issue. Please contact support.' }
          };
        }
        
        if (resetError.message?.includes('rate limit')) {
          return { 
            error: { _form: 'Too many requests. Please wait a few minutes and try again.' }
          };
        }
        
        return { 
          error: { _form: 'Unable to send reset email. Please try again later.' }
        };
      }
      
      console.log(`✅ Password reset email sent successfully to: ${email} with redirect: ${redirectUrl}`);
    } else {
      console.log(`⚠️ Password reset requested for non-existent/inactive user: ${email}`);
      // Still show success for security (don't reveal if email exists)
    }
    
    return { 
      success: true,
      message: 'If an account with that email exists, we\'ve sent you a password reset link. Please check your email and spam folder.',
      email
    };
    
  } catch (error) {
    console.error('❌ Unexpected forgot password error:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      timestamp: new Date().toISOString()
    });
    
    return { 
      error: { _form: 'An unexpected error occurred. Please try again.' }
    };
  }
}

/**
 * Production-grade password reset implementation
 * Securely updates user password after email verification
 */
export async function resetPassword(
  prevState: { error?: { password?: string[]; confirmPassword?: string[]; _form?: string } }, 
  formData: FormData
) {
  try {
    // Validate input data
    const result = resetPasswordSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!result.success) {
      console.warn('Password reset validation failed:', result.error.flatten().fieldErrors);
      return {
        error: result.error.flatten().fieldErrors,
      };
    }

    const { password } = result.data;

    console.log(`🔄 Processing password reset update`);
    
    const supabase = await createServer();
    
    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      console.error('❌ Password update failed:', updateError);
      
      // Handle specific error cases
      if (updateError.message.includes('session_not_found') || updateError.message.includes('invalid_token')) {
        return { 
          error: { _form: 'Reset link has expired or is invalid. Please request a new password reset.' }
        };
      }
      
      if (updateError.message.includes('same_password')) {
        return { 
          error: { _form: 'New password must be different from your current password.' }
        };
      }
      
      return { 
        error: { _form: 'Failed to update password. Please try again.' }
      };
    }

    console.log(`✅ Password reset completed successfully`);
    
    // Redirect to login with success message
    redirect('/login?message=password-reset-success');
    
  } catch (error) {
    console.error('❌ Unexpected password reset error:', error);
    
    return { 
      error: { _form: 'An unexpected error occurred. Please try again.' }
    };
  }
}

/**
 * Verify password reset token validity
 * Used to check if reset link is still valid
 */
export async function verifyResetToken(): Promise<{ valid: boolean; error?: string }> {
  try {
    const supabase = await createServer();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { 
        valid: false, 
        error: 'Invalid or expired reset link. Please request a new password reset.' 
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('❌ Token verification error:', error);
    return { 
      valid: false, 
      error: 'Unable to verify reset link. Please try again.' 
    };
  }
}