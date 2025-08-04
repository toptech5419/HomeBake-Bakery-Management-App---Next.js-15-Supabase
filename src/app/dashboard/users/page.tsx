import { getUsers } from '@/lib/auth/user-actions';
import { createServerComponentClient } from '@/lib/supabase/server';
import UsersClient from './UsersClient';
import { OwnerPageWrapper } from '@/components/layout/OwnerPageWrapper';
import { Suspense } from 'react';

export default async function UsersPage() {
  // Get current user from Supabase session
  const supabase = await createServerComponentClient();
  const { data } = await supabase.auth.getUser();
  let user = data?.user ? {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || null,
  } : null;

  // If role is not 'owner', fetch from business users table
  if (user && user.role !== 'owner') {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) {
      user = { ...user, role: profile.role };
    }
  }

  if (!user || user.role !== 'owner') {
    return <div className="p-8 text-center text-destructive">Access denied. Only owners can access this page.</div>;
  }

  const users = await getUsers(user);
  const displayName = user.email?.split('@')[0] || 'Owner';

  return (
    <OwnerPageWrapper user={user} displayName={displayName}>
      <Suspense fallback={<div>Loading...</div>}>
        <UsersClient users={users} user={user} />
      </Suspense>
    </OwnerPageWrapper>
  );
} 