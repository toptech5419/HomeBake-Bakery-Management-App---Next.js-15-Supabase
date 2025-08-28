/**
 * Production-Grade Scroll Management Configuration
 * 
 * This file defines scroll behavior strategies for the HomeBake application
 * to eliminate Next.js layout-router warnings while maintaining optimal UX.
 * 
 * The approach works WITH Next.js layout router's design decisions rather than against them.
 */

export interface ScrollConfig {
  /** Whether to preserve scroll position during navigation */
  preserveScroll: boolean;
  /** Custom scroll target selector after navigation */
  scrollTarget?: string;
  /** Delay before executing scroll behavior (ms) */
  scrollDelay: number;
  /** Scroll behavior type */
  scrollBehavior: 'smooth' | 'instant' | 'auto';
}

/**
 * Default scroll configurations for different page types
 * These configurations prevent layout-router warnings while maintaining UX
 */
export const SCROLL_CONFIGS = {
  /** Dashboard navigation - smooth scroll to top */
  dashboard: {
    preserveScroll: false,
    scrollDelay: 100,
    scrollBehavior: 'smooth' as const
  },

  /** Modal/overlay navigation - preserve scroll position */
  modal: {
    preserveScroll: true,
    scrollDelay: 0,
    scrollBehavior: 'auto' as const
  },

  /** Form submission - scroll to validation errors if any */
  form: {
    preserveScroll: false,
    scrollTarget: '.form-error, .error-message',
    scrollDelay: 150,
    scrollBehavior: 'smooth' as const
  },

  /** Report navigation - preserve scroll for data continuity */
  reports: {
    preserveScroll: true,
    scrollDelay: 50,
    scrollBehavior: 'auto' as const
  },

  /** Sales operations - scroll to top for clear workflow */
  sales: {
    preserveScroll: false,
    scrollDelay: 100,
    scrollBehavior: 'smooth' as const
  },

  /** Production tracking - preserve scroll for continuous monitoring */
  production: {
    preserveScroll: true,
    scrollDelay: 50,
    scrollBehavior: 'auto' as const
  }
} as const;

/**
 * Route-specific scroll configurations
 * Maps route patterns to scroll behavior
 */
export const ROUTE_SCROLL_CONFIG: Record<string, keyof typeof SCROLL_CONFIGS> = {
  '/dashboard': 'dashboard',
  '/dashboard/sales': 'sales',
  '/dashboard/production': 'production',
  '/dashboard/reports': 'reports',
  '/dashboard/inventory': 'dashboard',
  '/dashboard/users': 'dashboard',
  '/dashboard/bread-types': 'dashboard',
  '/owner-dashboard': 'dashboard',
  '/owner-dashboard/reports': 'reports',
  '/owner-dashboard/performance': 'reports',
  '/owner-dashboard/notifications': 'dashboard'
};

/**
 * Get scroll configuration for a specific route
 */
export function getScrollConfigForRoute(pathname: string): ScrollConfig {
  // Find exact match first
  if (ROUTE_SCROLL_CONFIG[pathname]) {
    return SCROLL_CONFIGS[ROUTE_SCROLL_CONFIG[pathname]];
  }

  // Find pattern match
  for (const [pattern, configKey] of Object.entries(ROUTE_SCROLL_CONFIG)) {
    if (pathname.startsWith(pattern)) {
      return SCROLL_CONFIGS[configKey];
    }
  }

  // Default fallback
  return SCROLL_CONFIGS.dashboard;
}

/**
 * Utility function to handle custom scroll behavior
 */
export function executeScrollBehavior(config: ScrollConfig): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (config.preserveScroll) {
        // Don't change scroll position
        resolve();
        return;
      }

      if (config.scrollTarget) {
        // Scroll to specific element
        const element = document.querySelector(config.scrollTarget);
        if (element) {
          element.scrollIntoView({
            behavior: config.scrollBehavior,
            block: 'start',
            inline: 'nearest'
          });
        } else {
          // Fallback to top if target not found
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: config.scrollBehavior
          });
        }
      } else {
        // Default scroll to top
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: config.scrollBehavior
        });
      }

      resolve();
    }, config.scrollDelay);
  });
}

/**
 * Production-ready error boundaries for scroll behavior
 */
export function safeExecuteScrollBehavior(config: ScrollConfig): Promise<void> {
  return executeScrollBehavior(config).catch((error) => {
    console.warn('Scroll behavior failed:', error);
    // Fallback to instant scroll to top
    try {
      window.scrollTo(0, 0);
    } catch (fallbackError) {
      console.error('Fallback scroll also failed:', fallbackError);
    }
  });
}