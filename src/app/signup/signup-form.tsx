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
  const [state, formAction, isPending] = React.useActionState(signup, initialState);
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
      <div className="w-full max-w-md rounded-lg border p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-destructive">Invalid Link</h1>
        <p className="mt-4 text-muted-foreground">
          This signup link is invalid or missing a token. Please request a new invite.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-primary underline">
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border p-8 shadow-lg">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create Your Account</h1>
        <p className="text-muted-foreground">
          Complete the form below to finish setting up your account.
        </p>
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" type="text" placeholder="John Doe" required />
          {state?.error?.name && <p className="text-sm text-destructive">{state.error.name[0]}</p>}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="me@example.com" required />
          {state?.error?.email && <p className="text-sm text-destructive">{state.error.email[0]}</p>}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
          {state?.error?.password && <p className="text-sm text-destructive">{state.error.password[0]}</p>}
        </div>

        {state?.error?._form && <p className="text-sm text-destructive">{state.error._form}</p>}
        
        {state?.success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm">{state.message}</p>
            <p className="text-green-700 text-xs mt-1">Redirecting to confirmation page...</p>
          </div>
        )}
        
        <Button type="submit" className="w-full" loading={isPending} disabled={isPending}>
          {isPending ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

       <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary underline">
            Log in
          </Link>
        </p>
    </div>
  );
} 