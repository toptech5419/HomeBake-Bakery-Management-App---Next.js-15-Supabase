import { Suspense } from 'react';
import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import { isOwner, isManager, isSalesRep } from '@/lib/auth/rbac';
import SalesPageClient from './SalesPageClient';

export default async function SalesPage() {
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

  // Check if user has access to sales logging
  if (!isSalesRep({ id: user.id, email: user.email!, role })) {
    return redirect('/dashboard');
  }

  // Fetch bread types for the sales form
  const { data: breadTypes, error: breadTypesError } = await supabase
    .from('bread_types')
    .select('id, name, unit_price, size')
    .order('name');

  if (breadTypesError) {
    console.error('Error fetching bread types:', breadTypesError);
  }

  // Fetch recent sales logs for current user
  const { data: salesLogs, error: salesError } = await supabase
    .from('sales_logs')
    .select(`
      id,
      bread_type_id,
      quantity,
      unit_price,
      discount,
      returned,
      leftover,
      shift,
      created_at,
      bread_types (
        name,
        unit_price
      )
    `)
    .eq('recorded_by', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (salesError) {
    console.error('Error fetching sales logs:', salesError);
  }

  return (
    <Suspense fallback={<div>Loading sales...</div>}>
      <SalesPageClient
        user={{
          id: user.id,
          name: displayName,
          role,
        }}
        breadTypes={breadTypes || []}
        initialSalesLogs={salesLogs || []}
      />
    </Suspense>
  );
}