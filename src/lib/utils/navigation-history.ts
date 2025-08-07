"use client";

import React from 'react';
import { getCookie, setCookie } from 'cookies-next';

const NAVIGATION_HISTORY_KEY = 'homebake_nav_history';
const DEFAULT_FALLBACK_ROUTES = {
  owner: '/owner-dashboard',
  manager: '/dashboard/manager', 
  sales_rep: '/dashboard/sales'
} as const;

export interface NavigationEntry {
  path: string;
  timestamp: number;
  userRole?: string;
  fromPage?: string;
}

/**
 * Stores the current page as the last visited page for back navigation
 * @param path - Current page path
 * @param userRole - User's role for role-specific fallbacks
 * @param fromPage - Optional identifier for the source page
 */
export function setNavigationHistory(
  path: string, 
  userRole?: string, 
  fromPage?: string
): void {
  try {
    // Don't store the inventory page itself in history
    if (path.includes('/inventory')) {
      return;
    }

    const entry: NavigationEntry = {
      path,
      timestamp: Date.now(),
      userRole,
      fromPage
    };

    setCookie(NAVIGATION_HISTORY_KEY, JSON.stringify(entry), {
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      sameSite: 'lax'
    });
  } catch (error) {
    console.warn('Failed to set navigation history:', error);
  }
}

/**
 * Gets the last visited page for back navigation
 * @param userRole - Current user role for fallback
 * @returns The path to navigate back to
 */
export function getNavigationHistory(userRole?: string): string {
  console.log('getNavigationHistory: userRole =', userRole);
  
  try {
    const historyData = getCookie(NAVIGATION_HISTORY_KEY);
    console.log('getNavigationHistory: historyData =', historyData);
    
    if (historyData && typeof historyData === 'string') {
      const entry: NavigationEntry = JSON.parse(historyData);
      console.log('getNavigationHistory: parsed entry =', entry);
      
      // Check if the entry is not too old (24 hours)
      const isRecent = Date.now() - entry.timestamp < 24 * 60 * 60 * 1000;
      console.log('getNavigationHistory: isRecent =', isRecent);
      
      if (isRecent && entry.path) {
        // Validate that the path is a dashboard path
        if (entry.path.startsWith('/dashboard/') && !entry.path.includes('/inventory')) {
          console.log('getNavigationHistory: returning history path =', entry.path);
          return entry.path;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get navigation history:', error);
  }

  // Fallback to role-specific dashboard
  if (userRole && userRole in DEFAULT_FALLBACK_ROUTES) {
    const fallbackPath = DEFAULT_FALLBACK_ROUTES[userRole as keyof typeof DEFAULT_FALLBACK_ROUTES];
    console.log('getNavigationHistory: returning role fallback =', fallbackPath);
    return fallbackPath;
  }

  // Ultimate fallback
  console.log('getNavigationHistory: returning ultimate fallback = /dashboard');
  return '/dashboard';
}

/**
 * Clears the navigation history
 */
export function clearNavigationHistory(): void {
  try {
    setCookie(NAVIGATION_HISTORY_KEY, '', {
      maxAge: 0,
      path: '/'
    });
  } catch (error) {
    console.warn('Failed to clear navigation history:', error);
  }
}

/**
 * Hook to track navigation history automatically
 * Call this in dashboard pages to track user navigation
 */
export function useNavigationTracking(currentPath: string, userRole?: string, fromPage?: string) {
  // Track navigation on mount
  React.useEffect(() => {
    setNavigationHistory(currentPath, userRole, fromPage);
  }, [currentPath, userRole, fromPage]);
}

// For server-side usage (Next.js middleware or API routes)
export function setNavigationHistoryServer(
  path: string,
  userRole?: string,
  fromPage?: string
): { name: string; value: string; options: { maxAge: number; path: string; sameSite: string } } {
  const entry: NavigationEntry = {
    path,
    timestamp: Date.now(),
    userRole,
    fromPage
  };

  return {
    name: NAVIGATION_HISTORY_KEY,
    value: JSON.stringify(entry),
    options: {
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      sameSite: 'lax'
    }
  };
}