'use client';

import { useState } from 'react';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Menu, X } from 'lucide-react';

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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side: Menu button (mobile) + Logo */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 hover:bg-gray-100"
            >
              <span className="sr-only">
                {isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              </span>
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>

            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">HB</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  HomeBake
                </h1>
              </div>
            </div>
          </div>

          {/* Right side: User info and actions */}
          <div className="flex items-center space-x-3">
            {/* Desktop User Info */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                  {displayName}
                </p>
                <Badge 
                  className={`text-xs ${getRoleColor(role)}`}
                >
                  {getRoleLabel(role)}
                </Badge>
              </div>
              
              {/* User Avatar */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Mobile User Info - Simplified */}
            <div className="md:hidden flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <Badge 
                className={`text-xs ${getRoleColor(role)}`}
              >
                {getRoleLabel(role)}
              </Badge>
            </div>

            {/* Sign Out Button - Desktop */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="hidden md:flex hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              {isSigningOut ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Signing out...
                </>
              ) : (
                'Sign out'
              )}
            </Button>

            {/* Sign Out Button - Mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="md:hidden p-2 hover:bg-red-50"
            >
              {isSigningOut ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 