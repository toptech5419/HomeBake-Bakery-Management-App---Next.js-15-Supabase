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

// Convert Nigeria local time to UTC for database queries
function nigeriaToUTC(localYear: number, localMonth: number, localDay: number, localHour: number, localMinute: number, localSecond: number): Date {
  // Nigeria is UTC+1, so we need to subtract 1 hour FROM Nigeria time to get UTC
  // If it's 15:00 in Nigeria, it's 14:00 UTC
  
  let utcHour = localHour - 1;
  let utcDay = localDay;
  let utcMonth = localMonth;
  let utcYear = localYear;
  
  // Handle day rollover when hour goes negative
  if (utcHour < 0) {
    utcHour = 23;
    utcDay = localDay - 1;
    
    // Handle month rollover
    if (utcDay < 1) {
      utcMonth = localMonth - 1;
      if (utcMonth < 1) {
        utcMonth = 12;
        utcYear = localYear - 1;
      }
      utcDay = new Date(utcYear, utcMonth, 0).getDate(); // Last day of previous month
    }
  }
  
  const utcDateString = `${utcYear}-${String(utcMonth).padStart(2, '0')}-${String(utcDay).padStart(2, '0')}T${String(utcHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}:${String(localSecond).padStart(2, '0')}.000Z`;
  
  console.log('🕐 Nigeria to UTC conversion:', {
    input: `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')} ${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}:${String(localSecond).padStart(2, '0')}`,
    output: utcDateString
  });
  
  return new Date(utcDateString);
}

