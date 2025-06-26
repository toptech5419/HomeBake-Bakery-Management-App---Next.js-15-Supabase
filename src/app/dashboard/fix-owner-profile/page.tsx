'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function FixOwnerProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fixOwnerProfile = async () => {
    setIsLoading(true);
    setMessage('');
    setError('');

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
        setMessage('Owner profile already exists!');
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

      setMessage('Owner profile created successfully! You can now generate invite tokens.');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Fix Owner Profile</h1>
        <p className="text-muted-foreground mt-2">
          This will create your owner profile in the database so you can generate invite tokens.
        </p>
      </div>

      <Button 
        onClick={fixOwnerProfile} 
        loading={isLoading} 
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Creating Profile...' : 'Create Owner Profile'}
      </Button>

      {message && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-6 text-sm text-muted-foreground">
        <p>After creating your profile, you can:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Go back to the dashboard</li>
          <li>Navigate to Users → Invite</li>
          <li>Generate invite tokens for new staff</li>
        </ul>
      </div>
    </div>
  );
} 