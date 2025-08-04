'use client';

import React, { useState } from 'react';
import { OwnerHeader } from '@/components/layout/owner-header';
import { OwnerSidebar } from '@/components/layout/owner-sidebar';

interface OwnerPageWrapperProps {
  user: { id: string; email?: string };
  displayName: string;
  children: React.ReactNode;
}

export function OwnerPageWrapper({ user, displayName, children }: OwnerPageWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <OwnerSidebar 
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        displayName={displayName}
      />
      
      {/* Header */}
      <OwnerHeader
        onMobileMenuToggle={() => setSidebarOpen(true)}
        isMobileMenuOpen={sidebarOpen}
      />

      {/* Main Content */}
      <main className="px-4 py-6">
        {children}
      </main>
    </div>
  );
}