import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { ShiftProvider } from '@/contexts/ShiftContext';
import { OfflineSyncIndicator } from '@/components/offline-sync-indicator';
import { DataProvider } from '@/contexts/DataContext';
// ToastProvider removed - using MobileNotificationProvider from root layout

// Force dynamic rendering for all dashboard pages - they require authentication and database access
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Prevent any static generation that could cause caching issues
export const fetchCache = 'force-no-store';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use single source of truth for authentication
  const user = await getAuthenticatedUser();

  if (!user) {
    return redirect('/login');
  }

  // If user is owner, return just the children without the dashboard layout
  // Owner pages handle their own layout with OwnerPageWrapper
  if (user.role === 'owner') {
    return (
      <DataProvider>
        <ShiftProvider>
          {/* Offline Sync Indicator */}
          <OfflineSyncIndicator />
          {children}
        </ShiftProvider>
      </DataProvider>
    );
  }

  // For managers and sales reps, use the dashboard layout
  return (
    <DataProvider>
      <ShiftProvider>
        <DashboardLayoutClient 
          user={{
            id: user.id,
            email: user.email,
            user_metadata: {
              name: user.name,
              role: user.role
            }
          }}
          displayName={user.name}
          role={user.role}
        >
          {/* Offline Sync Indicator */}
          <OfflineSyncIndicator />
          
          {/* Main Content */}
          <main className="flex-1 min-w-0 w-full max-w-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
            {children}
          </main>
        </DashboardLayoutClient>
      </ShiftProvider>
    </DataProvider>
  );
}