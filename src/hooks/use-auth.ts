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
          // Fetch role from users table
          const { data: userProfile } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', user.id)
            .single();
          
          setUser({
            id: user.id,
            email: user.email || '',
            role: userProfile?.role || 'sales_rep',
          });
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Fetch role from users table
          const { data: userProfile } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', session.user.id)
            .single();
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: userProfile?.role || 'sales_rep',
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