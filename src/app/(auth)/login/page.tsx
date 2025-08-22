'use client';

import { useState, useTransition, useEffect, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from '@/lib/auth/actions';
import { LoadingButton } from '@/components/ui/loading-button';
import { useMobileNotifications, NotificationHelpers } from '@/components/ui/mobile-notifications-enhanced';
import { LogIn, Mail, Lock } from 'lucide-react';
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';

const LoginPage = memo(function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const searchParams = useSearchParams();
  const { showNotification } = useMobileNotifications();

  // Handle error messages and success messages from URL parameters
  useEffect(() => {
    const urlError = searchParams.get('error');
    const urlMessage = searchParams.get('message');
    
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
      showNotification(NotificationHelpers.error('Login Error', errorMessage));
    }
    
    if (urlMessage === 'password-reset-success') {
      showNotification(NotificationHelpers.success('Password Reset', 'Password reset successfully! You can now log in with your new password.'));
    }
  }, [searchParams, showNotification]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      showNotification(NotificationHelpers.error('Validation Error', 'Please enter both email and password'));
      return;
    }
    
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    
    startTransition(async () => {
      try {
        const result = await login({ error: undefined }, formData);
        if (result?.error) {
          setError(result.error);
          showNotification(NotificationHelpers.error('Login Error', result.error));
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
        showNotification(NotificationHelpers.error('Login Error', errorMsg));
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4 md:p-6">
      <div className="w-full max-w-md rounded-lg border border-orange-200 bg-white p-6 md:p-8 text-center shadow-xl">
        <div className="mb-6">
          <div className="text-4xl mb-3">🍞</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Welcome to HomeBake</h1>
          <p className="text-gray-600 text-sm md:text-base">Sign in to your bakery account</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="text-left">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                id="email" 
                name="email" 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                disabled={isPending}
                className="w-full pl-10 pr-4 py-3 md:py-4 rounded-md border border-gray-300 text-sm md:text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-gray-50 disabled:text-gray-500 transition-colors min-h-[44px]"
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
          </div>
          
          <div className="text-left">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-orange-600 hover:text-orange-500 font-medium hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 rounded px-1 py-0.5"
                disabled={isPending}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                id="password" 
                name="password" 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                disabled={isPending}
                className="w-full pl-10 pr-4 py-3 md:py-4 rounded-md border border-gray-300 text-sm md:text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-gray-50 disabled:text-gray-500 transition-colors min-h-[44px]"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}
          
          <LoadingButton 
            type="submit" 
            isLoading={isPending}
            loadingText="Logging In..."
            icon={LogIn}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white min-h-[44px] text-base md:text-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
            size="lg"
          >
            Log In
          </LoadingButton>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-200 text-sm md:text-base text-gray-600">
          <p>Don&apos;t have an account? <a href="/signup" className="text-orange-600 hover:underline font-medium transition-colors">Sign up</a></p>
          <p className="mt-2">Need access? Contact your bakery owner for an invite.</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </main>
  );
});

export default LoginPage;