// Get the correct date range for filtering based on shift and clearing times with precise Nigeria timezone
function getDateRange(shift: 'morning' | 'night', nigeriaTime: Date) {
  const currentHour = nigeriaTime.getHours();
  const currentMinute = nigeriaTime.getMinutes();
  const currentSecond = nigeriaTime.getSeconds();
  const currentYear = nigeriaTime.getFullYear();
  const currentMonth = nigeriaTime.getMonth() + 1; // getMonth() returns 0-11
  const currentDay = nigeriaTime.getDate();
  
  console.log('🕒 Nigeria Time Details:', {
    shift,
    currentYear,
    currentMonth,
    currentDay,
    currentHour,
    currentMinute,
    currentSecond,
    fullTime: nigeriaTime.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
    utcTime: new Date().toISOString()
  });
  
  if (shift === 'morning') {
    // Morning shift: Clear exactly at midnight (00:00:00) to (00:00:29)
    if (currentHour === 0 && currentMinute === 0 && currentSecond < 30) {
      console.log('⏰ Morning shift: Clearing at midnight (first 30 seconds)');
      return null; // Clear for the first 30 seconds of midnight
    }
    
    // Morning shift: Show batches from 00:00:30 TODAY to 23:59:59 TODAY (Nigeria time converted to UTC)
    const startTimeUTC = nigeriaToUTC(currentYear, currentMonth, currentDay, 0, 0, 30);
    const endTimeUTC = nigeriaToUTC(currentYear, currentMonth, currentDay, 23, 59, 59);
    
    console.log('📅 Morning shift: Showing current date batches (00:00:30 - 23:59:59 Nigeria time)', {
      startNigeria: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')} 00:00:30`,
      endNigeria: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')} 23:59:59`,
      startUTC: startTimeUTC.toISOString(),
      endUTC: endTimeUTC.toISOString()
    });
    
    return { start: startTimeUTC.toISOString(), end: endTimeUTC.toISOString() };
  } else {
    // Night shift: Clear exactly at 15:00 (3:00 PM) to (15:00:29)
    if (currentHour === 15 && currentMinute === 0 && currentSecond < 30) {
      console.log('⏰ Night shift: Clearing at 3:00 PM (first 30 seconds)');
      return null; // Clear for the first 30 seconds of 3:00 PM
    }
    
    // Night shift logic: Determine if we're in current night shift or next night shift
    let startYear = currentYear;
    let startMonth = currentMonth;
    let startDay = currentDay;
    let endYear = currentYear;
    let endMonth = currentMonth;
    let endDay = currentDay;
    
    if (currentHour < 15) {
      // Before 15:00 today - we're still in YESTERDAY'S night shift
      // Show batches from YESTERDAY 15:00:30 to TODAY 14:59:59
      startDay = currentDay - 1;
      
      // Handle month/year rollover for yesterday
      if (startDay < 1) {
        startMonth -= 1;
        if (startMonth < 1) {
          startMonth = 12;
          startYear -= 1;
        }
        startDay = new Date(startYear, startMonth, 0).getDate(); // Last day of previous month
      }
      
      console.log('🌙 Before 15:00: Showing YESTERDAY night shift (15:00:30 yesterday to 14:59:59 today)');
    } else {
      // After 15:00:30 today - we're in TODAY'S night shift
      // Show batches from TODAY 15:00:30 to TOMORROW 14:59:59
      endDay = currentDay + 1;
      
      // Handle month/year rollover for tomorrow
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      if (endDay > daysInMonth) {
        endDay = 1;
        endMonth += 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear += 1;
        }
      }
      
      console.log('🌙 After 15:00: Showing TODAY night shift (15:00:30 today to 14:59:59 tomorrow)');
    }
    
    const startTimeUTC = nigeriaToUTC(startYear, startMonth, startDay, 15, 0, 30);
    const endTimeUTC = nigeriaToUTC(endYear, endMonth, endDay, 14, 59, 59);
    
    console.log('📅 Night shift: Date range calculated (Nigeria time)', {
      startNigeria: `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')} 15:00:30`,
      endNigeria: `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')} 14:59:59`,
      startUTC: startTimeUTC.toISOString(),
      endUTC: endTimeUTC.toISOString(),
      currentHour,
      logic: currentHour < 15 ? 'Yesterday night shift' : 'Today night shift'
    });
    
    return { start: startTimeUTC.toISOString(), end: endTimeUTC.toISOString() };
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
    console.log('🔍 Querying batches table with filters:', {
      shift,
      startTime: dateRange.start,
      endTime: dateRange.end,
      status: ['active', 'completed']
    });
    
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

    console.log('🔍 Batches query result:', {
      error: batchesError,
      count: batches?.length || 0,
      batches: batches?.map(b => ({
        id: b.id,
        created_at: b.created_at,
        shift: b.shift,
        status: b.status,
        batch_number: b.batch_number
      }))
    });

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
      console.log('🔍 Querying all_batches table with same filters...');
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

      console.log('🔍 All_batches query result:', {
        error: allBatchesError,
        count: allBatches?.length || 0,
        batches: allBatches?.map(b => ({
          id: b.id,
          created_at: b.created_at,
          shift: b.shift,
          status: b.status,
          batch_number: b.batch_number
        }))
      });

      // Debug: Check if ANY batches exist from yesterday (regardless of filters)
      console.log('🔍 DEBUG: Checking for ANY batches from 2025-08-11...');
      const { data: debugBatches } = await supabase
        .from('batches')
        .select('id, created_at, shift, status, batch_number')
        .gte('created_at', '2025-08-11T00:00:00.000Z')
        .lte('created_at', '2025-08-11T23:59:59.999Z');
      
      const { data: debugAllBatches } = await supabase
        .from('all_batches')  
        .select('id, created_at, shift, status, batch_number')
        .gte('created_at', '2025-08-11T00:00:00.000Z')
        .lte('created_at', '2025-08-11T23:59:59.999Z');

      console.log('🔍 DEBUG Results:', {
        batchesFrom2025_08_11: debugBatches?.length || 0,
        allBatchesFrom2025_08_11: debugAllBatches?.length || 0,
        batchesDetails: debugBatches?.map(b => ({ ...b, table: 'batches' })) || [],
        allBatchesDetails: debugAllBatches?.map(b => ({ ...b, table: 'all_batches' })) || []
      });

      // Debug: Check for specific batch ID
      console.log('🔍 DEBUG: Looking for specific batch ID 7a07d648-e97c-4fbc-aeb3-afb9e311fa8a...');
      const { data: specificBatch } = await supabase
        .from('batches')
        .select('*')
        .eq('id', '7a07d648-e97c-4fbc-aeb3-afb9e311fa8a');
      
      const { data: specificAllBatch } = await supabase
        .from('all_batches')
        .select('*')
        .eq('id', '7a07d648-e97c-4fbc-aeb3-afb9e311fa8a');

      console.log('🔍 Specific batch search:', {
        foundInBatches: specificBatch?.length || 0,
        foundInAllBatches: specificAllBatch?.length || 0,
        batchDetails: specificBatch?.[0] || null,
        allBatchDetails: specificAllBatch?.[0] || null
      });

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
