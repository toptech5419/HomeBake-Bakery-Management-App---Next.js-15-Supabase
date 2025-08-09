import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AllProductionBatchesClient } from './AllProductionBatchesClient';

export default async function AllProductionBatchesPage() {
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

  if (!profile) {
    return redirect('/login');
  }

  // Check if user is manager or owner
  if (profile.role !== 'manager' && profile.role !== 'owner') {
    return redirect('/dashboard/sales');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AllProductionBatchesClient 
          userId={user.id}
          userName={profile.name}
          userRole={profile.role}
        />
      </div>
    </div>
  );
}