import { createServer } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export async function generateQRInvite(role: string) {
  const supabase = await createServer();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Generate a unique token
  const token = crypto.randomUUID();
  
  // Set expiration to 10 minutes from now
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
  const { error } = await supabase
    .from('qr_invites')
    .insert({
      token,
      role,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    });

  if (error) {
    console.error('QR invite creation error:', error);
    throw new Error('Failed to generate QR invite');
  }

  // Generate the invite URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/signup?token=${token}`;

  return { 
    token, 
    expiresAt,
    inviteUrl,
    role 
  };
}

export async function validateQRInvite(token: string) {
  const supabase = await createServer();
  
  const { data, error } = await supabase
    .from('qr_invites')
    .select('*')
    .eq('token', token)
    .eq('is_used', false)
    .single();

  if (error || !data) {
    throw new Error('Invalid or expired QR invite');
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    throw new Error('QR invite has expired');
  }

  return data;
}

export async function markQRInviteAsUsed(token: string) {
  const supabase = await createServer();
  
  const { error } = await supabase
    .from('qr_invites')
    .update({ is_used: true })
    .eq('token', token);

  if (error) {
    console.error('QR invite update error:', error);
    throw new Error('Failed to mark QR invite as used');
  }
} 