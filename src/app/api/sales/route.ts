import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServer();
    const salesData = await request.json();

    // Validate required fields
    const { bread_type_id, quantity, shift, recorded_by } = salesData;
    
    if (!bread_type_id || !quantity || !shift || !recorded_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert sales log
    const { data, error } = await supabase
      .from('sales_logs')
      .insert({
        bread_type_id,
        quantity,
        unit_price: salesData.unit_price,
        discount: salesData.discount || 0,
        returned: salesData.returned || false,
        leftover: salesData.leftover || 0,
        shift,
        recorded_by,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServer();
    const { searchParams } = new URL(request.url);
    
    const recorded_by = searchParams.get('recorded_by');
    const shift = searchParams.get('shift');
    const date = searchParams.get('date');

    let query = supabase
      .from('sales_logs')
      .select(`
        *,
        bread_types (
          id,
          name,
          size,
          unit_price
        )
      `)
      .order('created_at', { ascending: false });

    if (recorded_by) {
      query = query.eq('recorded_by', recorded_by);
    }

    if (shift && (shift === 'morning' || shift === 'night')) {
      query = query.eq('shift', shift);
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}