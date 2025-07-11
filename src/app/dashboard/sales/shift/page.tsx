import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import ShiftManagementClient from './ShiftManagementClient';

export default async function ShiftManagementPage() {
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

  if (!profile || profile.role !== 'sales_rep') {
    return redirect('/dashboard');
  }

  // Fetch today's sales
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: todaysSales } = await supabase
    .from('sales_logs')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price
      )
    `)
    .gte('created_at', today.toISOString());

  // Fetch shift feedback
  const { data: shiftFeedback } = await supabase
    .from('shift_feedback')
    .select('*')
    .gte('created_at', today.toISOString());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ShiftManagementClient 
          todaysSales={todaysSales || []}
          shiftFeedback={shiftFeedback || []}
        />
      </div>
    </div>
  );
}