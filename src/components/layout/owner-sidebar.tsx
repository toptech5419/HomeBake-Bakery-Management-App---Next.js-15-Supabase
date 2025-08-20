'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Package, FileText, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { OwnerReportsModal } from '@/components/modals/OwnerReportsModal';

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
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const pathname = usePathname();

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
      icon: FileText,
      active: false, // Never active since it's a modal trigger
      onClick: () => setReportsModalOpen(true)
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
          fixed left-0 top-0 h-screen w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">🍞</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">HomeBake</h2>
              <span className="text-xs text-orange-600">Navigation</span>
            </div>
          </div>
        </div>

        {/* Main content with proper flex layout - Full height minus header */}
        <div className="flex flex-col" style={{ height: 'calc(100vh - 88px)' }}>
          {/* Navigation Section - takes remaining space */}
          <div className="flex-1 p-4 overflow-y-auto">
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                item.href ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                      ${item.active 
                        ? 'bg-orange-50 text-orange-600 border border-orange-200' 
                        : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    <item.icon size={20} />
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
                      w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                      ${item.active 
                        ? 'bg-orange-50 text-orange-600 border border-orange-200' 
                        : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </button>
                )
              ))}
            </nav>
          </div>

          {/* Bottom Section - User Profile and Sign Out - Always at bottom */}
          <div className="flex-shrink-0 border-t bg-gray-50">
            {/* User Profile */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{displayName}</div>
                  <div className="text-sm text-gray-500">Owner</div>
                </div>
              </div>
            </div>
            
            {/* Sign Out Button - Always visible at bottom */}
            <div className="p-4">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 border border-red-200 shadow-sm hover:shadow-md"
              >
                {isSigningOut ? (
                  <>
                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-medium">Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={20} />
                    <span className="font-medium">Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reports Modal */}
      <OwnerReportsModal 
        isOpen={reportsModalOpen} 
        onClose={() => setReportsModalOpen(false)} 
      />
    </>
  );
}