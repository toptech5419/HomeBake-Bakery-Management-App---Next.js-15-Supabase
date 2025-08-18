import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import OwnerManagerReportsClient from './OwnerManagerReportsClient';
import { Logger } from '@/lib/utils/logger';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function OwnerManagerReportsPage() {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user role and profile data
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
      Logger.debug('No profile found in users table, using metadata');
      role = role || 'sales_rep';
      displayName = displayName || user.email?.split('@')[0] || 'User';
    }
  }

  // Ensure only owners can access this route
  if (role !== 'owner') {
    return redirect('/dashboard');
  }

  return (
    <OwnerManagerReportsClient 
      user={user}
      displayName={displayName}
    />
  );
}