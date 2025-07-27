"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@/lib/auth/rbac';

export function useAuth() {
  console.log('🔐 useAuth: Hook initialized');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 useAuth: useEffect started');
    console.log('🔐 useAuth: Supabase client available:', !!supabase);
    
    const getUser = async () => {
      try {
        console.log('🔐 useAuth: Starting authentication check...');
        
        // First, try to get the current session immediately
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔐 useAuth: Session check:', { 
          hasSession: !!session, 
          sessionError: sessionError?.message,
          userId: session?.user?.id 
        });
        
        if (session?.user) {
          console.log('🔐 useAuth: Found existing session, user:', session.user.id);
          
          // Try to fetch role from users table
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', session.user.id)
            .single();
          
          console.log('User profile from users table:', userProfile);
          console.log('Error fetching user profile:', error);
          
          // Use role from user_metadata if available, otherwise default to sales_rep
          const role = userProfile?.role || session.user.user_metadata?.role || 'sales_rep';
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: role,
          });
          setLoading(false);
          return;
        }
        
        // If no session, try getUser
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('🔐 useAuth: Auth response:', { user: !!user, error: error?.message });
        
        if (user) {
          console.log('Auth user found:', user);
          
          // Try to fetch role from users table
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', user.id)
            .single();
          
          console.log('User profile from users table:', userProfile);
          console.log('Error fetching user profile:', error);
          
          // Use role from user_metadata if available, otherwise default to sales_rep
          const role = userProfile?.role || user.user_metadata?.role || 'sales_rep';
          
          setUser({
            id: user.id,
            email: user.email || '',
            role: role,
          });
        } else {
          console.log('No auth user found');
        }
      } catch (error) {
        console.error('Error in useAuth:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (session?.user) {
          // Try to fetch role from users table
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', session.user.id)
            .single();
          
          console.log('User profile from users table (auth change):', userProfile);
          console.log('Error fetching user profile (auth change):', error);
          
          // Use role from user_metadata if available, otherwise default to sales_rep
          const role = userProfile?.role || session.user.user_metadata?.role || 'sales_rep';
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: role,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
} 