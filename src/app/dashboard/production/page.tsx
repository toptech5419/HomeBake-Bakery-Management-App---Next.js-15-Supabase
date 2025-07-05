import { createServer } from '@/lib/supabase/server';
import { ProductionClient } from './ProductionClient';
import { redirect } from 'next/navigation';

export default async function ProductionPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'sales_rep';

  return <ProductionClient userRole={userRole} userId={user.id} />;
} 