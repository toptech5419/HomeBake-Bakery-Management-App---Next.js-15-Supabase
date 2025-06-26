'use client';

import { useState } from 'react';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  user: any; // Keep for compatibility but mark as any
  displayName: string;
  role: UserRole;
}

export function Header({ displayName, role }: HeaderProps) {
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              HomeBake
            </h1>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {displayName}
                </p>
                <Badge 
                  className={`text-xs ${getRoleColor(role)}`}
                >
                  {getRoleLabel(role)}
                </Badge>
              </div>
              
              {/* User Avatar */}
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Mobile User Info */}
            <div className="sm:hidden flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <Badge 
                className={`text-xs ${getRoleColor(role)}`}
              >
                {getRoleLabel(role)}
              </Badge>
            </div>

            {/* Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="hidden sm:flex"
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

            {/* Mobile Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="sm:hidden"
            >
              {isSigningOut ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                'Sign out'
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 