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
  
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

  console.log('Attempting to insert QR invite with token:', token);

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
  console.log('Environment check:', {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    windowOrigin: typeof window !== 'undefined' ? window.location.origin : 'undefined'
  });

  return {
    inviteUrl,
    role
  };
}

export async function validateQRInvite(token: string): Promise<QRInviteDB | null> {
  const supabase = await createServer();
  
  console.log('Validating QR invite token:', token);
  
  const { data: invite, error } = await supabase
    .from('qr_invites')
    .select('*')
    .eq('token', token)
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
    return null;
  }

  if (!invite) {
    console.log('No valid invite found for token:', token);
    return null;
  }

  console.log('QR invite validated successfully:', {
    id: invite.id,
    role: invite.role,
    expires_at: invite.expires_at,
    is_used: invite.is_used
  });

  return invite;
}

export async function markQRInviteAsUsed(token: string): Promise<boolean> {
  const supabase = await createServer();
  
  const { error } = await supabase
    .from('qr_invites')
    .update({ is_used: true })
    .eq('token', token);

  if (error) {
    console.error('Error marking QR invite as used:', error);
    return false;
  }

  return true;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 