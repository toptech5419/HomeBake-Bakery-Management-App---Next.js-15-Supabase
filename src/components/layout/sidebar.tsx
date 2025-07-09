'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

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
    requiredRole: ['owner', 'manager', 'sales_rep'],
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
    href: '/dashboard/sales',
    icon: '💰',
    requiredRole: ['sales_rep'],
  },
  {
    name: 'Inventory',
    href: '/dashboard/inventory',
    icon: '📦',
    requiredRole: ['owner', 'manager'],
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
  const pathname = usePathname();
  const router = useRouter();

  const filteredNavigation = navigationItems.filter(item =>
    item.requiredRole.includes(role)
  );

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
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
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full pt-16 lg:pt-0">
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMobileClose}
              className="lg:hidden"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>

          {/* Navigation menu */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = isActiveLink(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavigation(e, item.href)}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${isNavigating ? 'pointer-events-none opacity-50' : ''}
                  `}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>Role: {role}</p>
              <p>HomeBake v2.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 