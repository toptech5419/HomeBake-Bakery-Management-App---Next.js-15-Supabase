'use client';

import * as React from 'react';
import { forgotPassword } from '@/lib/auth/password-reset-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForgotPasswordState {
  error?: { 
    email?: string[];
    _form?: string;
  };
  success?: boolean;
  message?: string;
  email?: string;
}

const initialState: ForgotPasswordState = {};

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Production-grade forgot password modal
 * Features: Clean UI, validation, accessibility, security
 */
export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [state, formAction, isPending] = React.useActionState(
    async (prevState: ForgotPasswordState, formData: FormData) => {
      return await forgotPassword(prevState, formData);
    },
    initialState
  );

  const [email, setEmail] = React.useState('');

  // Handle successful submission
  React.useEffect(() => {
    if (state?.success) {
      // Auto-close modal after 3 seconds on success
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, onClose]);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setEmail('');
      // Reset form state when modal closes
    }
  }, [isOpen]);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div 
        className={cn(
          "relative w-full max-w-md mx-4",
          "bg-white rounded-xl border shadow-2xl",
          "transform transition-all duration-300 ease-out",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 
            id="forgot-password-title" 
            className="text-xl font-semibold text-gray-900"
          >
            Reset Your Password
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex items-center justify-center",
              "w-8 h-8 rounded-lg",
              "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
            )}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {state?.success ? (
            // Success State
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Check Your Email
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {state.message}
                </p>
                {state.email && (
                  <p className="text-xs text-gray-500 mt-2">
                    Sent to: <span className="font-medium">{state.email}</span>
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-500">
                This modal will close automatically in a few seconds...
              </div>
            </div>
          ) : (
            // Form State
            <>
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form action={formAction} className="space-y-4">
                <div>
                  <Label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <div className="mt-1 relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="forgot-email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isPending}
                      className={cn(
                        "pl-10 min-h-[44px]",
                        state?.error?.email && "border-red-300 focus:border-red-500 focus:ring-red-200"
                      )}
                      placeholder="your@email.com"
                      autoComplete="email"
                      aria-describedby={state?.error?.email ? "email-error" : undefined}
                      aria-invalid={state?.error?.email ? 'true' : 'false'}
                    />
                  </div>
                  {state?.error?.email && (
                    <p id="email-error" className="text-sm text-red-600 mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                      {state.error.email[0]}
                    </p>
                  )}
                </div>

                {state?.error?._form && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 flex items-start">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{state.error._form}</span>
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isPending}
                    className="flex-1 min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || !email.trim()}
                    className={cn(
                      "flex-1 min-h-[44px] bg-orange-500 hover:bg-orange-600",
                      "disabled:bg-gray-300 disabled:cursor-not-allowed"
                    )}
                  >
                    {isPending ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Sending...
                      </div>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}