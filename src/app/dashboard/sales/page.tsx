import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import SalesPageClient from './SalesPageClient';

export default async function SalesPage() {
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

  // Only sales reps and owners can access sales logging
  if (role !== 'sales_rep' && role !== 'owner') {
    return redirect('/dashboard');
  }

  // Fetch bread types for the sales form
  const { data: breadTypes = [] } = await supabase
    .from('bread_types')
    .select('*')
    .order('name');

  // Fetch recent sales logs for current user (if sales rep) or all (if owner)
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
    .order('created_at', { ascending: false })
    .limit(50);

  // If sales rep, only show their own logs
  if (role === 'sales_rep') {
    salesQuery.eq('recorded_by', user.id);
  }

  const { data: salesLogs = [] } = await salesQuery;

  return (
    <SalesPageClient 
      breadTypes={breadTypes}
      salesLogs={salesLogs}
      userRole={role}
      userId={user.id}
    />
  );
}