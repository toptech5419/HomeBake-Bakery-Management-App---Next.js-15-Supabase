import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import ShiftEndClient from './ShiftEndClient';

export default async function ShiftEndPage() {
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

  // Only sales reps and managers can end shifts
  if (role !== 'sales_rep' && role !== 'manager' && role !== 'owner') {
    return redirect('/dashboard');
  }

  // Fetch today's sales for current user (if sales rep) or all (if owner/manager)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const salesQuery = supabase
    .from('sales_logs')
    .select(`
      *,
      bread_types (
        id,
        name,
        size,
        unit_price
      )
    `)
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())
    .order('created_at', { ascending: false });

  // If sales rep, only show their own logs
  if (role === 'sales_rep') {
    salesQuery.eq('recorded_by', user.id);
  }

  const { data: todaysSales = [] } = await salesQuery;

  // Fetch bread types for leftover reporting
  const { data: breadTypes = [] } = await supabase
    .from('bread_types')
    .select('*')
    .order('name');

  return (
    <ShiftEndClient 
      todaysSales={todaysSales}
      breadTypes={breadTypes}
      userRole={role}
      userId={user.id}
    />
  );
}