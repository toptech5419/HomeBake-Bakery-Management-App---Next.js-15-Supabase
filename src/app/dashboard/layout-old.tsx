import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { ShiftProvider } from '@/contexts/ShiftContext';
import { OfflineSyncIndicator } from '@/components/offline-sync-indicator';
import { DataProvider } from '@/contexts/DataContext';
import { ToastProvider } from '@/components/ui/ToastProvider';

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
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user role and profile data with enhanced error handling
  let role = user.user_metadata?.role as UserRole;
  let displayName = user.user_metadata?.name || user.email;

  // Always fetch profile for consistent role detection
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single();

    if (!error && profile) {
      role = profile.role as UserRole;
      displayName = profile.name || displayName;
    } else {
      // If profile fetch fails, use metadata as fallback
      role = role || 'sales_rep';
      displayName = displayName || user.email?.split('@')[0] || 'User';
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Fallback to metadata or defaults
    role = role || 'sales_rep';
    displayName = displayName || user.email?.split('@')[0] || 'User';
  }

  // Ensure we have a valid role before rendering
  if (!role || !['owner', 'manager', 'sales_rep'].includes(role)) {
    console.error('Invalid or missing user role:', role);
    return redirect('/login');
  }

  // If user is owner, return just the children without the dashboard layout
  // Owner pages handle their own layout with OwnerPageWrapper
  if (role === 'owner') {
    return (
      <DataProvider>
        <ToastProvider>
          <ShiftProvider>
            {/* Offline Sync Indicator */}
            <OfflineSyncIndicator />
            {children}
          </ShiftProvider>
        </ToastProvider>
      </DataProvider>
    );
  }

  // Add cache-busting key to prevent stale content
  const layoutKey = `dashboard-${role}-${Date.now()}`;

  return (
    <div key={layoutKey}>
      <DataProvider>
        <ToastProvider>
          <ShiftProvider>
            <DashboardLayoutClient 
              user={user}
              displayName={displayName}
              role={role}
            >
              {/* Offline Sync Indicator */}
              <OfflineSyncIndicator />
              
              {/* Main Content */}
              <main className="flex-1 min-w-0 w-full max-w-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
                {children}
              </main>
            </DashboardLayoutClient>
          </ShiftProvider>
        </ToastProvider>
      </DataProvider>
    </div>
  );
} 