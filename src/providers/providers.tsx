'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ToastProvider } from '@/components/ui/ToastProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryProvider>
  );
}