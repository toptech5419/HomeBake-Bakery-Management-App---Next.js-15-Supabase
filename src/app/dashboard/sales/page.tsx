import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SalesRepDashboardWrapper } from '@/components/dashboards/sales/SalesRepDashboardWrapper';
import { EndShiftProvider } from '@/contexts/EndShiftContext';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SalesPage() {
  // Add timestamp to ensure fresh rendering
  const renderTime = Date.now();
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user profile with enhanced error handling
  const { data: profile, error } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('Error fetching user profile:', error);
    return redirect('/login');
  }

  // Strict role-based redirects to prevent glimpses
  if (profile.role !== 'sales_rep') {
    switch (profile.role) {
      case 'owner':
        return redirect('/dashboard/owner');
      case 'manager':
        return redirect('/dashboard/manager');
      default:
        return redirect('/login');
    }
  }

  return (
    <EndShiftProvider>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SalesRepDashboardWrapper 
            userId={user.id}
            userName={profile.name}
          />
        </div>
      </div>
    </EndShiftProvider>
  );
}