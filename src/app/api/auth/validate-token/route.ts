import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }

    const supabase = await createServer();
    const { data: invite, error: dbError } = await supabase
      .from('qr_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (dbError || !invite) {
      return NextResponse.json({ isValid: false, error: 'Invalid or expired invitation link.' }, { status: 400 });
    }
  
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
        return NextResponse.json({ isValid: false, error: 'Invitation link has expired.' }, { status: 400 });
    }
    
    if (invite.is_used) {
        return NextResponse.json({ isValid: false, error: 'Invitation has already been used.' }, { status: 400 });
    }

    return NextResponse.json({ isValid: true, role: invite.role });
  } catch (e) {
    console.error('Token validation error:', e);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
} 