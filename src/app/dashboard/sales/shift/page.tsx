import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import ShiftManagementClient from './ShiftManagementClient';

export default async function ShiftManagementPage() {
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

  // Only sales reps and owners can access shift management
  if (role !== 'sales_rep' && role !== 'owner') {
    return redirect('/dashboard');
  }

  // Fetch today's sales for current user (if sales rep) or all (if owner)
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

  // Fetch shift feedback for today
  const feedbackQuery = supabase
    .from('shift_feedback')
    .select('*')
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())
    .order('created_at', { ascending: false });

  if (role === 'sales_rep') {
    feedbackQuery.eq('user_id', user.id);
  }

  const { data: shiftFeedback = [] } = await feedbackQuery;

  return (
    <ShiftManagementClient 
      todaysSales={todaysSales}
      shiftFeedback={shiftFeedback}
      userRole={role}
      userId={user.id}
    />
  );
}