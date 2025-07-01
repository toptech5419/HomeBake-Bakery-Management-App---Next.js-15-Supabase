'use client';

import { useState, useEffect } from 'react';

// Service Worker registration and management
export class ServiceWorkerManager {
  private static registration: ServiceWorkerRegistration | null = null;
  private static isSupported = false;
  private static isRegistered = false;

  static async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    this.isSupported = 'serviceWorker' in navigator;
    
    if (!this.isSupported) {
      console.warn('Service Workers are not supported in this browser');
      return false;
    }

    try {
      await this.register();
      this.setupMessageListeners();
      return true;
    } catch (error) {
      console.error('Failed to initialize Service Worker:', error);
      return false;
    }
  }

  private static async register(): Promise<ServiceWorkerRegistration> {
    if (this.registration) {
      return this.registration;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'imports'
      });

      this.registration = registration;
      this.isRegistered = true;

      console.log('Service Worker registered successfully:', registration.scope);

      // Handle registration updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          console.log('New Service Worker installing...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New Service Worker installed, prompting user to update...');
              this.handleUpdate(registration);
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  private static setupMessageListeners(): void {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Message from Service Worker:', event.data);
      
      switch (event.data.type) {
        case 'BACKGROUND_SYNC':
          this.handleBackgroundSync(event.data);
          break;
          
        case 'CACHE_UPDATE':
          this.handleCacheUpdate(event.data);
          break;
          
        default:
          console.log('Unknown message from Service Worker:', event.data);
      }
    });
  }

  private static handleBackgroundSync(data: any): void {
    console.log('Background sync triggered by Service Worker:', data);
    
    // Dispatch custom event for the app to handle
    window.dispatchEvent(new CustomEvent('sw-background-sync', {
      detail: data
    }));
  }

  private static handleCacheUpdate(data: any): void {
    console.log('Cache update from Service Worker:', data);
    
    // Could be used to update UI when new content is cached
    window.dispatchEvent(new CustomEvent('sw-cache-update', {
      detail: data
    }));
  }

  private static handleUpdate(registration: ServiceWorkerRegistration): void {
    // Show user notification about available update
    const shouldUpdate = window.confirm(
      'A new version of the app is available. Would you like to update now?'
    );

    if (shouldUpdate) {
      this.skipWaiting();
    }
  }

  // Public methods for app interaction
  static async triggerSync(): Promise<void> {
    if (!this.isSupported || !this.registration) {
      console.warn('Service Worker not available for sync');
      return;
    }

    try {
      if ('sync' in window.ServiceWorkerRegistration.prototype && (this.registration as any).sync) {
        await (this.registration as any).sync.register('homebake-sync');
        console.log('Background sync registered');
      } else {
        console.warn('Background Sync not supported');
        // Fallback: send message to service worker
        this.sendMessage({ type: 'TRIGGER_SYNC' });
      }
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }

  static sendMessage(message: any): void {
    if (!this.isSupported || !navigator.serviceWorker.controller) {
      console.warn('Service Worker not available for messaging');
      return;
    }

    navigator.serviceWorker.controller.postMessage(message);
  }

  static async skipWaiting(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    this.sendMessage({ type: 'SKIP_WAITING' });
    
    // Wait for the new service worker to take control
    await new Promise<void>((resolve) => {
      const handleControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        resolve();
      };
      
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    });

    // Reload the page to use the new service worker
    window.location.reload();
  }

  static async unregister(): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      this.isRegistered = false;
      console.log('Service Worker unregistered');
      return result;
    } catch (error) {
      console.error('Failed to unregister Service Worker:', error);
      return false;
    }
  }

  static getStatus(): {
    isSupported: boolean;
    isRegistered: boolean;
    registration: ServiceWorkerRegistration | null;
  } {
    return {
      isSupported: this.isSupported,
      isRegistered: this.isRegistered,
      registration: this.registration
    };
  }

  // Check if app is running in standalone mode (installed as PWA)
  static isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  // Request persistent storage (for better offline experience)
  static async requestPersistentStorage(): Promise<boolean> {
    if (typeof window === 'undefined' || !('storage' in navigator) || !('persist' in navigator.storage)) {
      return false;
    }

    try {
      const persistent = await navigator.storage.persist();
      console.log(`Persistent storage: ${persistent ? 'granted' : 'denied'}`);
      return persistent;
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }

  // Get storage usage estimate
  static async getStorageEstimate(): Promise<StorageEstimate | null> {
    if (typeof window === 'undefined' || !('storage' in navigator) || !('estimate' in navigator.storage)) {
      return null;
    }

    try {
      return await navigator.storage.estimate();
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      return null;
    }
  }
}

// Hook for React components to interact with Service Worker
export function useServiceWorker() {
  const [isReady, setIsReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const initializeServiceWorker = async () => {
      const success = await ServiceWorkerManager.initialize();
      setIsReady(success);
      setIsStandalone(ServiceWorkerManager.isStandalone());
    };

    initializeServiceWorker();

    // Listen for Service Worker events
    const handleBackgroundSync = (event: CustomEvent) => {
      console.log('Background sync event received:', event.detail);
    };

    const handleCacheUpdate = (event: CustomEvent) => {
      console.log('Cache update event received:', event.detail);
    };

    window.addEventListener('sw-background-sync', handleBackgroundSync as EventListener);
    window.addEventListener('sw-cache-update', handleCacheUpdate as EventListener);

    return () => {
      window.removeEventListener('sw-background-sync', handleBackgroundSync as EventListener);
      window.removeEventListener('sw-cache-update', handleCacheUpdate as EventListener);
    };
  }, []);

  return {
    isReady,
    isStandalone,
    triggerSync: ServiceWorkerManager.triggerSync,
    sendMessage: ServiceWorkerManager.sendMessage,
    getStatus: ServiceWorkerManager.getStatus,
    requestPersistentStorage: ServiceWorkerManager.requestPersistentStorage,
    getStorageEstimate: ServiceWorkerManager.getStorageEstimate
  };
}