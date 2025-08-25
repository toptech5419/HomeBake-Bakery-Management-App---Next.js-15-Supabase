'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface SidebarProps {
  role: UserRole;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  requiredRole: UserRole[];
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
    requiredRole: ['owner', 'manager'],
  },
  {
    name: 'Dashboard',
    href: '/dashboard/sales',
    icon: '📊',
    requiredRole: ['sales_rep'],
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: '👥',
    requiredRole: ['owner'],
  },
  {
    name: 'Bread Types',
    href: '/dashboard/bread-types',
    icon: '🍞',
    requiredRole: ['owner'],
  },
  {
    name: 'Production',
    href: '/dashboard/production',
    icon: '🏭',
    requiredRole: ['manager'],
  },
  {
    name: 'Sales',
    href: '/dashboard/sales-management',
    icon: '💰',
    requiredRole: ['sales_rep'],
  },
  {
    name: 'Inventory',
    href: '/dashboard/inventory',
    icon: '📦',
    requiredRole: ['owner', 'manager', 'sales_rep'],
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: '📈',
    requiredRole: ['owner', 'manager'],
  },
];

export function Sidebar({ role, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      // Store original overflow style to restore later
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      // Cleanup: restore original overflow when sidebar closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  const filteredNavigation = navigationItems.filter(item =>
    item.requiredRole.includes(role)
  );

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    if (href === '/dashboard/sales') {
      return pathname === '/dashboard/sales';
    }
    return pathname.startsWith(href);
  };

  const handleNavigation = async (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    
    // Don't navigate if already on the same page
    if (isActiveLink(href)) {
      onMobileClose?.();
      return;
    }
    
    setIsNavigating(true);
    onMobileClose?.();
    
    try {
      await router.push(href);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      // Always reset navigation state after a short delay
      setTimeout(() => setIsNavigating(false), 500);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    onMobileClose?.(); // Close mobile menu first
    
    try {
      // Use the professional logout action that handles sessions
      const { logoutUser } = await import('@/lib/auth/logout-action');
      const result = await logoutUser();
      
      if (result.success) {
        window.location.href = '/login';
      } else {
        console.error('Logout failed:', result.error);
        setIsSigningOut(false);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
          onClick={onMobileClose}
        />
      )}

      {/* Loading overlay during navigation */}
      {isNavigating && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: isMobileOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`
          fixed inset-y-0 left-0 z-50 w-64 glass backdrop-blur-xl border-r border-border/50 shadow-2xl lg:translate-x-0 lg:static lg:inset-0 lg:shadow-none
          ${isMobileOpen ? '' : 'lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full pt-16 lg:pt-0">
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-border/50">
            <h2 className="text-base sm:text-lg font-display font-bold gradient-text">Navigation</h2>
            <button
              onClick={onMobileClose}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-accent/50 active:bg-accent/70 rounded-xl transition-all duration-200 hover-scale focus-ring"
              aria-label="Close navigation"
            >
              <svg
                className="h-5 w-5 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation menu */}
          <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto">
            {filteredNavigation.map((item, index) => {
              const isActive = isActiveLink(item.href);
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    onClick={(e) => handleNavigation(e, item.href)}
                    className={`
                      flex items-center min-h-[48px] px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover-scale focus-ring
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-r-4 border-primary shadow-sm'
                          : 'text-foreground hover:bg-accent/50 active:bg-accent/70 hover:text-primary'
                      }
                      ${isNavigating || isSigningOut ? 'pointer-events-none opacity-50' : ''}
                    `}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    <span className="font-display">{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="ml-auto w-2 h-2 rounded-full bg-primary"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Sidebar footer with logout for manager/sales_rep */}
          <div className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
            {/* Role indicator */}
            <div className="px-3 sm:px-4 py-3 border-b border-border/30">
              <div className="text-xs text-muted-foreground font-medium">
                <span className="text-foreground font-display">Role:</span> {role.replace('_', ' ')}
              </div>
            </div>

            {/* Logout button for manager/sales_rep only */}
            {(role === 'manager' || role === 'sales_rep') && (
              <div className="p-3 sm:p-4">
                <motion.button
                  onClick={handleSignOut}
                  disabled={isSigningOut || isNavigating}
                  className="w-full flex items-center justify-center min-h-[48px] px-4 py-3 text-sm font-medium bg-gradient-to-r from-red-50 to-orange-50 text-red-700 hover:from-red-100 hover:to-orange-100 hover:text-red-800 active:from-red-200 active:to-orange-200 border border-red-200 hover:border-red-300 rounded-xl transition-all duration-200 disabled:opacity-50 hover-scale focus-ring shadow-sm hover:shadow-md group"
                  whileTap={{ scale: 0.95 }}
                  aria-label="Sign out"
                >
                  {isSigningOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="font-display">Signing out...</span>
                    </>
                  ) : (
                    <>
                      <svg 
                        className="w-4 h-4 mr-2 transition-colors group-hover:text-red-600" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="font-display">Sign Out</span>
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
} 