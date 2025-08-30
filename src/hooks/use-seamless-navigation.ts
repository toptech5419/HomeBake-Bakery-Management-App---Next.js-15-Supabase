'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

export interface NavigationTransition {
  isActive: boolean;
  targetRoute: string;
  transitionType: 'shift-reports' | 'record-sale' | 'all-sales' | 'reports-history' | 'general';
  onComplete?: () => void;
}

/**
 * Production-grade seamless navigation with Apple/Google-quality transitions
 * Eliminates choppy button loading states with instant full-screen branded overlays
 */
export function useSeamlessNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [transition, setTransition] = useState<NavigationTransition>({
    isActive: false,
    targetRoute: '',
    transitionType: 'general'
  });

  // Listen for route changes to clean up transition state
  useEffect(() => {
    const handleRouteChange = () => {
      // Delay clearing to allow new page to load
      setTimeout(() => {
        setTransition(prev => ({
          ...prev,
          isActive: false
        }));
      }, 100);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  /**
   * Navigate with instant full-screen branded transition
   */
  const navigateWithTransition = useCallback((
    href: string,
    transitionType: NavigationTransition['transitionType'] = 'general',
    options?: {
      onComplete?: () => void;
    }
  ) => {
    // Don't navigate if already on the same page
    if (pathname === href) {
      return;
    }

    // Show instant full-screen transition
    setTransition({
      isActive: true,
      targetRoute: href,
      transitionType,
      onComplete: options?.onComplete
    });

    // Navigate immediately without delay
    router.push(href, { scroll: false });
  }, [router, pathname]);

  /**
   * Clear transition manually if needed
   */
  const clearTransition = useCallback(() => {
    setTransition(prev => ({
      ...prev,
      isActive: false
    }));
  }, []);

  /**
   * Check if a specific route transition is active
   */
  const isTransitionActive = useCallback((routeType?: NavigationTransition['transitionType']) => {
    if (!routeType) return transition.isActive;
    return transition.isActive && transition.transitionType === routeType;
  }, [transition]);

  return {
    navigateWithTransition,
    clearTransition,
    isTransitionActive,
    transition,
    currentPath: pathname
  };
}