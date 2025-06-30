import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import InventoryLogsClient from './InventoryLogsClient';

export default async function InventoryLogsPage() {
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

  // Fetch recent production and sales logs for audit trail
  const { data: productionLogs = [] } = await supabase
    .from('production_logs')
    .select(`
      *,
      bread_types (
        id,
        name,
        size
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: salesLogs = [] } = await supabase
    .from('sales_logs')
    .select(`
      *,
      bread_types (
        id,
        name,
        size
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <InventoryLogsClient 
      productionLogs={productionLogs}
      salesLogs={salesLogs}
      userRole={role}
      userId={user.id}
    />
  );
}