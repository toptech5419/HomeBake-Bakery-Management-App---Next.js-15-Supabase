/**
 * Production-ready loading state management
 * Provides consistent loading UX across the application
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  error?: string;
}

interface UseLoadingOptions {
  initialLoading?: boolean;
  minDuration?: number; // Minimum loading duration to prevent flicker
  timeout?: number; // Maximum loading duration before error
  onTimeout?: () => void;
  onError?: (error: string) => void;
}

/**
 * Enhanced loading state hook with production optimizations
 */
export function useLoading(options: UseLoadingOptions = {}) {
  const {
    initialLoading = false,
    minDuration = 300, // 300ms minimum to prevent flicker
    timeout = 30000, // 30 second timeout
    onTimeout,
    onError
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    progress: undefined,
    message: undefined,
    error: undefined,
  });

  const loadingStartTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const minDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start loading with optional message and progress
  const startLoading = useCallback((message?: string, progress?: number) => {
    loadingStartTime.current = Date.now();
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      message,
      progress,
      error: undefined,
    }));

    // Set timeout for maximum loading duration
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const errorMessage = 'Operation is taking longer than expected. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      onTimeout?.();
      onError?.(errorMessage);
    }, timeout);
  }, [timeout, onTimeout, onError]);

  // Stop loading with minimum duration enforcement
  const stopLoading = useCallback((error?: string) => {
    const now = Date.now();
    const elapsed = loadingStartTime.current ? now - loadingStartTime.current : 0;
    const remaining = Math.max(0, minDuration - elapsed);

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const updateState = () => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: undefined,
        message: undefined,
        error,
      }));
      
      if (error) {
        onError?.(error);
      }
    };

    if (remaining > 0) {
      // Wait for minimum duration
      minDurationTimeoutRef.current = setTimeout(updateState, remaining);
    } else {
      updateState();
    }
  }, [minDuration, onError]);

  // Update progress during loading
  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
      message: message || prev.message,
    }));
  }, []);

  // Update message during loading
  const updateMessage = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      message,
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: undefined,
    }));
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (minDurationTimeoutRef.current) {
        clearTimeout(minDurationTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startLoading,
    stopLoading,
    updateProgress,
    updateMessage,
    clearError,
  };
}

/**
 * Global loading state for app-wide operations
 */
class GlobalLoadingManager {
  private static instance: GlobalLoadingManager;
  private listeners: Set<(state: LoadingState) => void> = new Set();
  private state: LoadingState = {
    isLoading: false,
    progress: undefined,
    message: undefined,
    error: undefined,
  };

  private constructor() {}

  static getInstance(): GlobalLoadingManager {
    if (!GlobalLoadingManager.instance) {
      GlobalLoadingManager.instance = new GlobalLoadingManager();
    }
    return GlobalLoadingManager.instance;
  }

  subscribe(listener: (state: LoadingState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  startLoading(message?: string, progress?: number) {
    this.state = {
      isLoading: true,
      message,
      progress,
      error: undefined,
    };
    this.notify();
  }

  updateProgress(progress: number, message?: string) {
    this.state = {
      ...this.state,
      progress: Math.max(0, Math.min(100, progress)),
      message: message || this.state.message,
    };
    this.notify();
  }

  updateMessage(message: string) {
    this.state = {
      ...this.state,
      message,
    };
    this.notify();
  }

  stopLoading(error?: string) {
    this.state = {
      isLoading: false,
      progress: undefined,
      message: undefined,
      error,
    };
    this.notify();
  }

  getState() {
    return this.state;
  }
}

// Global loading manager instance
export const globalLoading = GlobalLoadingManager.getInstance();

/**
 * Hook to subscribe to global loading state
 */
export function useGlobalLoading() {
  const [state, setState] = useState<LoadingState>(globalLoading.getState());

  useEffect(() => {
    const unsubscribe = globalLoading.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    startLoading: globalLoading.startLoading.bind(globalLoading),
    updateProgress: globalLoading.updateProgress.bind(globalLoading),
    updateMessage: globalLoading.updateMessage.bind(globalLoading),
    stopLoading: globalLoading.stopLoading.bind(globalLoading),
  };
}

/**
 * Hook for managing multiple concurrent loading states
 */
export function useMultipleLoadingStates<T extends string>(
  keys: readonly T[],
  options: UseLoadingOptions = {}
) {
  const [states, setStates] = useState<Record<T, LoadingState>>(() => {
    const initialStates = {} as Record<T, LoadingState>;
    keys.forEach(key => {
      initialStates[key] = {
        isLoading: options.initialLoading || false,
        progress: undefined,
        message: undefined,
        error: undefined,
      };
    });
    return initialStates;
  });

  const startLoading = useCallback((key: T, message?: string, progress?: number) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: true,
        message,
        progress,
        error: undefined,
      },
    }));
  }, []);

  const stopLoading = useCallback((key: T, error?: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        progress: undefined,
        message: undefined,
        error,
      },
    }));
  }, []);

  const updateProgress = useCallback((key: T, progress: number, message?: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        progress: Math.max(0, Math.min(100, progress)),
        message: message || prev[key].message,
      },
    }));
  }, []);

  const clearError = useCallback((key: T) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        error: undefined,
      },
    }));
  }, []);

  const isAnyLoading = Object.values(states).some(state => state.isLoading);
  const hasAnyError = Object.values(states).some(state => state.error);

  return {
    states,
    startLoading,
    stopLoading,
    updateProgress,
    clearError,
    isAnyLoading,
    hasAnyError,
  };
}

/**
 * Hook for form submission loading states
 */
export function useFormLoading() {
  const loading = useLoading({
    minDuration: 500, // Slightly longer minimum for form feedback
    timeout: 60000, // Longer timeout for form submissions
  });

  const submitWithLoading = useCallback(async <T>(
    submitFn: () => Promise<T>,
    loadingMessage = 'Submitting...',
    successMessage = 'Success!'
  ): Promise<T> => {
    try {
      loading.startLoading(loadingMessage);
      const result = await submitFn();
      loading.updateMessage(successMessage);
      
      // Show success message briefly before stopping
      setTimeout(() => {
        loading.stopLoading();
      }, 1000);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      loading.stopLoading(errorMessage);
      throw error;
    }
  }, [loading]);

  return {
    ...loading,
    submitWithLoading,
  };
}

/**
 * Hook for data fetching loading states with retry logic
 */
export function useDataLoading(retryCount = 3) {
  const loading = useLoading({
    minDuration: 200,
    timeout: 15000,
  });

  const [currentRetry, setCurrentRetry] = useState(0);

  const fetchWithLoading = useCallback(async <T>(
    fetchFn: () => Promise<T>,
    loadingMessage = 'Loading...'
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const message = attempt > 0 
          ? `${loadingMessage} (Retry ${attempt}/${retryCount})`
          : loadingMessage;
        
        loading.startLoading(message);
        setCurrentRetry(attempt);
        
        const result = await fetchFn();
        loading.stopLoading();
        setCurrentRetry(0);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryCount) {
          break;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const errorMessage = lastError.message || 'Failed to load data';
    loading.stopLoading(errorMessage);
    setCurrentRetry(0);
    throw lastError;
  }, [loading, retryCount]);

  return {
    ...loading,
    fetchWithLoading,
    currentRetry,
  };
}