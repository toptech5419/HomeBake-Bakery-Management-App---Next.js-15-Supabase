import { createServerComponentClient } from '@/lib/supabase/server';
import { getBreadTypes } from '@/lib/bread-types/actions';
import { OwnerPageWrapper } from '@/components/layout/OwnerPageWrapper';
import BreadTypeNewClient from './BreadTypeNewClient';

import { Suspense } from 'react';

// Force dynamic rendering - this page requires authentication and database access
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ id?: string }>
};

export default async function BreadTypeNewPage({ searchParams }: PageProps) {
  const supabase = await createServerComponentClient();
  const { data } = await supabase.auth.getUser();
  const userData = data?.user ? {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || null,
  } : null;

  const user = userData;

  // If role is not 'owner', fetch from business users table
  if (user && user.role !== 'owner') {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) {
      user.role = profile.role;
    }
  }

  if (!user || user.role !== 'owner') {
    return <div className="p-8 text-center text-destructive">Access denied. Only owners can access this page.</div>;
  }

  let initialValues = null;
  if (searchParams) {
    const params = await searchParams;
    if (params?.id) {
      const breadTypes = await getBreadTypes();
      initialValues = breadTypes.find((b: { id: string }) => b.id == params.id) || null;
    }
  }

  const displayName = user.email?.split('@')[0] || 'Owner';

  return (
    <OwnerPageWrapper displayName={displayName}>
      <Suspense fallback={<div>Loading...</div>}>
        <BreadTypeNewClient initialValues={initialValues} user={user} />
      </Suspense>
    </OwnerPageWrapper>
  );
} 