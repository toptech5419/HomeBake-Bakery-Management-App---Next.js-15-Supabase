'use client';

import * as React from 'react';
import { signup } from '@/lib/auth/signup-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

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
          <Input 
            id="password" 
            name="password" 
            type="password" 
            required 
            className="min-h-[44px] text-sm md:text-base mt-1"
            autoComplete="new-password"
            placeholder="Create a strong password"
          />
          {state?.error && typeof state.error === 'object' && 'password' in state.error && Array.isArray(state.error.password) && state.error.password[0] && (
            <p className="text-sm text-destructive mt-1">{state.error.password[0]}</p>
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