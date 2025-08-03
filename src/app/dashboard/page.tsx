import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';

export default async function DashboardPage() {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user role and profile with proper error handling
  let role: UserRole = 'sales_rep'; // Default role
  let displayName = user.email?.split('@')[0] || 'User';

  try {
    // First try to get from user metadata (cached during login)
    if (user.user_metadata?.role) {
      role = user.user_metadata.role as UserRole;
      displayName = user.user_metadata.name || displayName;
    } else {
      // Fetch from users table if not in metadata
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // If no profile exists, check if this is the first user (owner)
        if (profileError.code === 'PGRST116') {
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

          if (count === 0 || count === null) {
            // First user gets owner role and should be redirected to owner dashboard
            role = 'owner';
            
            // Create profile for first user
            await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email!,
                name: user.email?.split('@')[0] || 'Owner',
                role: 'owner'
              });
            
            // Update user metadata
            await supabase.auth.updateUser({
              data: { 
                role: 'owner',
                name: user.email?.split('@')[0] || 'Owner'
              }
            });
            
            return redirect('/dashboard/owner');
          } else {
            // User exists but has no profile - redirect to login with error
            return redirect('/login?error=no-profile');
          }
        } else {
          // Other database error
          return redirect('/login?error=profile-error');
        }
      } else {
        role = profile?.role as UserRole || 'sales_rep';
        displayName = profile?.name || displayName;
        
        // Update user metadata for future requests
        await supabase.auth.updateUser({
          data: { 
            role: role,
            name: displayName
          }
        });
      }
    }
  } catch {
    // If we can't determine role, redirect to login
    return redirect('/login?error=auth-error');
  }

  // Role-based redirects to specialized dashboards
  switch (role) {
    case 'owner':
      return redirect('/dashboard/owner');
    case 'manager':
      return redirect('/dashboard/manager');
    case 'sales_rep':
    default:
      // Redirect sales reps to their specialized dashboard
      return redirect('/dashboard/sales');
  }
} 