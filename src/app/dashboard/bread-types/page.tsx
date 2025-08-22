import { getBreadTypes } from '@/lib/bread-types/actions';
import { createServerComponentClient } from '@/lib/supabase/server';
import { OwnerPageWrapper } from '@/components/layout/OwnerPageWrapper';
import BreadTypesClient from './BreadTypesClient';
import { Suspense } from 'react';

export default async function BreadTypesPage() {
  // Get current user from Supabase session
  const supabase = await createServerComponentClient();
  const { data } = await supabase.auth.getUser();
  const initialUser = data?.user ? {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || null,
  } : null;
  
  let user = initialUser;

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

  if (!user || (user.role !== 'owner' && user.role !== 'manager')) {
    return <div className="p-8 text-center text-destructive">Access denied. Only owners and managers can access this page.</div>;
  }

  const breadTypes = await getBreadTypes(true); // Include inactive for management view
  const displayName = user.email?.split('@')[0] || 'Owner';

  return (
    <OwnerPageWrapper displayName={displayName}>
      <Suspense fallback={<div>Loading...</div>}>
        <BreadTypesClient breadTypes={breadTypes} user={user} />
      </Suspense>
    </OwnerPageWrapper>
  );
} 