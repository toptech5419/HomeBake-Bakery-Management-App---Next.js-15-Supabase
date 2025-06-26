'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { logoutWithoutRedirect } from '@/lib/auth/actions';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface DashboardClientProps {
  displayName: string;
  role: UserRole;
}

export default function DashboardClient({ displayName, role }: DashboardClientProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isFixingProfile, setIsFixingProfile] = useState(false);
  const [isNavigatingToInvite, setIsNavigatingToInvite] = useState(false);
  const [fixMessage, setFixMessage] = useState('');
  const [fixError, setFixError] = useState('');
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      const result = await logoutWithoutRedirect();
      if (result.error) {
        console.error('Logout error:', result.error);
        setIsLoggingOut(false);
        return;
      }
      
      // Redirect after successful logout
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const handleNavigateToInvite = async () => {
    try {
      setIsNavigatingToInvite(true);
      await router.push('/dashboard/users/invite');
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigatingToInvite(false);
    }
  };

  const fixOwnerProfile = async () => {
    setIsFixingProfile(true);
    setFixMessage('');
    setFixError('');

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        setFixMessage('Owner profile already exists!');
        return;
      }

      // Create owner profile
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Owner',
          role: 'owner',
          password_hash: '', // Not needed for Supabase Auth
          is_active: true
        });

      if (insertError) {
        throw new Error(`Failed to create profile: ${insertError.message}`);
      }

      setFixMessage('Owner profile created successfully! You can now generate invite tokens.');
      // Refresh the page to update the role
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const error = err as Error;
      setFixError(error.message);
    } finally {
      setIsFixingProfile(false);
    }
  };

  const renderDashboardContent = () => {
    switch (role) {
      case 'owner':
        return (
          <>
            <h2 className="text-xl font-semibold">👑 Owner View</h2>
            <p className="text-muted-foreground">
              Full administrative access to manage users, settings, and reports.
            </p>
          </>
        );
      case 'manager':
        return (
          <>
            <h2 className="text-xl font-semibold">🧑‍🏭 Manager View</h2>
            <p className="text-muted-foreground">
              Access to production logs and inventory management.
            </p>
          </>
        );
      case 'sales_rep':
        return (
          <>
            <h2 className="text-xl font-semibold">🧑‍💼 Sales Rep View</h2>
            <p className="text-muted-foreground">
              Access to record sales and submit shift feedback.
            </p>
          </>
        );
      default:
        return <p>You do not have a role assigned. Please contact an administrator.</p>;
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-4xl rounded-lg border bg-card p-8 text-card-foreground shadow-lg">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome to HomeBake</h1>
            <p className="text-sm text-muted-foreground">
              You are logged in as: <span className="font-semibold">{displayName}</span>
            </p>
          </div>
          <Button
            onClick={handleLogout}
            className="rounded-md bg-orange-500 px-4 py-2 font-semibold text-white no-underline transition-colors hover:bg-orange-600"
            loading={isLoggingOut}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging Out...' : 'Log Out'}
          </Button>
        </div>
        <div className="mt-6">{renderDashboardContent()}</div>

        {/* Fix Owner Profile Section */}
        {role === 'owner' && (
          <div className="mt-8 p-4 border border-orange-200 bg-orange-50 rounded-lg">
            <h2 className="text-lg font-semibold text-orange-800 mb-2">Owner Profile Setup</h2>
            <p className="text-orange-700 mb-4">
              To generate invite tokens for new staff members, you need to create your owner profile in the database.
            </p>
            
            <Button 
              onClick={fixOwnerProfile} 
              loading={isFixingProfile} 
              disabled={isFixingProfile}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              {isFixingProfile ? 'Creating Profile...' : 'Create Owner Profile'}
            </Button>

            {fixMessage && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">{fixMessage}</p>
              </div>
            )}

            {fixError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{fixError}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {/* Dashboard Cards */}
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Production</h3>
            <p className="text-muted-foreground">Track daily bread production</p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Sales</h3>
            <p className="text-muted-foreground">Monitor sales and revenue</p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Staff</h3>
            <p className="text-muted-foreground">Manage team members</p>
          </div>

          {role === 'owner' && (
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Invite Staff</h3>
              <p className="text-muted-foreground mb-4">Generate QR codes for new team members</p>
              <Button 
                onClick={handleNavigateToInvite}
                loading={isNavigatingToInvite}
                disabled={isNavigatingToInvite}
                className="w-full"
              >
                {isNavigatingToInvite ? 'Loading...' : 'Invite New Staff'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 