import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FinalReportClient } from './FinalReportClient';

export default async function FinalReportPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'sales_rep') {
    return redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <FinalReportClient 
        userId={user.id}
        userName={profile.name}
      />
    </div>
  );
}