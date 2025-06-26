'use client';

import SignupForm from './signup-form';
import { Suspense } from 'react';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Suspense fallback={<div className="w-full max-w-md rounded-lg border p-8 text-center shadow-lg"><p>Loading...</p></div>}>
        <SignupForm />
      </Suspense>
    </main>
  );
}