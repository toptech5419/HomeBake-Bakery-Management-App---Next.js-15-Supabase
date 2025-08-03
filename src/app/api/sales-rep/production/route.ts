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

// Get the correct date range for filtering based on shift and clearing times with precise Nigeria timezone
function getDateRange(shift: 'morning' | 'night', nigeriaTime: Date) {
  const currentHour = nigeriaTime.getHours();
  const currentMinute = nigeriaTime.getMinutes();
  const currentSecond = nigeriaTime.getSeconds();
  const currentDate = nigeriaTime.toISOString().split('T')[0];
  
  console.log('🕒 Nigeria Time Details:', {
    shift,
    currentHour,
    currentMinute,
    currentSecond,
    currentDate,
    fullTime: nigeriaTime.toLocaleString('en-US', { timeZone: 'Africa/Lagos' })
  });
  
  if (shift === 'morning') {
    // Morning shift: Clear exactly at midnight (00:00:00)
    if (currentHour === 0 && currentMinute === 0 && currentSecond < 30) {
      console.log('⏰ Morning shift: Clearing at midnight');
      return null; // Clear for the first 30 seconds of midnight
    }
    
    // Show batches created today after midnight
    const startOfDay = new Date(currentDate + 'T00:00:30.000Z'); // Start 30 seconds after midnight
    const endOfDay = new Date(currentDate + 'T23:59:59.999Z');
    return { start: startOfDay.toISOString(), end: endOfDay.toISOString() };
  } else {
    // Night shift: Clear exactly at 15:00 (3:00 PM)
    if (currentHour === 15 && currentMinute === 0 && currentSecond < 30) {
      console.log('⏰ Night shift: Clearing at 3:00 PM');
      return null; // Clear for the first 30 seconds of 3:00 PM
    }
    
    if (currentHour >= 15) {
      console.log('⏰ Night shift: Still in clearing period after 3:00 PM');
      return null; // Stay cleared after 3:00 PM
    }
    
    // Night shift runs from 15:00:30 yesterday to 14:59:59 today
    const startDate = new Date(currentDate + 'T15:00:30.000Z'); // Start 30 seconds after 3 PM
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

    console.log('🚀 API Starting with enhanced params:', {
      shift,
      currentDate,
      currentHour,
      currentMinute: nigeriaTime.getMinutes(),
      currentSecond: nigeriaTime.getSeconds(),
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
          ? 'Morning shift cleared at midnight (00:00)' 
          : 'Night shift cleared at 3:00 PM (15:00)',
        nextClearTime: shift === 'morning' 
          ? 'Next clear: Tomorrow at 00:00' 
          : 'Next clear: Today at 15:00'
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

    // Fetch sales data to calculate sold quantities
    const { data: salesData, error: salesError } = await supabase
      .from('sales_logs')
      .select('bread_type_id, quantity')
      .eq('shift', shift)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (salesError) {
      console.error('❌ Error fetching sales data:', salesError);
    }

    // Calculate sold quantities by bread type
    const soldQuantities = new Map<string, number>();
    if (salesData) {
      salesData.forEach(sale => {
        const current = soldQuantities.get(sale.bread_type_id) || 0;
        soldQuantities.set(sale.bread_type_id, current + sale.quantity);
      });
    }

    console.log('📊 Sales quantities:', Object.fromEntries(soldQuantities));

    // Process the data to create production items with proper stock calculations
    const productionItems: ProductionItem[] = finalBatches.map((batch: Batch) => {
      const produced = batch.actual_quantity || 0;
      const sold = soldQuantities.get(batch.bread_type_id) || 0;
      const available = Math.max(0, produced - sold); // Ensure available never goes negative

      return {
        id: batch.id,
        bread_type_id: batch.bread_type_id,
        name: batch.bread_types?.name || 'Unknown',
        size: batch.bread_types?.size || null,
        unit_price: batch.bread_types?.unit_price || 0,
        quantity: produced,
        produced: produced,
        sold: sold,
        available: available,
        batch_number: batch.batch_number,
        status: batch.status,
        created_by: batch.created_by,
        created_at: batch.created_at,
      };
    });

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
