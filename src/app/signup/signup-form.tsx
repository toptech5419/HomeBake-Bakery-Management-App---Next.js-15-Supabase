'use client';

import * as React from 'react';
import { signup } from '@/lib/auth/signup-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignupState {
  error?: { 
    _form?: string;
    name?: string[];
    email?: string[];
    password?: string[];
  };
  success?: boolean;
  message?: string;
}

const initialState: SignupState = {};

/**
 * Production-grade password input with visibility toggle
 * Features: Perfect positioning, accessibility, clean design
 */
interface PasswordInputProps {
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  autoComplete?: string;
  error?: string;
}

function PasswordInput({ 
  id, 
  name, 
  placeholder, 
  required, 
  className, 
  autoComplete,
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
        className={cn(
          "pr-12", // Add right padding for icon
          className
        )}
        autoComplete={autoComplete}
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
          "touch-manipulation"
        )}
        onClick={togglePasswordVisibility}
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

export default function SignupForm() {
  const [state, formAction, isPending] = React.useActionState(
    async (prevState: SignupState, formData: FormData) => {
      return await signup(prevState, formData);
    },
    initialState
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  // Handle success redirect
  React.useEffect(() => {
    if (state?.success) {
      // Redirect to confirm page after successful signup
      router.push('/signup/confirm');
    }
  }, [state?.success, router]);

  // OPTIMIZATION: Show form immediately, validate on submit
  if (!token) {
    return (
      <div className="w-full max-w-md rounded-lg border p-6 md:p-8 text-center shadow-lg">
        <div className="text-4xl mb-4">🚫</div>
        <h1 className="text-xl md:text-2xl font-bold text-destructive">Invalid Link</h1>
        <p className="mt-4 text-sm md:text-base text-muted-foreground">
          This signup link is invalid or missing a token. Please request a new invite.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm md:text-base font-semibold text-primary underline min-h-[44px] py-2 px-4 rounded transition-colors hover:bg-primary/10">
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border p-6 md:p-8 shadow-lg">
      <div className="text-center">
        <div className="text-4xl mb-3">🎆</div>
        <h1 className="text-xl md:text-2xl font-bold">Create Your Account</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Complete the form below to finish setting up your account.
        </p>
      </div>

      <form action={formAction} className="mt-6 space-y-5">
        <input type="hidden" name="token" value={token} />
        
        <div>
          <Label htmlFor="name" className="text-sm md:text-base font-medium">Full Name</Label>
          <Input 
            id="name" 
            name="name" 
            type="text" 
            placeholder="John Doe" 
            required 
            className="min-h-[44px] text-sm md:text-base mt-1"
            autoComplete="name"
          />
          {state?.error && typeof state.error === 'object' && 'name' in state.error && Array.isArray(state.error.name) && state.error.name[0] && (
            <p className="text-sm text-destructive mt-1">{state.error.name[0]}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-sm md:text-base font-medium">Email</Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="me@example.com" 
            required 
            className="min-h-[44px] text-sm md:text-base mt-1"
            autoComplete="email"
          />
          {state?.error && typeof state.error === 'object' && 'email' in state.error && Array.isArray(state.error.email) && state.error.email[0] && (
            <p className="text-sm text-destructive mt-1">{state.error.email[0]}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password" className="text-sm md:text-base font-medium">Password</Label>
          <div className="mt-1">
            <PasswordInput
              id="password"
              name="password"
              required
              className="min-h-[44px] text-sm md:text-base"
              autoComplete="new-password"
              placeholder="Create a strong password"
              error={state?.error && typeof state.error === 'object' && 'password' in state.error && Array.isArray(state.error.password) && state.error.password[0] ? state.error.password[0] : undefined}
            />
          </div>
          {state?.error && typeof state.error === 'object' && 'password' in state.error && Array.isArray(state.error.password) && state.error.password[0] && (
            <p id="password-error" className="text-sm text-destructive mt-1">{state.error.password[0]}</p>
          )}
        </div>

        {state?.error && typeof state.error === 'object' && '_form' in state.error && typeof state.error._form === 'string' && (
          <p className="text-sm text-destructive">{state.error._form}</p>
        )}
        
        {state?.success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm">{state.message}</p>
            <p className="text-green-700 text-xs mt-1">Redirecting to confirmation page...</p>
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full min-h-[44px] text-base md:text-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none" 
          loading={isPending} 
          disabled={isPending}
        >
          {isPending ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

       <p className="mt-6 text-center text-sm md:text-base text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary underline transition-colors hover:text-primary/80">
            Log in
          </Link>
        </p>
    </div>
  );
} 