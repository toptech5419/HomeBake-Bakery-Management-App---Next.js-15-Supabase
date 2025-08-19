import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';

export default async function DashboardPage() {
  // Use single source of truth for authentication
  const authUser = await getAuthenticatedUser();
  
  if (!authUser) {
    return redirect('/login');
  }

  if (!authUser.is_active) {
    return redirect('/login?error=account-inactive');
  }

  // Simple role-based redirect - no metadata updates, no race conditions
  switch (authUser.role) {
    case 'owner':
      return redirect('/owner-dashboard');
    case 'manager':
      return redirect('/dashboard/manager');
    case 'sales_rep':
    default:
      return redirect('/dashboard/sales');
  }
} 