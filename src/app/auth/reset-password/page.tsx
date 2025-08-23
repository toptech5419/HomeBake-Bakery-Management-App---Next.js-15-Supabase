'use client';

import * as React from 'react';
import { resetPassword, verifyResetToken } from '@/lib/auth/password-reset-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ResetPasswordState {
  error?: { 
    password?: string[];
    confirmPassword?: string[];
    _form?: string;
  };
}

const initialState: ResetPasswordState = {};

/**
 * Production-grade password input with visibility toggle
 * Reused from signup form for consistency
 */
interface PasswordInputProps {
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

function PasswordInput({ 
  id, 
  name, 
  placeholder, 
  required, 
  className, 
  value,
  onChange,
  disabled,
  error 
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  
  const togglePasswordVisibility = React.useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "pr-12", // Add right padding for icon
          className
        )}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? 'true' : 'false'}
      />
      <button
        type="button"
        className={cn(
          // Perfect positioning: absolute right with proper spacing
          "absolute right-3 top-1/2 -translate-y-1/2",
          // Interactive styling
          "flex items-center justify-center",
          "w-8 h-8 rounded-md",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-muted/50 transition-colors",
          // Accessibility
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          // Touch target (44px minimum for mobile)
          "touch-manipulation",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={togglePasswordVisibility}
        disabled={disabled}
        tabIndex={0}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        aria-pressed={showPassword}
        data-testid="password-visibility-toggle"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = React.useActionState(
    async (prevState: ResetPasswordState, formData: FormData) => {
      return await resetPassword(prevState, formData);
    },
    initialState
  );

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isValidToken, setIsValidToken] = React.useState<boolean | null>(null);
  const [tokenError, setTokenError] = React.useState<string>('');

  // Verify reset token on mount
  React.useEffect(() => {
    const verifyToken = async () => {
      const result = await verifyResetToken();
      setIsValidToken(result.valid);
      if (!result.valid && result.error) {
        setTokenError(result.error);
      }
    };
    
    verifyToken();
  }, []);

  // Loading state while verifying token
  if (isValidToken === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
        <div className="w-full max-w-md rounded-lg border border-orange-200 bg-white p-8 text-center shadow-xl">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Verifying Reset Link
          </h1>
          <p className="text-gray-600 text-sm">
            Please wait while we verify your password reset link...
          </p>
        </div>
      </main>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-xl">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            {tokenError || 'This password reset link is invalid or has expired.'}
          </p>
          <div className="space-y-3">
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors min-h-[44px]"
            >
              Back to Login
            </Link>
            <p className="text-xs text-gray-500">
              Need a new reset link? Try the &quot;Forgot password?&quot; option on the login page.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Valid token - show reset form
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="w-full max-w-md rounded-lg border border-orange-200 bg-white p-6 md:p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Reset Your Password
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Enter your new password below. Make sure it&apos;s secure and easy to remember.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div>
            <Label htmlFor="password" className="text-sm md:text-base font-medium">
              New Password
            </Label>
            <div className="mt-1">
              <PasswordInput
                id="password"
                name="password"
                required
                value={password}
                onChange={setPassword}
                disabled={isPending}
                className="min-h-[44px] text-sm md:text-base"
                placeholder="Enter your new password"
                error={state?.error?.password?.[0]}
              />
            </div>
            {state?.error?.password && (
              <p id="password-error" className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                {state.error.password[0]}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm md:text-base font-medium">
              Confirm New Password
            </Label>
            <div className="mt-1">
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                value={confirmPassword}
                onChange={setConfirmPassword}
                disabled={isPending}
                className="min-h-[44px] text-sm md:text-base"
                placeholder="Confirm your new password"
                error={state?.error?.confirmPassword?.[0]}
              />
            </div>
            {state?.error?.confirmPassword && (
              <p id="confirmPassword-error" className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                {state.error.confirmPassword[0]}
              </p>
            )}
          </div>

          {state?.error?._form && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>{state.error._form}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending || !password.trim() || !confirmPassword.trim()}
            className={cn(
              "w-full min-h-[44px] text-base md:text-lg font-semibold bg-orange-500 hover:bg-orange-600",
              "transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none",
              "disabled:bg-gray-300 disabled:cursor-not-allowed"
            )}
          >
            {isPending ? (
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating Password...
              </div>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <Link 
            href="/login" 
            className="text-sm text-gray-600 hover:text-orange-600 font-medium transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}