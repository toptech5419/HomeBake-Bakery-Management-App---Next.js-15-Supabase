'use client';

import { useEffect } from 'react';
import { ServiceWorkerManager } from '@/lib/service-worker';

interface PWAWrapperProps {
  children: React.ReactNode;
}

export default function PWAWrapper({ children }: PWAWrapperProps) {
  useEffect(() => {
    // Only register service worker in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      const initializeServiceWorker = async () => {
        try {
          const success = await ServiceWorkerManager.initialize();
          if (success) {
            console.log('PWA: Service Worker initialized successfully');
            
            // Request persistent storage for better offline experience
            await ServiceWorkerManager.requestPersistentStorage();
          } else {
            console.warn('PWA: Service Worker initialization failed');
          }
        } catch (error) {
          console.error('PWA: Service Worker error:', error);
        }
      };

      // Initialize with a small delay to avoid blocking the initial render
      setTimeout(initializeServiceWorker, 1000);
    }
  }, []);

  return <>{children}</>;
}