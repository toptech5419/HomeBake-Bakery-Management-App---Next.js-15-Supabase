'use client';

import { useState } from 'react';
import { UserRole } from '@/types';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { useNavigationTracking } from '@/hooks/use-navigation-tracking';

interface DashboardLayoutClientProps {
  user: any;
  displayName: string;
  role: UserRole;
  children: React.ReactNode;
}

export function DashboardLayoutClient({ 
  user, 
  displayName, 
  role, 
  children 
}: DashboardLayoutClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Track navigation history for back button functionality
  useNavigationTracking({ userRole: role });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen w-full max-w-full bg-background overflow-x-hidden">
      {/* Header */}
      <Header 
        user={user} 
        displayName={displayName} 
        role={role} 
        onMobileMenuToggle={toggleMobileMenu}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      
      <div className="flex w-full max-w-full min-w-0">
        {/* Sidebar */}
        <Sidebar 
          role={role} 
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full max-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}