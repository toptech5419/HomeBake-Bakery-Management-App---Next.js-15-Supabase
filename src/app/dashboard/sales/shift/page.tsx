import { Suspense } from 'react';
import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import { isSalesRep } from '@/lib/auth/rbac';
import ShiftManagementClient from './ShiftManagementClient';

export default async function ShiftManagementPage() {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user profile and role
  let role = user.user_metadata?.role as UserRole;
  let displayName = user.user_metadata?.name || user.email;

  if (!role || !user.user_metadata?.name) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', user.id)
        .single();

      role = profile?.role as UserRole || role;
      displayName = profile?.name || displayName;
    } catch {
      console.log('No profile found in users table, using metadata');
      role = role || 'sales_rep';
      displayName = displayName || user.email?.split('@')[0] || 'User';
    }
  }

  // Check if user has access to shift management
  if (!isSalesRep({ id: user.id, email: user.email!, role })) {
    return redirect('/dashboard');
  }

  // Fetch today's sales for shift summary
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: todaySales, error: salesError } = await supabase
    .from('sales_logs')
    .select(`
      id,
      bread_type_id,
      quantity,
      unit_price,
      discount,
      shift,
      created_at,
      bread_types (
        name,
        unit_price
      )
    `)
    .eq('recorded_by', user.id)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: false });

  if (salesError) {
    console.error('Error fetching today sales:', salesError);
  }

  return (
    <Suspense fallback={<div>Loading shift management...</div>}>
      <ShiftManagementClient
        user={{
          id: user.id,
          name: displayName,
          role,
        }}
        todaySales={todaySales || []}
      />
    </Suspense>
  );
}