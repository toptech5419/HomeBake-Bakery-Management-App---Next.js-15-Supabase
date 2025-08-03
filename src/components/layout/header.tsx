'use client';

import { useState } from 'react';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { ConnectionStatus } from '@/components/ui/connection-status';

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
        return 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border-purple-300 shadow-sm';
      case 'manager':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-blue-300 shadow-sm';
      case 'sales_rep':
        return 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-green-300 shadow-sm';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-300 shadow-sm';
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
    <header className="glass border-b border-border/50 sticky top-0 z-50 shadow-lg backdrop-blur-xl">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side: Menu button (mobile) and Brand */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 hover:bg-accent/50 rounded-xl transition-all duration-200 hover-scale focus-ring"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? (
                <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Brand/Logo section */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-3">
                <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">🍞</span>
                </div>
                <div>
                  <h1 className="text-lg font-display font-bold gradient-text">
                    HomeBake
                  </h1>
                  <p className="text-xs text-muted-foreground -mt-0.5">Bakery Management</p>
                </div>
              </div>
              
              {/* Mobile brand */}
              <div className="md:hidden flex items-center space-x-2">
                <div className="w-7 h-7 gradient-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🍞</span>
                </div>
                <span className="text-base font-display font-bold gradient-text">HomeBake</span>
              </div>
            </div>
          </div>

          {/* Center: Connection Status */}
          <div className="hidden md:flex items-center">
            <ConnectionStatus showDetails={false} />
          </div>

          {/* Right side: User info and actions */}
          <div className="flex items-center space-x-3">
            {/* Desktop User Info */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground truncate max-w-32 font-display">
                  {displayName}
                </p>
                <span className={`inline-block px-3 py-1 text-xs rounded-full border font-medium ${getRoleColor(role)}`}>
                  {getRoleLabel(role)}
                </span>
              </div>
              
              {/* Enhanced User Avatar */}
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-md hover-scale transition-all duration-200">
                <span className="text-sm font-bold text-white font-display">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Mobile User Info - Enhanced */}
            <div className="md:hidden flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white font-display">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className={`inline-block px-2 py-1 text-xs rounded-full border font-medium ${getRoleColor(role)}`}>
                {getRoleLabel(role)}
              </span>
            </div>

            {/* Enhanced Sign Out Button - Desktop */}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="hidden md:flex items-center space-x-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 px-4 py-2 rounded-xl transition-all duration-200 disabled:opacity-50 hover-scale focus-ring group"
            >
              {isSigningOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-medium">Signing out...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium">Sign out</span>
                </>
              )}
            </button>

            {/* Enhanced Sign Out Button - Mobile */}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-all duration-200 disabled:opacity-50 hover-scale focus-ring"
              aria-label="Sign out"
            >
              {isSigningOut ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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