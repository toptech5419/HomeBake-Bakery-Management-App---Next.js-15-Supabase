import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import InventoryDashboardClient from './InventoryDashboardClient';

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

  // For now, we'll calculate inventory from production and sales
  // In a full implementation, you'd have actual inventory tables
  const { data: breadTypes = [] } = await supabase
    .from('bread_types')
    .select('*')
    .order('name');

  // Fetch today's production and sales for calculations
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todaysProduction = [] } = await supabase
    .from('production_logs')
    .select(`
      *,
      bread_types (
        id,
        name
      )
    `)
    .gte('created_at', todayStart.toISOString());

  const { data: todaysSales = [] } = await supabase
    .from('sales_logs')
    .select(`
      *,
      bread_types (
        id,
        name
      )
    `)
    .gte('created_at', todayStart.toISOString());

  return (
    <InventoryDashboardClient 
      breadTypes={breadTypes}
      todaysProduction={todaysProduction}
      todaysSales={todaysSales}
      userRole={role}
      userId={user.id}
    />
  );
}