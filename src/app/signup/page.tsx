'use client';

import { Suspense } from 'react';
import SignupForm from './signup-form';
import { MobileLoading } from '@/components/ui/mobile-loading';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join HomeBake
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account to get started
          </p>
        </div>
        <Suspense fallback={<MobileLoading message="Loading signup form..." />}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}