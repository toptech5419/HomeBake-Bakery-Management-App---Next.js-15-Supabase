import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

interface Batch {
  id: string;
  bread_type_id: string;
  batch_number: string;
  start_time: string;
  end_time: string | null;
  actual_quantity: number;
  status: string;
  created_by: string;
  created_at: string;
  shift: 'morning' | 'night';
  bread_types: {
    id: string;
    name: string;
    unit_price: number;
    size: string | null;
  } | null;
}

interface ProductionItem {
  id: string;
  bread_type_id: string;
  name: string;
  size: string | null;
  unit_price: number;
  quantity: number;
  produced: number;
  sold: number;
  available: number;
  batch_number: string;
  status: string;
  created_by: string;
  created_at: string;
}

// Get Nigeria current time
function getNigeriaTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
}

// Get the correct date range for filtering based on shift and clearing times
function getDateRange(shift: 'morning' | 'night', nigeriaTime: Date) {
  const currentHour = nigeriaTime.getHours();
  const currentDate = nigeriaTime.toISOString().split('T')[0];
  
  if (shift === 'morning') {
    // Morning shift: Show batches created today only
    // This will naturally clear when the date changes
    const startOfDay = new Date(currentDate + 'T00:00:00.000Z');
    const endOfDay = new Date(currentDate + 'T23:59:59.999Z');
    return { start: startOfDay.toISOString(), end: endOfDay.toISOString() };
  } else {
    // Night shift: Show batches from 15:00 yesterday to 14:59 today
    // But if it's 15:00 or later, return null to clear
    if (currentHour >= 15) {
      return null; // Clear at 15:00
    }
    
    // Night shift runs from 15:00 yesterday to 14:59 today
    const startDate = new Date(currentDate + 'T15:00:00.000Z');
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(currentDate + 'T14:59:59.999Z');
    
    return { start: startDate.toISOString(), end: endDate.toISOString() };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shift = searchParams.get('shift') as 'morning' | 'night';

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createServer();
    const nigeriaTime = getNigeriaTime();
    const currentHour = nigeriaTime.getHours();
    const currentDate = nigeriaTime.toISOString().split('T')[0];

    console.log('🚀 API Starting with params:', {
      shift,
      currentDate,
      currentHour,
      nigeriaTime: nigeriaTime.toISOString(),
      nigeriaTimeString: nigeriaTime.toLocaleString('en-US', { timeZone: 'Africa/Lagos' })
    });

    // Get the date range for filtering
    const dateRange = getDateRange(shift, nigeriaTime);

    if (!dateRange) {
      console.log('❌ Clearing production for shift due to clearing time');
      return NextResponse.json({
        productionItems: [],
        totalUnits: 0,
        source: 'cleared',
        isEmpty: true,
        shift,
        currentTime: nigeriaTime.toISOString(),
        currentHour,
        reason: shift === 'morning' 
          ? 'Morning shift cleared for new day' 
          : 'Night shift cleared at 3:00 PM'
      });
    }

    console.log('📅 Date range calculated:', dateRange);

    // First try batches table
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select(`
        *,
        bread_types (
          id,
          name,
          unit_price,
          size
        )
      `)
      .eq('shift', shift)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false });

    let finalBatches: Batch[] = [];
    let dataSource = 'batches';

    if (batchesError) {
      console.error('❌ Error fetching from batches table:', batchesError);
    } else if (batches && batches.length > 0) {
      finalBatches = batches;
      console.log('✅ Found batches from batches table:', batches.length);
    } else {
      console.log('📝 No batches found in batches table, trying all_batches...');
      
      // Fallback to all_batches table
      const { data: allBatches, error: allBatchesError } = await supabase
        .from('all_batches')
        .select(`
          *,
          bread_types (
            id,
            name,
            unit_price,
            size
          )
        `)
        .eq('shift', shift)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false });

      if (allBatchesError) {
        console.error('❌ Error fetching from all_batches table:', allBatchesError);
        return NextResponse.json(
          { error: 'Failed to fetch production data from both tables' },
          { status: 500 }
        );
      }

      if (allBatches && allBatches.length > 0) {
        finalBatches = allBatches;
        dataSource = 'all_batches';
        console.log('✅ Found batches from all_batches table:', allBatches.length);
      }
    }

    console.log('📊 Final batches debug:', {
      shift,
      count: finalBatches.length,
      source: dataSource,
      dateRange,
      batches: finalBatches.map(b => ({
        id: b.id,
        batch_number: b.batch_number,
        created_at: b.created_at,
        shift: b.shift,
        actual_quantity: b.actual_quantity
      }))
    });

    // Process the data to create production items
    const productionItems: ProductionItem[] = finalBatches.map((batch: Batch) => ({
      id: batch.id,
      bread_type_id: batch.bread_type_id,
      name: batch.bread_types?.name || 'Unknown',
      size: batch.bread_types?.size || null,
      unit_price: batch.bread_types?.unit_price || 0,
      quantity: batch.actual_quantity || 0,
      produced: batch.actual_quantity || 0,
      sold: 0,
      available: batch.actual_quantity || 0,
      batch_number: batch.batch_number,
      status: batch.status,
      created_by: batch.created_by,
      created_at: batch.created_at,
    }));

    // Calculate total units
    const totalUnits = productionItems.reduce((sum: number, item: ProductionItem) => sum + item.quantity, 0);

    // Check if we have any production items
    const isEmpty = productionItems.length === 0;

    console.log('✅ Returning production data:', {
      productionItemsCount: productionItems.length,
      totalUnits,
      source: dataSource,
      isEmpty,
      shift,
      currentHour
    });

    return NextResponse.json({
      productionItems,
      totalUnits,
      source: dataSource,
      isEmpty,
      shift,
      currentTime: nigeriaTime.toISOString(),
      currentHour,
    });

  } catch (error) {
    console.error('Error in sales-rep production API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
