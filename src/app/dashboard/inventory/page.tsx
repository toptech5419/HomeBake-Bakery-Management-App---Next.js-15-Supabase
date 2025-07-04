import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import InventoryDashboardClient from './InventoryDashboardClient';
import { ErrorBoundary } from '@/components/error-boundary';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { InventoryErrorFallback } from '@/components/error-fallbacks/client-error-fallback';

export default async function InventoryPage() {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user role
  let role = user.user_metadata?.role as UserRole;
  
  if (!role) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      role = profile?.role as UserRole;
    } catch {
      role = 'sales_rep'; // Default role
    }
  }

  // All data fetching is now handled by React Query hooks in the client component
  return (
    <ErrorBoundary 
      fallback={<InventoryErrorFallback />}
      componentName="Inventory Dashboard"
    >
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading inventory dashboard...</p>
          </Card>
        </div>
      }>
        <InventoryDashboardClient 
          userRole={role}
          userId={user.id}
        />
      </Suspense>
    </ErrorBoundary>
  );
}