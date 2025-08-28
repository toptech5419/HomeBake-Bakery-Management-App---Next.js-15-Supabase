'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';

/**
 * Production-grade smart navigation hook that manages scroll behavior
 * to eliminate Next.js layout-router warnings while preserving UX.
 * 
 * This hook intelligently handles scroll restoration with fixed/sticky elements
 * by using scroll={false} to prevent layout-router conflicts.
 */
export function useSmartNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  /**
   * Smart push navigation that prevents layout-router auto-scroll conflicts
   * Uses scroll={false} to eliminate warnings from fixed/sticky positioned elements
   */
  const smartPush = useCallback((
    href: string, 
    options?: {
      preserveScroll?: boolean;
      customScrollTarget?: string;
      onNavigationStart?: () => void;
      onNavigationEnd?: () => void;
    }
  ) => {
    // Don't navigate if already on the same page
    if (pathname === href) {
      return Promise.resolve();
    }

    setIsNavigating(true);
    options?.onNavigationStart?.();

    // Always use scroll: false to prevent layout-router warnings
    // Handle custom scroll behavior manually
    try {
      router.push(href, { scroll: false });
      
      // Execute smart scroll behavior after a short delay
      setTimeout(() => {
        try {
          if (!options?.preserveScroll) {
            if (options?.customScrollTarget) {
              // Scroll to specific element if provided
              const element = document.querySelector(options.customScrollTarget);
              if (element) {
                element.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              } else {
                // Fallback to top
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              }
            } else {
              // Default: scroll to top
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }
          }
        } catch (scrollError) {
          console.warn('Scroll behavior failed:', scrollError);
        }
        
        setIsNavigating(false);
        options?.onNavigationEnd?.();
      }, 100);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      options?.onNavigationEnd?.();
      return Promise.reject(error);
    }
  }, [router, pathname]);

  /**
   * Smart replace navigation with scroll management
   */
  const smartReplace = useCallback((
    href: string,
    options?: { preserveScroll?: boolean }
  ) => {
    setIsNavigating(true);
    
    try {
      router.replace(href, { scroll: false });
      
      // Execute scroll behavior after replace
      setTimeout(() => {
        try {
          if (!options?.preserveScroll) {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          }
        } catch (scrollError) {
          console.warn('Scroll behavior failed:', scrollError);
        }
        
        setIsNavigating(false);
      }, 100);
      
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
      setTimeout(() => setIsNavigating(false), 300);
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