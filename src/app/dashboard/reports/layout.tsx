import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user role
  let role = user.user_metadata?.role as UserRole;

  // Fetch profile if role not in metadata
  if (!role) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      role = profile?.role as UserRole;
    } catch {
      role = 'sales_rep'; // Default fallback
    }
  }

  // Only allow managers to access reports
  if (role !== 'manager') {
    return redirect('/dashboard');
  }

  return <>{children}</>;
}