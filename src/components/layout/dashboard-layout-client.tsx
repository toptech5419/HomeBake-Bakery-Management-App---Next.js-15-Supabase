'use client';

import { useState } from 'react';
import { UserRole } from '@/types';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header 
        user={user} 
        displayName={displayName} 
        role={role} 
        onMobileMenuToggle={toggleMobileMenu}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      
      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          role={role} 
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Main Content */}
        {children}
      </div>
    </div>
  );
}