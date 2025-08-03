'use client';

// Connection health monitoring utility
export class ConnectionHealth {
  private static instance: ConnectionHealth;
  private isOnline: boolean = true;
  private retryQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;
  private listeners: Array<(isOnline: boolean) => void> = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
      this.isOnline = navigator.onLine;
    }
  }

  public static getInstance(): ConnectionHealth {
    if (!ConnectionHealth.instance) {
      ConnectionHealth.instance = new ConnectionHealth();
    }
    return ConnectionHealth.instance;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    // Periodic connection check
    setInterval(() => {
      this.checkConnection();
    }, 30000); // Check every 30 seconds
  }

  private async checkConnection(): Promise<void> {
    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      
      if (!wasOnline && this.isOnline) {
        this.notifyListeners();
        this.processRetryQueue();
      } else if (wasOnline && !this.isOnline) {
        this.notifyListeners();
      }
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false;
        this.notifyListeners();
      }
    }
  }

  public addToRetryQueue(operation: () => Promise<any>): void {
    this.retryQueue.push(operation);
  }

  private async processRetryQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnline) return;
    
    this.isProcessingQueue = true;
    
    while (this.retryQueue.length > 0 && this.isOnline) {
      const operation = this.retryQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.warn('Retry operation failed:', error);
          // If operation fails, we might be offline again
          if (error instanceof Error && error.message.includes('fetch failed')) {
            this.isOnline = false;
            this.notifyListeners();
            break;
          }
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  public addListener(callback: (isOnline: boolean) => void): void {
    this.listeners.push(callback);
  }

  public removeListener(callback: (isOnline: boolean) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  public get online(): boolean {
    return this.isOnline;
  }
}

// Utility function to wrap Supabase operations with offline handling
export async function withOfflineSupport<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T> {
  const connectionHealth = ConnectionHealth.getInstance();
  
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && 
        (error.message.includes('fetch failed') || 
         error.message.includes('UND_ERR_') ||
         error.message.includes('Network request failed'))) {
      
      // Add to retry queue if we're offline
      if (!connectionHealth.online) {
        connectionHealth.addToRetryQueue(operation);
      }
      
      if (fallback !== undefined) {
        return fallback;
      }
    }
    throw error;
  }
}

// Show connection status to user
export function createConnectionStatusIndicator(): HTMLElement {
  const indicator = document.createElement('div');
  indicator.id = 'connection-status';
  indicator.className = 'fixed top-0 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 text-sm font-medium rounded-b-md transition-all duration-300';
  
  const connectionHealth = ConnectionHealth.getInstance();
  
  const updateIndicator = (isOnline: boolean) => {
    if (isOnline) {
      indicator.className = indicator.className.replace('bg-red-500', 'bg-green-500');
      indicator.textContent = 'Connected';
      indicator.style.backgroundColor = '#10b981';
      indicator.style.color = 'white';
      
      // Hide after 2 seconds
      setTimeout(() => {
        indicator.style.transform = 'translate(-50%, -100%)';
      }, 2000);
    } else {
      indicator.className = indicator.className.replace('bg-green-500', 'bg-red-500');
      indicator.textContent = 'No Connection - Working Offline';
      indicator.style.backgroundColor = '#ef4444';
      indicator.style.color = 'white';
      indicator.style.transform = 'translate(-50%, 0)';
    }
  };
  
  connectionHealth.addListener(updateIndicator);
  updateIndicator(connectionHealth.online);
  
  return indicator;
}