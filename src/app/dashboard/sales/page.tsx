import { createServer } from '@/lib/supabase/server';
import { SalesClient } from './SalesClient';
import { redirect } from 'next/navigation';
import ShiftSelector from '@/components/sales/shift-selector';
import { useShift } from '@/hooks/use-shift';

export default async function SalesPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'sales_rep';

  return <SalesClient userRole={userRole} userId={user.id} />;
}

function SalesDashboardPage() {
  const { shift, setShift } = useShift();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* Shift Selector Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ShiftSelector onShiftChange={setShift} />
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Pass shift to all components that need it */}
          <SalesMetrics data={data.salesData} shift={shift} />
          {/* ...other sections... */}
        </div>
      </div>
      {/* ...existing code... */}
    </div>
  );
}