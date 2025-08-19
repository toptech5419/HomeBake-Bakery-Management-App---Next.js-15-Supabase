import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { OwnerPageWrapper } from '@/components/layout/OwnerPageWrapper';
import InviteFormClient from './InviteFormClient';

export default async function InvitePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return redirect('/login');
  }

  if (user.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Only owners can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <OwnerPageWrapper displayName={user.name}>
      <InviteFormClient />
    </OwnerPageWrapper>
  );
}