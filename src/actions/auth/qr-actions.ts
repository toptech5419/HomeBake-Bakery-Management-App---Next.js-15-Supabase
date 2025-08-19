'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/auth-utils';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types';

/**
 * Generate QR invite token - Production Grade
 * Only owners can generate invites
 */
export async function generateInviteTokenAction(role: UserRole) {
  try {
    // Ensure user is authenticated and is owner
    const currentUser = await requireAuth('owner');
    
    console.log(`🔐 Owner ${currentUser.name} generating ${role} invite`);

    // Validate role
    if (role === 'owner') {
      throw new Error('Cannot generate invite token for owner role');
    }

    if (!['manager', 'sales_rep'].includes(role)) {
      throw new Error('Invalid role specified');
    }

    // Use service role for secure operations
    const serviceSupabase = createServiceRoleClient();

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    console.log(`🎫 Creating invite token: ${token} for role: ${role}`);

    // Create invite record
    const { data: invite, error: inviteError } = await serviceSupabase
      .from('qr_invites')
      .insert({
        token,
        role,
        expires_at: expiresAt.toISOString(),
        created_by: currentUser.id,
        is_used: false
      })
      .select()
      .single();

    if (inviteError) {
      console.error('❌ Failed to create QR invite:', inviteError);
      throw new Error(`Failed to create invite: ${inviteError.message}`);
    }

    console.log('✅ QR invite created successfully:', {
      id: invite.id,
      token: invite.token,
      role: invite.role,
      expires_at: invite.expires_at
    });

    // Generate invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const inviteUrl = `${baseUrl}/signup?token=${token}`;

    // Log activity
    try {
      await serviceSupabase
        .from('activities')
        .insert({
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_role: currentUser.role === 'owner' ? 'manager' : currentUser.role, // Activities table constraint
          activity_type: 'created',
          message: `Generated ${role} invite token`,
          metadata: {
            token,
            expires_at: expiresAt.toISOString(),
            invite_url: inviteUrl
          }
        });
    } catch (activityError) {
      console.warn('Failed to log invite creation activity:', activityError);
    }

    // Revalidate paths
    revalidatePath('/dashboard/users/invite');
    revalidatePath('/owner-dashboard');

    return {
      inviteUrl,
      role,
      token,
      expiresAt: expiresAt.toISOString(),
      success: true
    };

  } catch (error) {
    console.error('❌ Generate invite token error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        throw new Error('You must be logged in to generate invites');
      }
      if (error.message.includes('Access denied')) {
        throw new Error('Only owners can generate invite tokens');
      }
      throw error;
    }
    
    throw new Error('Failed to generate invite token. Please try again.');
  }
}

/**
 * Get all QR invites (owner only)
 */
export async function getQRInvites() {
  try {
    // Ensure user is authenticated and is owner
    await requireAuth('owner');
    
    const serviceSupabase = createServiceRoleClient();
    
    const { data: invites, error } = await serviceSupabase
      .from('qr_invites')
      .select(`
        *,
        users!qr_invites_created_by_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch invites: ${error.message}`);
    }
    
    return invites || [];
    
  } catch (error) {
    console.error('Error fetching QR invites:', error);
    throw error;
  }
}

/**
 * Delete/revoke QR invite (owner only)
 */
export async function revokeQRInvite(inviteId: string) {
  try {
    // Ensure user is authenticated and is owner
    const currentUser = await requireAuth('owner');
    
    const serviceSupabase = createServiceRoleClient();
    
    // Get invite details first
    const { data: invite, error: fetchError } = await serviceSupabase
      .from('qr_invites')
      .select('token, role, is_used')
      .eq('id', inviteId)
      .single();
    
    if (fetchError || !invite) {
      throw new Error('Invite not found');
    }
    
    if (invite.is_used) {
      throw new Error('Cannot revoke an invite that has already been used');
    }
    
    // Delete the invite
    const { error: deleteError } = await serviceSupabase
      .from('qr_invites')
      .delete()
      .eq('id', inviteId);
    
    if (deleteError) {
      throw new Error(`Failed to revoke invite: ${deleteError.message}`);
    }
    
    // Log activity
    try {
      await serviceSupabase
        .from('activities')
        .insert({
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_role: 'manager', // Activities table constraint
          activity_type: 'created',
          message: `Revoked ${invite.role} invite token`,
          metadata: {
            token: invite.token,
            revoked_at: new Date().toISOString()
          }
        });
    } catch (activityError) {
      console.warn('Failed to log invite revocation activity:', activityError);
    }
    
    // Revalidate paths
    revalidatePath('/dashboard/users/invite');
    revalidatePath('/owner-dashboard');
    
    return { success: true };
    
  } catch (error) {
    console.error('Error revoking QR invite:', error);
    throw error;
  }
}

/**
 * Generate secure random token
 */
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Use crypto.getRandomValues for better security if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
  } else {
    // Fallback to Math.random
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  return result;
}

/**
 * Cleanup expired invites (can be called periodically)
 */
export async function cleanupExpiredInvites() {
  try {
    // Ensure user is authenticated and is owner
    await requireAuth('owner');
    
    const serviceSupabase = createServiceRoleClient();
    
    const { data: deletedInvites, error } = await serviceSupabase
      .from('qr_invites')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .eq('is_used', false)
      .select('token, role');
    
    if (error) {
      throw new Error(`Failed to cleanup expired invites: ${error.message}`);
    }
    
    console.log(`🧹 Cleaned up ${deletedInvites?.length || 0} expired invites`);
    
    return { 
      success: true, 
      cleanedCount: deletedInvites?.length || 0 
    };
    
  } catch (error) {
    console.error('Error cleaning up expired invites:', error);
    throw error;
  }
}