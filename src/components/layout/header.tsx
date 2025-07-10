'use client';

import { useState } from 'react';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase/client';

interface HeaderProps {
  user: any;
  displayName: string;
  role: UserRole;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({ displayName, role, onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales_rep':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'manager':
        return 'Manager';
      case 'sales_rep':
        return 'Sales Rep';
      default:
        return 'User';
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side: Menu button (mobile) */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 hover:bg-gray-50 rounded-md transition-colors"
            >
              <span className="sr-only">
                {isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              </span>
              {isMobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Clean title for desktop */}
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold text-gray-900">
                Dashboard
              </h1>
            </div>
          </div>

          {/* Right side: User info and actions */}
          <div className="flex items-center space-x-3">
            {/* Desktop User Info */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                  {displayName}
                </p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getRoleColor(role)}`}>
                  {getRoleLabel(role)}
                </span>
              </div>
              
              {/* User Avatar */}
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-sm">
                <span className="text-sm font-semibold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Mobile User Info - Simplified */}
            <div className="md:hidden flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getRoleColor(role)}`}>
                {getRoleLabel(role)}
              </span>
            </div>

            {/* Sign Out Button - Desktop */}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="hidden md:flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {isSigningOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </>
              )}
            </button>

            {/* Sign Out Button - Mobile */}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
            >
              {isSigningOut ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 