'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';

/**
 * Enterprise-grade navigation hook with smooth transitions and zero-jank UX
 * Designed to match industry standards from Apple, Google, and Meta
 * 
 * Features:
 * - Eliminates scroll-up behavior during navigation
 * - Provides immediate visual feedback
 * - Handles loading states professionally
 * - Prevents layout-router warnings
 */
export function useSmartNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  /**
   * Enterprise-grade navigation with zero-jank UX
   * No automatic scrolling - preserves current scroll position for smooth transitions
   */
  const smartPush = useCallback((
    href: string, 
    options?: {
      preserveScroll?: boolean;
      scrollToTop?: boolean;
      customScrollTarget?: string;
      onNavigationStart?: () => void;
      onNavigationEnd?: () => void;
      immediate?: boolean;
    }
  ) => {
    // Don't navigate if already on the same page
    if (pathname === href) {
      return Promise.resolve();
    }

    setIsNavigating(true);
    options?.onNavigationStart?.();

    // Always use scroll: false to prevent layout-router warnings and unwanted scroll behavior
    try {
      router.push(href, { scroll: false });
      
      // Only handle scroll if explicitly requested
      if (options?.scrollToTop || options?.customScrollTarget) {
        setTimeout(() => {
          try {
            if (options?.customScrollTarget) {
              const element = document.querySelector(options.customScrollTarget);
              if (element) {
                element.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              }
            } else if (options?.scrollToTop) {
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }
          } catch (scrollError) {
            console.warn('Scroll behavior failed:', scrollError);
          }
        }, 100);
      }
      
      // Reset navigation state immediately for seamless transitions
      const resetNavigationState = () => {
        setIsNavigating(false);
        options?.onNavigationEnd?.();
      };
      
      // Immediate state reset for seamless UX - no delays
      resetNavigationState();
      
      return Promise.resolve();
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      options?.onNavigationEnd?.();
      return Promise.reject(error);
    }
  }, [router, pathname]);

  /**
   * Enterprise-grade replace navigation with preserved scroll position
   */
  const smartReplace = useCallback((
    href: string,
    options?: { 
      preserveScroll?: boolean;
      scrollToTop?: boolean;
    }
  ) => {
    setIsNavigating(true);
    
    try {
      router.replace(href, { scroll: false });
      
      // Only scroll if explicitly requested
      if (options?.scrollToTop && !options?.preserveScroll) {
        setTimeout(() => {
          try {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          } catch (scrollError) {
            console.warn('Scroll behavior failed:', scrollError);
          }
        }, 100);
      }
      
      setIsNavigating(false);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      return Promise.reject(error);
    }
  }, [router]);

  /**
   * Navigate back with smart scroll handling
   */
  const smartBack = useCallback(() => {
    setIsNavigating(true);
    
    try {
      router.back();
      // Navigation state will be reset by the route change
      setIsNavigating(false);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  }, [router]);

  return {
    smartPush,
    smartReplace,
    smartBack,
    isNavigating,
    currentPath: pathname
  };
}

/**
 * Utility function to create scroll-managed Link props
 * Use this with Next.js Link components to prevent layout-router warnings
 */
export function createSmartLinkProps(href: string, options?: {
  preserveScroll?: boolean;
  className?: string;
}) {
  return {
    href,
    scroll: false, // Prevents layout-router warnings
    className: options?.className,
    // Add smooth scroll behavior via CSS if needed
    style: options?.preserveScroll ? undefined : {
      scrollBehavior: 'smooth'
    }
  };
}

/**
 * Custom hook for handling navigation in components with fixed/sticky elements
 * Specifically designed for sidebars, modals, and other overlay components
 */
export function useLayoutAwareNavigation() {
  const { smartPush, isNavigating } = useSmartNavigation();

  const navigateWithOverlayClose = useCallback((
    href: string,
    onClose?: () => void
  ) => {
    // Close overlays/modals first
    onClose?.();
    
    // Small delay to allow overlay close animation
    setTimeout(() => {
      smartPush(href, {
        onNavigationStart: () => {
          // Ensure any remaining overlays are closed
          document.body.style.overflow = '';
        }
      });
    }, 150);
  }, [smartPush]);

  return {
    navigateWithOverlayClose,
    isNavigating
  };
}