import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getInventoryShiftContext } from '@/lib/utils/enhanced-shift-utils';
import { SHIFT_CONSTANTS } from '@/lib/utils/shift-utils';

// Force dynamic rendering for API routes that require authentication
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 API: Starting inventory shift request...');
    
    const supabase = await createServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('🔐 API: Authentication check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message
    });
    
    // Proper authentication check for production
    if (authError || !user) {
      console.log('❌ API: Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ API: User authenticated successfully');

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

    // Get enhanced shift context including manager alignment
    const shiftContext = await getInventoryShiftContext(user?.id);
    
    console.log(`🔍 Enhanced Shift Context for ${validatedShift} shift:`);
    console.log(`   User ID: ${user?.id || 'No user'}`);
    console.log(`   Show Archived Data: ${shiftContext.shouldShowArchivedData}`);
    console.log(`   Data Source: ${shiftContext.dataSource}`);

    // Get current shift period boundaries using Nigeria timezone and correct shift logic
    function getCurrentShiftPeriod(shift: 'morning' | 'night') {
      // Get current time in Nigeria timezone
      const now = new Date();
      const nigeriaTime = new Date(now.toLocaleString("en-US", {timeZone: SHIFT_CONSTANTS.NIGERIA_TIMEZONE}));
      const currentHour = nigeriaTime.getHours();
      
      if (shift === 'morning') {
        // Morning shift: 10:00 AM to 10:00 PM current day
        const searchStart = new Date(nigeriaTime.getFullYear(), nigeriaTime.getMonth(), nigeriaTime.getDate(), SHIFT_CONSTANTS.MORNING_START_HOUR, 0, 0);
        const searchEnd = new Date(nigeriaTime.getFullYear(), nigeriaTime.getMonth(), nigeriaTime.getDate(), SHIFT_CONSTANTS.MORNING_END_HOUR, 0, 0);
        
        console.log(`☀️ Morning shift: Searching from ${searchStart.toLocaleDateString()} ${SHIFT_CONSTANTS.MORNING_START_HOUR}:00 to ${searchEnd.toLocaleDateString()} ${SHIFT_CONSTANTS.MORNING_END_HOUR}:00`);
        return { searchStart, searchEnd };
      } else {
        // Night shift: 10:00 PM to 10:00 AM (spans two days)
        if (currentHour >= SHIFT_CONSTANTS.NIGHT_START_HOUR) {
          // After 10 PM today - current night shift just started
          const searchStart = new Date(nigeriaTime.getFullYear(), nigeriaTime.getMonth(), nigeriaTime.getDate(), SHIFT_CONSTANTS.NIGHT_START_HOUR, 0, 0);
          const searchEnd = new Date(nigeriaTime.getFullYear(), nigeriaTime.getMonth(), nigeriaTime.getDate() + 1, SHIFT_CONSTANTS.NIGHT_END_HOUR, 0, 0);
          
          console.log(`🌙 Night shift (after 10 PM): Searching from ${searchStart.toLocaleDateString()} ${SHIFT_CONSTANTS.NIGHT_START_HOUR}:00 to ${searchEnd.toLocaleDateString()} ${SHIFT_CONSTANTS.NIGHT_END_HOUR}:00`);
          return { searchStart, searchEnd };
        } else {
          // Before 10 AM today - current night shift ending
          const searchStart = new Date(nigeriaTime.getFullYear(), nigeriaTime.getMonth(), nigeriaTime.getDate() - 1, SHIFT_CONSTANTS.NIGHT_START_HOUR, 0, 0);
          const searchEnd = new Date(nigeriaTime.getFullYear(), nigeriaTime.getMonth(), nigeriaTime.getDate(), SHIFT_CONSTANTS.NIGHT_END_HOUR, 0, 0);
          
          console.log(`🌙 Night shift (before 10 AM): Searching from ${searchStart.toLocaleDateString()} ${SHIFT_CONSTANTS.NIGHT_START_HOUR}:00 to ${searchEnd.toLocaleDateString()} ${SHIFT_CONSTANTS.NIGHT_END_HOUR}:00`);
          return { searchStart, searchEnd };
        }
      }
    }

    // Get current shift period boundaries
    const { searchStart, searchEnd } = getCurrentShiftPeriod(validatedShift);

    // Convert Nigeria local times to UTC for database query
    // Nigeria time is UTC+1, so subtract 1 hour to get UTC
    const utcSearchStart = new Date(searchStart.getTime() - (1 * 60 * 60 * 1000));
    const utcSearchEnd = new Date(searchEnd.getTime() - (1 * 60 * 60 * 1000));
    
    console.log(`🔍 Timezone conversion:`);
    console.log(`  Local start: ${searchStart.toLocaleString()}`);
    console.log(`  Local end: ${searchEnd.toLocaleString()}`);
    console.log(`  UTC start: ${utcSearchStart.toISOString()}`);
    console.log(`  UTC end: ${utcSearchEnd.toISOString()}`);

    // Query the batches table based on shift assignment, not creation time
    console.log(`🔍 Querying batches table for ${validatedShift} shift...`);
    console.log(`🔍 Query parameters:`);
    console.log(`  Shift: ${validatedShift}`);
    console.log(`  Current Date: ${new Date().toLocaleDateString()}`);
    
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
      .gte('created_at', utcSearchStart.toISOString())
      .lt('created_at', utcSearchEnd.toISOString())
      .order('created_at', { ascending: false });

    console.log(`📊 Active batches query result: ${batchesData?.length || 0} records`);
    
    let dataSource = 'batches';
    let archivedData: any[] = [];

    if (batchesData && batchesData.length > 0) {
      console.log(`✅ Found ${batchesData.length} active batches`);
    } else {
      console.log(`⚠️ No active batches found, checking archived data...`);
      
      // If no active batches, check all_batches table
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
        .gte('created_at', utcSearchStart.toISOString())
        .lt('created_at', utcSearchEnd.toISOString())
        .order('created_at', { ascending: false });

      console.log(`📊 All_batches query result: ${allBatchesData?.length || 0} records`);
      
      if (allBatchesError) {
        console.error('❌ All_batches query error:', allBatchesError);
        return NextResponse.json(
          { error: 'Failed to fetch inventory data' },
          { status: 500 }
        );
      }

      if (allBatchesData && allBatchesData.length > 0) {
        batchesData = allBatchesData || [];
        dataSource = 'all_batches';
        console.log(`✅ Found ${allBatchesData.length} archived batches`);
      } else {
        // No batches found in current shift period - show empty state
        console.log(`📭 No batches found for current ${validatedShift} shift period`);
        console.log(`📭 Showing empty state - no fallback to previous shifts`);
      }
    }

    // Combine current shift data with archived data if needed
    const allBatches = [...(batchesData || []), ...archivedData];

    if (batchesError && allBatches.length === 0) {
      console.error('Error fetching batches:', batchesError);
      return NextResponse.json(
        { error: 'Failed to fetch inventory data' },
        { status: 500 }
      );
    }

    // Group by bread type and calculate totals
    const inventoryMap = new Map();
    
    for (const batch of allBatches) {
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
          archivedBatches: 0,
        });
      }

      const item = inventoryMap.get(key);
      item.quantity += batch.actual_quantity || 0;
      item.batches += 1;
      
      // Track archived batches separately
      if (archivedData.some(archived => archived.id === batch.id)) {
        item.archivedBatches += 1;
      }
    }

    const inventory = Array.from(inventoryMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalBatches = inventory.reduce((sum, item) => sum + item.batches, 0);
    const totalArchivedBatches = inventory.reduce((sum, item) => sum + (item.archivedBatches || 0), 0);

    console.log(`📊 Final result: ${inventory.length} inventory items, ${totalUnits} total units`);
    console.log(`📊 Data source: ${dataSource}`);
    console.log(`📊 Total batches: ${totalBatches}, Archived: ${totalArchivedBatches}`);

    return NextResponse.json({ 
      data: inventory,
      totalUnits,
      totalBatches,
      totalArchivedBatches,
      shift: validatedShift,
      date: dateParam,
      source: dataSource,
      recordCount: allBatches.length,
      shiftContext: {
        shouldShowArchivedData: shiftContext.shouldShowArchivedData,
        isManager: shiftContext.isManager,
      }
    });

  } catch (error) {
    console.error('Unexpected error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
