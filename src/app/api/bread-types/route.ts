import { createServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Force dynamic rendering for API routes that require authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch bread types
    const { data, error } = await supabase
      .from('bread_types')
      .select('id, name, size, unit_price')
      .order('name');

    if (error) {
      console.error('Error fetching bread types:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bread types' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
