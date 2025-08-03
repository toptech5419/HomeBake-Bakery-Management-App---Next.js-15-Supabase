'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupConfirmPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-lg border p-8 text-center shadow-lg">
        <div className="mb-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">Account Created Successfully!</h1>
        <p className="mt-4 text-muted-foreground">
          Your account has been created and you can now log in to access the bakery management system.
        </p>
        
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Redirecting to login page in <span className="font-semibold text-orange-600">{countdown}</span> seconds...
          </p>
          
          <Link 
            href="/login" 
            className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors"
          >
            Log In Now
          </Link>
        </div>
        
        <p className="mt-6 text-sm text-muted-foreground">
          Didn&apos;t get redirected?{' '}
          <Link href="/login" className="font-semibold text-orange-600 underline">
            Click here to log in
          </Link>
        </p>
      </div>
    </main>
  );
} 