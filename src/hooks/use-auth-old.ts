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
        // First, try to get the current session immediately
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Try to fetch role from users table
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', session.user.id)
            .single();
          
          // Use role from users table if available, otherwise default to sales_rep
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
        
        if (user) {
          // Try to fetch role from users table
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', user.id)
            .single();
          
          // Use role from users table if available, otherwise default to sales_rep
          const role = userProfile?.role || user.user_metadata?.role || 'sales_rep';
          
          setUser({
            id: user.id,
            email: user.email || '',
            role: role,
          });
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
        if (session?.user) {
          // Try to fetch role from users table
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', session.user.id)
            .single();
          
          // Use role from users table if available, otherwise default to sales_rep
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