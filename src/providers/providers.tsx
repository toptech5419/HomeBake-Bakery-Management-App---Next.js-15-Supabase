'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ShiftProvider } from '@/contexts/ShiftContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ToastProvider>
        <ShiftProvider>
          {children}
        </ShiftProvider>
      </ToastProvider>
    </QueryProvider>
  );
}