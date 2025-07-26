import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SalesRepDashboard } from '@/components/dashboards/sales/SalesRepDashboard';
import { EndShiftProvider } from '@/contexts/EndShiftContext';

export default async function SalesPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return redirect('/login');
  }

  // Redirect based on role
  switch (profile.role) {
    case 'owner':
      return redirect('/dashboard/owner');
    case 'manager':
      return redirect('/dashboard/manager');
    case 'sales_rep':
      // Continue to sales dashboard
      break;
    default:
      return redirect('/dashboard/sales');
  }

  return (
    <EndShiftProvider>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SalesRepDashboard 
            userId={user.id}
            userName={profile.name}
          />
        </div>
      </div>
    </EndShiftProvider>
  );
}