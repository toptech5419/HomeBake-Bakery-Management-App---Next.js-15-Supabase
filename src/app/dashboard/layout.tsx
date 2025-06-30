import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { ShiftProvider } from '@/contexts/ShiftContext';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user role and profile data
  let role = user.user_metadata?.role as UserRole;
  let displayName = user.user_metadata?.name || user.email;

  // Only fetch profile if metadata doesn't have role or name
  if (!role || !user.user_metadata?.name) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', user.id)
        .single();

      role = profile?.role as UserRole || role;
      displayName = profile?.name || displayName;
    } catch {
      console.log('No profile found in users table, using metadata');
      role = role || 'sales_rep';
      displayName = displayName || user.email?.split('@')[0] || 'User';
    }
  }

  return (
    <ShiftProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <Header user={user} displayName={displayName} role={role} />
        
        <div className="flex">
          {/* Sidebar */}
          <Sidebar role={role} />
          
          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ShiftProvider>
  );
} 