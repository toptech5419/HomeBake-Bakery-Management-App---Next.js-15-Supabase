'use client';

import { redirect } from 'next/navigation';

interface DashboardClientProps {
  displayName: string;
  role: string;
}

export default function DashboardClient({ role }: DashboardClientProps) {
  // This component should never be reached as the page redirects based on role
  // But including it as a fallback to prevent build errors
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to HomeBake</h1>
        <p className="text-gray-600 mb-6">Redirecting to your dashboard...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
}