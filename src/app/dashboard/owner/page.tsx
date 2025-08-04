import { Metadata } from 'next';
import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Owner Dashboard - HomeBake',
  description: 'Strategic overview and management dashboard for bakery owners',
};

export default async function OwnerDashboardRedirect() {
  const supabase = await createServer();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile and check if they're an owner
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // Redirect owners to the dedicated owner dashboard (separate from main dashboard layout)
  if (!profileError && profile && profile.role === 'owner') {
    redirect('/owner-dashboard');
  }

  // Non-owners get redirected to regular dashboard
  redirect('/dashboard');
}