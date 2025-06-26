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
        console.error('Profile fetch error:', profileError);
        console.error('User ID:', user.id);
        console.error('User email:', user.email);
        
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
      console.error('Error checking user role:', error);
      throw new Error('Could not verify user role. Please contact support.');
    }
  }
  
  // Debug logging
  console.log('User ID:', user.id);
  console.log('User email:', user.email);
  console.log('User metadata role:', user.user_metadata?.role);
  console.log('Profile role:', userRole);
  console.log('Requested role:', role);
  
  if (!userRole || userRole !== 'owner') {
    throw new Error(`Only owners can generate invite tokens. Your role: ${userRole || 'undefined'}`);
  }

  if (role === 'owner') {
    throw new Error('Cannot generate invite token for owner role.');
  }

  return generateQRInvite(role);
} 