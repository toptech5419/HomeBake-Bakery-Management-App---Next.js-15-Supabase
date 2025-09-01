import { createServerComponentClient } from '@/lib/supabase/server';
import UsersClient from './UsersClient';
import { OwnerPageWrapper } from '@/components/layout/OwnerPageWrapper';
import { Suspense } from 'react';

// Force complete dynamic rendering with no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function UsersPage() {
  // Get current user from Supabase session for authorization
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

  const displayName = user.email?.split('@')[0] || 'Owner';

  return (
    <OwnerPageWrapper displayName={displayName}>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      }>
        {/* 🚀 SINGLE SOURCE OF TRUTH: React Query handles all data fetching */}
        <UsersClient user={user} />
      </Suspense>
    </OwnerPageWrapper>
  );
} 