'use client';

import { useState, useTransition, useEffect, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from '@/lib/auth/actions';

// Lightweight toast function to avoid importing heavy sonner
const showToast = (message: string, type: 'error' | 'success' = 'error') => {
  // Create a simple toast notification
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-white max-w-sm transition-all duration-300 ${
    type === 'error' ? 'bg-red-500' : 'bg-green-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
};

const LoginPage = memo(function LoginPage() {
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
      showToast(errorMessage);
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
          showToast(result.error);
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
        showToast(errorMsg);
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Welcome to HomeBake</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="your@email.com"
            />
          </div>
          <div className="text-left">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Enter your password"
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}
          <button 
            type="submit" 
            disabled={isPending}
            className="w-full rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Logging In...
              </span>
            ) : (
              'Log In'
            )}
          </button>
        </form>
        <div className="mt-4 text-sm text-gray-600">
          <p>Don&apos;t have an account? <a href="/signup" className="text-orange-600 hover:underline">Sign up</a></p>
          <p className="mt-2">Need access? Contact your bakery owner for an invite.</p>
        </div>
      </div>
    </main>
  );
});

export default LoginPage;
