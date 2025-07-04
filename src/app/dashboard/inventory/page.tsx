import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import InventoryDashboardClient from './InventoryDashboardClient';
import { ErrorBoundary } from '@/components/error-boundary';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';

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
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-6 text-center border-red-200 bg-red-50">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-semibold mb-2 text-red-800">Inventory Page Error</h3>
            <p className="text-red-700 mb-4">
              There was an issue loading the inventory dashboard. Please refresh the page.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </Card>
        </div>
      }
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