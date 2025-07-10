'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { MobileNotificationProvider } from '@/components/ui/mobile-notifications';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ToastProvider>
        <MobileNotificationProvider>
          {children}
        </MobileNotificationProvider>
      </ToastProvider>
    </QueryProvider>
  );
}