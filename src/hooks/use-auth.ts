'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/types';

interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  role: UserRole;
  is_active: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  // Use the configured supabase client directly

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          setState({ user: null, loading: false, error: sessionError.message });
          return;
        }

        if (!session?.user) {
          setState({ user: null, loading: false, error: null });
          return;
        }

        await handleUserSession(session.user);
      } catch (error) {
        if (mounted) {
          setState({ 
            user: null, 
            loading: false, 
            error: error instanceof Error ? error.message : 'Authentication error' 
          });
        }
      }
    };

    // Handle user session and get profile data
    const handleUserSession = async (user: User) => {
      try {
        // SINGLE SOURCE OF TRUTH: Use metadata first, database as fallback
        let role = user.user_metadata?.role as UserRole;
        let name = user.user_metadata?.name;
        
        // Only query database if metadata is incomplete
        if (!role || !name) {
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('name, role, is_active')
            .eq('id', user.id)
            .single();
            
          if (!profileError && userProfile) {
            role = role || userProfile.role as UserRole;
            name = name || userProfile.name;
          }
        }
        
        // Final fallbacks
        role = role || 'sales_rep';
        name = name || user.email?.split('@')[0] || 'User';
        
        if (mounted) {
          setState({
            user: {
              id: user.id,
              email: user.email,
              name,
              role,
              is_active: true // Assume active if user has valid session
            },
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (mounted) {
          setState({ 
            user: null, 
            loading: false, 
            error: error instanceof Error ? error.message : 'Failed to load user profile' 
          });
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          setState({ user: null, loading: false, error: null });
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await handleUserSession(session.user);
        }
      }
    );

    // Initialize
    getInitialSession();

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setState(prev => ({ ...prev, error: error.message }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      }));
    }
  };

  const refreshUser = async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        setState({ user: null, loading: false, error: error?.message || 'No session' });
        return;
      }

      await handleUserSession(session.user);
    } catch (error) {
      setState({ 
        user: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh user' 
      });
    }
  };

  return {
    ...state,
    signOut,
    refreshUser,
    isOwner: state.user?.role === 'owner',
    isManager: state.user?.role === 'manager',
    isManagerOrAbove: state.user?.role === 'owner' || state.user?.role === 'manager',
    isSalesRep: state.user?.role === 'sales_rep'
  };
}