import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import SalesReportsHistoryClient from './SalesReportsHistoryClient';

export default async function SalesReportsHistoryPage() {
  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  
  let user = data?.user ? {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || null,
  } : null;

  // If role is not in metadata, fetch from business users table
  if (user && !user.role) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) {
      user = { ...user, role: profile.role };
    }
  }

  // Redirect if not authenticated
  if (!user) {
    return redirect('/login');
  }

  // Only allow sales reps and managers to access their own reports
  if (user.role !== 'sales_rep' && user.role !== 'manager' && user.role !== 'owner') {
    return redirect('/dashboard');
  }

  return <SalesReportsHistoryClient userId={user.id} userRole={user.role as UserRole} />;
}
