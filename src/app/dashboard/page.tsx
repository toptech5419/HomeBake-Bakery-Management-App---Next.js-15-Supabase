import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // OPTIMIZATION: Use user metadata first, only fetch profile if needed
  let role = user.user_metadata?.role as UserRole;
  let displayName = user.user_metadata?.name || user.email;

  // Only fetch profile if metadata doesn't have role or name
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
      // If profile doesn't exist, use metadata or defaults
      console.log('No profile found in users table, using metadata');
      role = role || 'sales_rep'; // Default role if none found
      displayName = displayName || user.email?.split('@')[0] || 'User';
    }
  }

  return <DashboardClient displayName={displayName} role={role} />;
} 