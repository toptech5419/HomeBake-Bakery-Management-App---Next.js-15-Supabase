'use client';

import { useState, useTransition, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/auth/actions';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  // Handle error messages from URL parameters
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      let errorMessage = '';
      switch (urlError) {
        case 'no-profile':
          errorMessage = 'Your account is not set up. Please contact your bakery owner for access.';
          break;
        case 'profile-error':
          errorMessage = 'There was an issue with your account. Please try again or contact support.';
          break;
        case 'auth-error':
          errorMessage = 'Authentication failed. Please try logging in again.';
          break;
        default:
          errorMessage = 'An error occurred. Please try again.';
      }
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    
    startTransition(async () => {
      try {
        const result = await login({ error: undefined }, formData);
        if (result?.error) {
          setError(result.error);
          toast.error(result.error);
        }
        // If no error and no result, the server action redirected successfully
        // Don't show any error message in this case
      } catch (err) {
        // Check if this is a redirect error (which is expected for successful logins)
        if (err && typeof err === 'object' && 'digest' in err) {
          // This is likely a Next.js redirect, which is expected behavior
          // Don't show an error message
          return;
        }
        
        const errorMsg = 'An unexpected error occurred. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border p-8 text-center shadow-lg">
        <h1 className="mb-6 text-2xl font-bold">Welcome to HomeBake</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              disabled={isPending}
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isPending}
          >
            {isPending ? 'Logging In...' : 'Log In'}
          </Button>
        </form>
        <div className="mt-4 text-sm text-gray-600">
          <p>Don&apos;t have an account? <a href="/signup" className="text-orange-600 hover:underline">Sign up</a></p>
          <p className="mt-2">Need access? Contact your bakery owner for an invite.</p>
        </div>
      </div>
    </main>
  );
}
