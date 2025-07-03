"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import ProductionForm from './production-form';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface BreadType {
  id: string;
  name: string;
}

interface ProductionFormWithAuthProps {
  breadTypes: BreadType[];
  managerId: string;
  onSuccess?: () => void;
}

export default function ProductionFormWithAuth({ 
  breadTypes, 
  managerId, 
  onSuccess 
}: ProductionFormWithAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function ensureSupabaseAuth() {
      try {
        // Generate a deterministic email from the user ID
        const managerEmail = `manager-${managerId}@homebake.local`;
        
        // Check if already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.email === managerEmail) {
          console.log('✅ Already authenticated with Supabase');
          setIsAuthenticating(false);
          return;
        }

        console.log('🔐 Authenticating with Supabase...', { managerEmail, managerId });
        
        // Try to sign in with a temporary password
        const tempPassword = 'temp-password-123';
        
        let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: managerEmail,
          password: tempPassword
        });

        if (signInError && signInError.message.includes('Invalid login credentials')) {
          // User doesn't exist in Supabase Auth, create them
          console.log('🆕 Creating Supabase user...');
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: managerEmail,
            password: tempPassword,
            options: {
              data: {
                user_id: managerId,
                role: 'manager'
              }
            }
          });

          if (signUpError) {
            throw new Error(`Failed to create Supabase user: ${signUpError.message}`);
          }

          // Handle the sign up response properly
          if (signUpData.user) {
            console.log('✅ Successfully created and authenticated with Supabase');
            setIsAuthenticating(false);
            return;
          }
        } else if (signInError) {
          throw new Error(`Failed to sign in: ${signInError.message}`);
        }

        if (signInData?.user) {
          console.log('✅ Successfully authenticated with Supabase');
          setIsAuthenticating(false);
        } else {
          throw new Error('Authentication failed - no user returned');
        }

      } catch (error) {
        console.error('🚨 Supabase auth error:', error);
        setAuthError((error as Error).message);
        setIsAuthenticating(false);
      }
    }

    ensureSupabaseAuth();
  }, [managerId]);

  if (isAuthenticating) {
    return (
      <Card className="w-full p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Setting up authentication...</p>
      </Card>
    );
  }

  if (authError) {
    return (
      <Card className="w-full p-6 text-center border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Authentication Error</h3>
        <p className="text-sm text-red-600 mb-4">{authError}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </Card>
    );
  }

  return (
    <ProductionForm 
      breadTypes={breadTypes} 
      managerId={managerId} 
      onSuccess={onSuccess} 
    />
  );
}