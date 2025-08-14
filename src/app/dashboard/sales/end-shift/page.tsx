import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EndShiftClient } from './EndShiftClient';

export default async function EndShiftPage() {
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
    <EndShiftClient 
      userId={user.id}
      userName={profile.name}
    />
  );
}