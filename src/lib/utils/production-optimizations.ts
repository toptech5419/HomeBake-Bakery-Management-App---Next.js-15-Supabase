import React from 'react'

/**
 * Production Optimization Utilities
 * 
 * This file contains utilities for optimizing the app for production deployment
 */

// Remove console logs in production
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args)
    }
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args)
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args)
  },
  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args)
    }
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args)
    }
  }
}

// Performance monitoring utility
export const performance = {
  mark: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(name)
    }
  },
  measure: (name: string, startMark: string, endMark?: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        return window.performance.measure(name, startMark, endMark)
      } catch (error) {
        logger.warn('Performance measurement failed:', error)
      }
    }
  },
  now: () => {
    if (typeof window !== 'undefined' && window.performance) {
      return window.performance.now()
    }
    return Date.now()
  }
}

// Memory optimization utilities
export const memoryOptimization = {
  // Debounce function to reduce unnecessary re-renders
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate?: boolean
  ): T => {
    let timeout: NodeJS.Timeout | undefined
    return ((...args: Parameters<T>) => {
      const later = () => {
        timeout = undefined
        if (!immediate) func(...args)
      }
      const callNow = immediate && !timeout
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
      if (callNow) func(...args)
    }) as T
  },

  // Throttle function for high-frequency events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T => {
    let inThrottle: boolean
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }) as T
  },

  // Cleanup function for component unmount
  cleanup: (cleanupFunctions: (() => void)[]) => {
    return () => {
      cleanupFunctions.forEach(fn => {
        try {
          fn()
        } catch (error) {
          logger.error('Cleanup function error:', error)
        }
      })
    }
  }
}

// Bundle size optimization
export const bundleOptimization = {
  // Lazy load components
  createLazyComponent: <T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>
  ) => {
    return React.lazy(importFn)
  },

  // Dynamic imports with error handling
  dynamicImport: async <T>(importFn: () => Promise<T>): Promise<T | null> => {
    try {
      return await importFn()
    } catch (error) {
      logger.error('Dynamic import failed:', error)
      return null
    }
  }
}

// Network optimization
export const networkOptimization = {
  // Prefetch critical resources
  prefetchResource: (url: string, type: 'script' | 'style' | 'image' = 'script') => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = type
      link.href = url
      document.head.appendChild(link)
    }
  },

  // Preload critical resources
  preloadResource: (url: string, type: 'script' | 'style' | 'image' = 'script') => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = type
      link.href = url
      document.head.appendChild(link)
    }
  },

  // Connection preconnect for external domains
  preconnect: (domain: string) => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      document.head.appendChild(link)
    }
  }
}

// Image optimization utilities
export const imageOptimization = {
  // Create optimized image URL with Next.js Image optimization
  getOptimizedImageUrl: (src: string, width: number, quality = 75) => {
    if (process.env.NODE_ENV === 'production') {
      return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`
    }
    return src
  },

  // Generate responsive image sizes
  getResponsiveSizes: (breakpoints: { [key: string]: number }) => {
    return Object.entries(breakpoints)
      .map(([breakpoint, width]) => `(max-width: ${breakpoint}px) ${width}px`)
      .join(', ')
  }
}

// Service Worker utilities
export const serviceWorkerOptimization = {
  // Register service worker
  register: async () => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js')
        logger.log('Service Worker registered:', registration)
        return registration
      } catch (error) {
        logger.error('Service Worker registration failed:', error)
      }
    }
  },

  // Unregister service worker
  unregister: async () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.unregister()
        logger.log('Service Worker unregistered')
      } catch (error) {
        logger.error('Service Worker unregistration failed:', error)
      }
    }
  }
}

// Critical CSS optimization
export const cssOptimization = {
  // Load non-critical CSS asynchronously
  loadCSSAsync: (href: string) => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.media = 'print'
      link.onload = () => {
        link.media = 'all'
      }
      document.head.appendChild(link)
    }
  },

  // Remove unused CSS classes (development helper)
  getUsedClasses: () => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const allElements = document.querySelectorAll('*')
      const usedClasses = new Set<string>()
      
      allElements.forEach(element => {
        element.classList.forEach(className => {
          usedClasses.add(className)
        })
      })
      
      return Array.from(usedClasses).sort()
    }
    return []
  }
}

// Environment-specific optimizations
export const environmentOptimizations = {
  // Check if running in production
  isProduction: () => process.env.NODE_ENV === 'production',
  
  // Check if running in development
  isDevelopment: () => process.env.NODE_ENV === 'development',
  
  // Get deployment environment
  getDeploymentEnv: () => process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || 'development',
  
  // Check if running on Vercel
  isVercel: () => Boolean(process.env.VERCEL),
  
  // Enable production optimizations
  enableProductionOptimizations: () => {
    if (environmentOptimizations.isProduction()) {
      // Register service worker
      serviceWorkerOptimization.register()
      
      // Preconnect to external domains
      networkOptimization.preconnect('https://supabase.com')
      
      // Remove development-only global variables
      if (typeof window !== 'undefined') {
        // @ts-ignore
        delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__
      }
    }
  }
}

// React-specific optimizations
export const reactOptimizations = {
  // Memo wrapper with custom comparison
  memoWithComparison: <P extends Record<string, any>>(
    Component: React.ComponentType<P>,
    compare?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
  ) => {
    return React.memo(Component, compare)
  },

  // Callback optimization
  useStableCallback: <T extends (...args: any[]) => any>(callback: T) => {
    const ref = React.useRef(callback)
    React.useLayoutEffect(() => {
      ref.current = callback
    })
    return React.useCallback((...args: any[]) => ref.current(...args), []) as T
  },

  // Stable reference for objects
  useStableValue: <T>(value: T): T => {
    const ref = React.useRef(value)
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0)
    
    if (!Object.is(ref.current, value)) {
      ref.current = value
      forceUpdate()
    }
    
    return ref.current
  }
}

// Initialize production optimizations
if (typeof window !== 'undefined') {
  environmentOptimizations.enableProductionOptimizations()
}

export default {
  logger,
  performance,
  memoryOptimization,
  bundleOptimization,
  networkOptimization,
  imageOptimization,
  serviceWorkerOptimization,
  cssOptimization,
  environmentOptimizations,
  reactOptimizations
}