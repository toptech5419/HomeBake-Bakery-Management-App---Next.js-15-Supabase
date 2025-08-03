import { createServer } from '@/lib/supabase/server';
import InviteFormClient from './InviteFormClient';

export default async function InvitePage() {
  const supabase = await createServer();
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

  // Render the client component for the form
  return <InviteFormClient />;
}