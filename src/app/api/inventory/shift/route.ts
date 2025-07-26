import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shift = searchParams.get('shift');
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!shift || !['morning', 'night'].includes(shift)) {
      return NextResponse.json(
        { error: 'Valid shift (morning or night) is required' },
        { status: 400 }
      );
    }

    // Type assertion for shift after validation
    const validatedShift = shift as 'morning' | 'night';

    // Parse the date parameter correctly
    const targetDate = new Date(dateParam + 'T00:00:00');
    
    // For night shift, we need to handle the fact that it spans midnight
    // Night shift starts at 10 PM on the given date and ends at 10 AM the next day
    let queryDate = targetDate;
    if (shift === 'night') {
      // For night shift, we query from the previous day at 10 PM to the current day at 10 AM
      queryDate = new Date(targetDate);
      queryDate.setDate(queryDate.getDate() - 1); // Go back one day
    }
    
    // Calculate shift boundaries with inventory shift logic
    const shiftStart = new Date(queryDate);
    const shiftEnd = new Date(queryDate);

    if (shift === 'morning') {
      // Morning shift: 10:00 AM - 10:00 PM LOCAL TIME
      shiftStart.setHours(10, 0, 0, 0);
      shiftEnd.setHours(22, 0, 0, 0);
    } else {
      // Night shift: 10:00 PM - 10:00 AM LOCAL TIME (spans midnight)
      shiftStart.setHours(22, 0, 0, 0);
      shiftEnd.setDate(shiftEnd.getDate() + 1);
      shiftEnd.setHours(10, 0, 0, 0);
    }

    // Convert local times to UTC for database query
    // This properly accounts for timezone offset
    const utcShiftStart = new Date(shiftStart.getTime() - (shiftStart.getTimezoneOffset() * 60000));
    const utcShiftEnd = new Date(shiftEnd.getTime() - (shiftEnd.getTimezoneOffset() * 60000));

    // Add comprehensive debugging logs
    console.log(`🔍 Debug: Shift boundaries for ${shift} shift on ${dateParam}`);
    console.log(`   Query date: ${queryDate.toISOString().split('T')[0]}`);
    console.log(`   Parsed date: ${targetDate.toISOString()}`);
    console.log(`   Local start: ${shiftStart.toLocaleString()}`);
    console.log(`   Local end: ${shiftEnd.toLocaleString()}`);
    console.log(`   UTC start: ${utcShiftStart.toISOString()}`);
    console.log(`   UTC end: ${utcShiftEnd.toISOString()}`);
    console.log(`   Timezone offset: ${new Date().getTimezoneOffset()} minutes`);

    // First, try to get data from active batches table
    console.log(`🔍 Querying batches table for ${validatedShift} shift...`);
    
    let { data: batchesData, error: batchesError } = await supabase
      .from('batches')
      .select(`
        *,
        bread_type:bread_types!inner(
          id,
          name,
          size,
          unit_price
        )
      `)
      .eq('shift', validatedShift)
      .gte('created_at', utcShiftStart.toISOString())
      .lt('created_at', utcShiftEnd.toISOString())
      .order('created_at', { ascending: false });

    console.log(`📊 Batches query result: ${batchesData?.length || 0} records`);
    if (batchesError) {
      console.error('❌ Batches query error:', batchesError);
    }

    // If no data in batches, fallback to all_batches
    if (!batchesData || batchesData.length === 0) {
      console.log(`🔍 No data in batches table, trying all_batches...`);
      
      const { data: allBatchesData, error: allBatchesError } = await supabase
        .from('all_batches')
        .select(`
          *,
          bread_type:bread_types!inner(
            id,
            name,
            size,
            unit_price
          )
        `)
        .eq('shift', validatedShift)
        .gte('created_at', utcShiftStart.toISOString())
        .lt('created_at', utcShiftEnd.toISOString())
        .order('created_at', { ascending: false });

      console.log(`📊 All_batches query result: ${allBatchesData?.length || 0} records`);
      
      if (allBatchesError) {
        console.error('❌ All_batches query error:', allBatchesError);
        return NextResponse.json(
          { error: 'Failed to fetch inventory data' },
          { status: 500 }
        );
      }

      batchesData = allBatchesData;
    }

    if (batchesError && (!batchesData || batchesData.length === 0)) {
      console.error('Error fetching batches:', batchesError);
      return NextResponse.json(
        { error: 'Failed to fetch inventory data' },
        { status: 500 }
      );
    }

    // Group by bread type and calculate totals
    const inventoryMap = new Map();
    
    for (const batch of batchesData || []) {
      const breadType = batch.bread_type;
      if (!breadType) continue;

      const key = breadType.id;
      
      if (!inventoryMap.has(key)) {
        inventoryMap.set(key, {
          id: breadType.id,
          name: breadType.name,
          size: breadType.size,
          price: breadType.unit_price,
          quantity: 0,
          batches: 0,
        });
      }

      const item = inventoryMap.get(key);
      item.quantity += batch.actual_quantity || 0;
      item.batches += 1;
    }

    const inventory = Array.from(inventoryMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);

    console.log(`📊 Final result: ${inventory.length} inventory items, ${totalUnits} total units`);
    console.log(`📊 Source: ${batchesData && batchesData.length > 0 ? 'batches' : 'all_batches'}`);
    console.log(`📊 Record count: ${batchesData?.length || 0}`);

    return NextResponse.json({ 
      data: inventory,
      totalUnits,
      shift: validatedShift,
      date: dateParam,
      source: batchesData && batchesData.length > 0 ? 'batches' : 'all_batches',
      recordCount: batchesData?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
