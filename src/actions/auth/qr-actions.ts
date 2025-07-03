'use server';

import { generateQRInvite } from '@/lib/auth/qr';
import { createServer } from '@/lib/supabase/server';
import { UserRole } from '@/types';

export async function generateInviteTokenAction(role: UserRole) {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to generate an invite.');
  }

  // FIX: Check both user metadata and users table for role
  let userRole = user.user_metadata?.role as UserRole;
  
  // If role not in metadata, fetch from users table
  if (!userRole) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        // If profile doesn't exist, check if this is the first user (owner)
        if (profileError.code === 'PGRST116') {
          // Check if this is the first user in the system
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
          
          if (count === 0) {
            // This is the first user, they can be considered owner
            userRole = 'owner';
          } else {
            throw new Error('User profile not found. Please contact support.');
          }
        } else {
          throw new Error('Could not verify user role. Please contact support.');
        }
      } else {
        userRole = profile?.role as UserRole;
      }
    } catch (error) {
      throw new Error('Could not verify user role. Please contact support.');
    }
  }
  
  if (!userRole || userRole !== 'owner') {
    throw new Error(`Only owners can generate invite tokens. Your role: ${userRole || 'undefined'}`);
  }

  if (role === 'owner') {
    throw new Error('Cannot generate invite token for owner role.');
  }

  return generateQRInvite(role);
} 