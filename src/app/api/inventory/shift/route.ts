import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getInventoryShiftContext, getNightShiftBoundariesWithArchive } from '@/lib/utils/enhanced-shift-utils';
import { getShiftDateRange } from '@/lib/utils/shift-utils';

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
    console.log(`   Manager Shift: ${shiftContext.managerShift}`);
    console.log(`   Shift Aligned: ${shiftContext.isShiftAligned}`);
    console.log(`   Show Archived Data: ${shiftContext.shouldShowArchivedData}`);
    console.log(`   Data Source: ${shiftContext.dataSource}`);
    console.log(`   Alignment Status: ${shiftContext.shiftAlignmentStatus}`);

    // Parse the date parameter correctly
    const targetDate = new Date(dateParam + 'T00:00:00');
    
    // Calculate shift boundaries with enhanced logic
    let queryDate = targetDate;
    let shiftStart: Date;
    let shiftEnd: Date;
    
    if (validatedShift === 'night') {
      // For night shift, we want to be on the safer side
      // Search from yesterday 10 AM to today 10 AM (24-hour period)
      // This covers the case where night shift might start work anytime
      const yesterday = new Date(targetDate);
      yesterday.setDate(yesterday.getDate() - 1);
      
      shiftStart = new Date(yesterday);
      shiftStart.setHours(10, 0, 0, 0); // Yesterday 10 AM
      
      shiftEnd = new Date(targetDate);
      shiftEnd.setHours(10, 0, 0, 0); // Today 10 AM
      
      console.log(`🌙 Night shift: Searching from yesterday 10 AM to today 10 AM for safety`);
    } else {
      // Morning shift: 12:00 AM - 10:00 PM LOCAL TIME (current day)
      // This includes early morning batches (8 AM, 9 AM) that were recorded before shift switch
      shiftStart = new Date(queryDate);
      shiftStart.setHours(0, 0, 0, 0); // Start of day (12 AM)
      shiftEnd = new Date(queryDate);
      shiftEnd.setHours(22, 0, 0, 0); // 10 PM
      
      console.log(`☀️ Morning shift: Searching current day 12 AM to 10 PM (includes early morning batches)`);
    }

    // Convert local times to UTC for database query
    // FIXED: Subtract timezone offset to convert local time to UTC properly
    const utcShiftStart = new Date(shiftStart.getTime() - (shiftStart.getTimezoneOffset() * 60000));
    const utcShiftEnd = new Date(shiftEnd.getTime() - (shiftEnd.getTimezoneOffset() * 60000));

    console.log(`🔍 Shift boundaries for ${validatedShift} shift on ${dateParam}:`);
    console.log(`   Query date: ${queryDate.toISOString().split('T')[0]}`);
    console.log(`   Local start: ${shiftStart.toLocaleString()}`);
    console.log(`   Local end: ${shiftEnd.toLocaleString()}`);
    console.log(`   UTC start: ${utcShiftStart.toISOString()}`);
    console.log(`   UTC end: ${utcShiftEnd.toISOString()}`);
    console.log(`   Timezone offset: ${new Date().getTimezoneOffset()} minutes`);
    console.log(`   Current local time: ${new Date().toLocaleString()}`);
    console.log(`   Current UTC time: ${new Date().toISOString()}`);

    // Query the batches table for the current shift
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

    console.log(`📊 Active batches query result: ${batchesData?.length || 0} records`);
    
    let dataSource = 'batches';
    let archivedData: any[] = [];

    if (batchesData && batchesData.length > 0) {
      console.log(`✅ Found ${batchesData.length} active batches`);
    } else {
      console.log(`⚠️ No active batches found, checking archived data...`);
      
      // Step 2: If no active batches, check all_batches table
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

      if (allBatchesData && allBatchesData.length > 0) {
        batchesData = allBatchesData || [];
        dataSource = 'all_batches';
        console.log(`✅ Found ${allBatchesData.length} archived batches`);
      } else {
        // Step 3: For night shift, also check for any data in the time range regardless of shift
        if (validatedShift === 'night') {
          console.log(`🔍 No night shift data found, checking for any data in the time range...`);
          
          // Check for any batches (morning or night) in the time range
          const { data: anyBatchesData, error: anyBatchesError } = await supabase
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
            .gte('created_at', utcShiftStart.toISOString())
            .lt('created_at', utcShiftEnd.toISOString())
            .order('created_at', { ascending: false });

          console.log(`📊 Any batches in time range: ${anyBatchesData?.length || 0} records`);
          
          if (anyBatchesData && anyBatchesData.length > 0) {
            batchesData = anyBatchesData || [];
            dataSource = 'archived';
            console.log(`✅ Found ${anyBatchesData.length} batches in the 24-hour period for night shift`);
          }
        }
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
    console.log(`📊 Shift alignment: ${shiftContext.shiftAlignmentStatus}`);

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
        isShiftAligned: shiftContext.isShiftAligned,
        managerShift: shiftContext.managerShift,
        alignmentStatus: shiftContext.shiftAlignmentStatus,
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