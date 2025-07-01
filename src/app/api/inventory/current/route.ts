import { createServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServer();
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch today's production logs with bread types
    const { data: production, error: productionError } = await supabase
      .from('production_logs')
      .select(`
        *,
        bread_types (
          id,
          name,
          size,
          unit_price
        )
      `)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (productionError) {
      console.error('Error fetching production logs:', productionError);
      return NextResponse.json(
        { error: 'Failed to fetch production data' },
        { status: 500 }
      );
    }

    // Fetch today's sales logs with bread types
    const { data: sales, error: salesError } = await supabase
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
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('Error fetching sales logs:', salesError);
      return NextResponse.json(
        { error: 'Failed to fetch sales data' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedProduction = production?.map(log => ({
      id: log.id,
      breadTypeId: log.bread_type_id,
      breadType: log.bread_types ? {
        id: log.bread_types.id,
        name: log.bread_types.name,
        size: log.bread_types.size,
        unit_price: log.bread_types.unit_price,
        createdBy: '',
        createdAt: new Date(),
        isActive: true
      } : null,
      quantity: log.quantity,
      shift: log.shift,
      recordedBy: log.recorded_by,
      createdAt: new Date(log.created_at)
    })) || [];

    const transformedSales = sales?.map(log => ({
      id: log.id,
      breadTypeId: log.bread_type_id,
      breadType: log.bread_types ? {
        id: log.bread_types.id,
        name: log.bread_types.name,
        size: log.bread_types.size,
        unit_price: log.bread_types.unit_price,
        createdBy: '',
        createdAt: new Date(),
        isActive: true
      } : null,
      quantity: log.quantity,
      unitPrice: log.unit_price,
      discount: log.discount,
      returned: log.returned,
      leftover: log.leftover,
      shift: log.shift,
      recordedBy: log.recorded_by,
      createdAt: new Date(log.created_at)
    })) || [];

    return NextResponse.json({
      production: transformedProduction,
      sales: transformedSales,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in inventory current API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}