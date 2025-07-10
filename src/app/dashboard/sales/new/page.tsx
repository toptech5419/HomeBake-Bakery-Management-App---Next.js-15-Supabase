import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import SalesNewClient from './SalesNewClient';
import dynamic from 'next/dynamic';

const SalesNewPageClient = dynamic(() => import('./SalesNewPageClient'), { ssr: false });

export default async function SalesNewPage() {
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

  // Fetch current inventory by calculating from production and sales
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayProduction = [] } = await supabase
    .from('production_logs')
    .select('bread_type_id, quantity')
    .gte('created_at', today.toISOString());

  const { data: todaySales = [] } = await supabase
    .from('sales_logs')
    .select('bread_type_id, quantity')
    .gte('created_at', today.toISOString());

  return (
    <SalesNewPageClient
      breadTypes={breadTypes}
      todayProduction={todayProduction}
      todaySales={todaySales}
      userRole={role}
      userId={user.id}
    />
  );
}