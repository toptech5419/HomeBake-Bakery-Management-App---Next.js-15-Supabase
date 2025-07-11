import { createServer } from '@/lib/supabase/server';
import type { QRInviteDB } from '@/types';

export async function createQRInvite(role: 'manager' | 'sales_rep', createdBy: string): Promise<QRInviteDB | null> {
  const supabase = await createServer();
  
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

  const { data: invite, error } = await supabase
    .from('qr_invites')
    .insert({
      token,
      role,
      expires_at: expiresAt.toISOString(),
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating QR invite:', error);
    return null;
  }

  return invite;
}

// Alias for backward compatibility
export async function generateQRInvite(role: 'manager' | 'sales_rep'): Promise<{ inviteUrl: string; role: string }> {
  const supabase = await createServer();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  console.log('Generating QR invite for role:', role, 'by user:', user.id);
  
  const token = generateUniqueToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

  console.log('Attempting to insert QR invite with token:', token);

  try {
    const { data: invite, error } = await supabase
      .from('qr_invites')
      .insert({
        token,
        role,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating QR invite:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to create invite token: ${error.message}`);
    }

    console.log('QR invite created successfully:', invite);

    // Generate the invite URL with better environment handling
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const inviteUrl = `${baseUrl}/signup?token=${token}`;

    console.log('Generated invite URL:', inviteUrl);

    return {
      inviteUrl,
      role
    };
  } catch (error) {
    console.error('Failed to generate QR invite:', error);
    throw error;
  }
}

export async function validateQRInvite(token: string): Promise<QRInviteDB> {
  const supabase = await createServer();
  
  console.log('Validating QR invite token:', token);
  
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Invalid or missing invite token');
  }

  try {
    const { data: invite, error } = await supabase
      .from('qr_invites')
      .select('*')
      .eq('token', token.trim())
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      console.error('Error validating QR invite:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Handle specific error cases
      if (error.code === 'PGRST116') {
        throw new Error('Invalid or expired QR invite token');
      }
      
      if (error.code === '42P01') {
        throw new Error('Invite system not configured. Please contact support.');
      }
      
      throw new Error(`Database error validating invite: ${error.message}`);
    }

    if (!invite) {
      console.log('No valid invite found for token:', token);
      throw new Error('Invalid or expired QR invite token');
    }

    // Additional validation
    if (invite.is_used) {
      throw new Error('This invite link has already been used');
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new Error('This invite link has expired');
    }

    console.log('QR invite validated successfully:', {
      id: invite.id,
      role: invite.role,
      expires_at: invite.expires_at,
      is_used: invite.is_used
    });

    return invite;
  } catch (error) {
    console.error('QR invite validation failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to validate invite token');
  }
}

export async function markQRInviteAsUsed(token: string): Promise<boolean> {
  const supabase = await createServer();
  
  try {
    const { error } = await supabase
      .from('qr_invites')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('token', token);

    if (error) {
      console.error('Error marking QR invite as used:', error);
      return false;
    }

    console.log('QR invite marked as used successfully');
    return true;
  } catch (error) {
    console.error('Failed to mark QR invite as used:', error);
    return false;
  }
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateUniqueToken(): string {
  // Generate a more unique token using UUID-like format
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
} 