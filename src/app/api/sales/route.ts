import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { salesEntrySchema } from '@/lib/validations/sales';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate the request body
    const validatedData = salesEntrySchema.parse(body);
    
    // Ensure the user is recording their own sales
    if (validatedData.recorded_by !== user.id) {
      return NextResponse.json({ error: 'Can only record your own sales' }, { status: 403 });
    }

    // Insert the sales log
    const { data, error } = await supabase
      .from('sales_logs')
      .insert({
        bread_type_id: validatedData.bread_type_id,
        quantity: validatedData.quantity,
        unit_price: validatedData.unit_price,
        discount: validatedData.discount,
        leftover: validatedData.leftover,
        shift: validatedData.shift,
        recorded_by: validatedData.recorded_by,
        returned: validatedData.returned || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Sales log creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create sales log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });

  } catch (error) {
    console.error('Sales API error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shift = searchParams.get('shift') as 'morning' | 'night' | null;
    const date = searchParams.get('date');

    let query = supabase
      .from('sales_logs')
      .select(`
        *,
        bread_types (
          id,
          name,
          unit_price
        )
      `)
      .eq('recorded_by', user.id);

    if (shift) {
      query = query.eq('shift', shift);
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Sales fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales data' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Sales API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 