'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Package, FileText, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface OwnerSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  displayName: string;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  active?: boolean;
  onClick?: () => void;
}

export function OwnerSidebar({ isMobileOpen = false, onMobileClose, displayName }: OwnerSidebarProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pathname = usePathname();

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

  const navigationItems: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/owner-dashboard',
      icon: Home,
      active: pathname === '/owner-dashboard'
    },
    {
      name: 'Users',
      href: '/dashboard/users',
      icon: Users,
      active: pathname.startsWith('/dashboard/users')
    },
    {
      name: 'Bread Types',
      href: '/dashboard/bread-types',
      icon: Package,
      active: pathname.startsWith('/dashboard/bread-types')
    },
    {
      name: 'Inventory',
      href: '/dashboard/inventory',
      icon: Package,
      active: pathname.startsWith('/dashboard/inventory')
    },
    {
      name: 'Reports',
      href: '/owner-dashboard/reports',
      icon: FileText,
      active: pathname.startsWith('/owner-dashboard/reports')
    }
  ];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Use the professional logout action that handles sessions
      const { logoutUser } = await import('@/lib/auth/logout-action');
      const result = await logoutUser();
      
      if (result.success) {
        onMobileClose?.();
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
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ 
          height: '100vh',
          height: '100dvh' // Dynamic viewport height for better mobile support
        }}
      >
        {/* Compact Header - Reduced height */}
        <div className="flex-shrink-0 p-3 border-b bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">🍞</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">HomeBake</h2>
              <span className="text-xs text-orange-600">Navigation</span>
            </div>
          </div>
        </div>

        {/* Main Content Area - Guaranteed space management */}
        <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100% - 64px)' }}>
          
          {/* Navigation Section - Scrollable with gradient fade indicator */}
          <div className="flex-1 overflow-y-auto relative">
            <nav className="p-3 space-y-1.5 pb-4">
              {navigationItems.map((item, index) => (
                item.href ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 min-h-[40px] text-sm
                      ${item.active 
                        ? 'bg-orange-50 text-orange-600 border border-orange-200 font-medium' 
                        : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    <item.icon size={18} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ) : (
                  <button
                    key={item.name}
                    onClick={() => {
                      item.onClick?.();
                      onMobileClose?.();
                    }}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 min-h-[40px] text-sm
                      ${item.active 
                        ? 'bg-orange-50 text-orange-600 border border-orange-200 font-medium' 
                        : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    <item.icon size={18} />
                    <span className="font-medium">{item.name}</span>
                  </button>
                )
              ))}
            </nav>
            
            {/* Scroll indicator gradient - shows there's more content below */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          </div>

          {/* Fixed Bottom Section - Always visible with guaranteed space */}
          <div className="flex-shrink-0 bg-gray-50 border-t" style={{ minHeight: '140px' }}>
            {/* Compact User Profile */}
            <div className="px-3 py-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate text-xs">{displayName}</div>
                  <div className="text-xs text-gray-500 font-medium">Owner</div>
                </div>
              </div>
            </div>
            
            {/* Always Visible Sign Out Button */}
            <div className="px-3 py-3">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-all duration-200 disabled:opacity-50 border-2 border-red-200 hover:border-red-300 shadow-sm hover:shadow-md min-h-[44px] font-medium"
              >
                {isSigningOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    <span className="text-sm">Sign Out</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Visual indicator for scrollable content above */}
            <div className="px-3 pb-2">
              <div className="text-center">
                <div className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  </svg>
                  <span>Scroll up for more</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}