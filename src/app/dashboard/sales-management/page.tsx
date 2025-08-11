import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSalesManagementData } from '@/lib/reports/actions';
import { getCurrentShiftInfo } from '@/lib/utils/shift-utils';
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

  // Get current shift
  const { currentShift } = getCurrentShiftInfo();

  // Fetch initial sales management data
  const initialData = await getSalesManagementData(user.id, currentShift);

  return (
    <SalesManagementClient 
      userId={user.id}
      userName={profile.name}
      userRole={profile.role}
      initialData={initialData.success && initialData.data ? initialData.data : null}
    />
  );
}
