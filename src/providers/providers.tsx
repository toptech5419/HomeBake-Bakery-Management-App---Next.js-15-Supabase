'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { MobileNotificationProvider } from '@/components/ui/mobile-notifications-fixed';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <MobileNotificationProvider>
        {children}
      </MobileNotificationProvider>
    </QueryProvider>
  );
}