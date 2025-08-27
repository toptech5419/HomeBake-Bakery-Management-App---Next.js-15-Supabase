import { getUsers } from '@/lib/auth/user-actions';
import { createServerComponentClient } from '@/lib/supabase/server';
import UsersClient from './UsersClient';
import { OwnerPageWrapper } from '@/components/layout/OwnerPageWrapper';
import { Suspense } from 'react';

// Force complete dynamic rendering with no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function UsersPage() {
  // Force fresh data by adding unique timestamp
  const requestTime = Date.now();
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
    <OwnerPageWrapper displayName={displayName}>
      <Suspense fallback={<div>Loading users...</div>}>
        {/* Force re-render with unique key */}
        <UsersClient 
          key={`users-${requestTime}`} 
          users={users} 
          user={user} 
          refreshTrigger={requestTime}
        />
      </Suspense>
    </OwnerPageWrapper>
  );
} 