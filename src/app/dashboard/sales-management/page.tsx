import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SalesManagementClient from './SalesManagementClient';

export default async function SalesManagementPage() {
  const supabase = await createServer();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/dashboard');
  }

  return (
    <SalesManagementClient 
      userId={user.id}
      userName={profile.name}
      userRole={profile.role}
    />
  );
}
