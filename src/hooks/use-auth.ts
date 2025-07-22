"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@/lib/auth/rbac';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
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