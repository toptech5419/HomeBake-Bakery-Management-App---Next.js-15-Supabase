import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getInventoryShiftInfo, validateShiftData } from '@/lib/utils/inventory-shift-utils';

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
    
    // Production authentication check
    if (authError || !user) {
      console.log('❌ API: Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ API: User authenticated successfully');

    const { searchParams } = new URL(request.url);
    const requestedShift = searchParams.get('shift');
    
    // Get current inventory shift info (automatic 10AM/10PM detection)
    const inventoryShiftInfo = getInventoryShiftInfo();
    const actualShift = inventoryShiftInfo.currentShift;
    
    console.log('🕒 Inventory shift info:', {
      requested: requestedShift,
      actual: actualShift,
      dataRange: inventoryShiftInfo.dataFetchRange.description
    });

    // Validate shift parameter
    if (!requestedShift || !['morning', 'night'].includes(requestedShift)) {
      return NextResponse.json(
        { error: 'Valid shift (morning or night) is required' },
        { status: 400 }
      );
    }

    // Production safety: Always use actual current shift
    const validatedShift = actualShift; // Force current shift regardless of request
    const { dataFetchRange } = inventoryShiftInfo;

    console.log(`🔍 Using production shift: ${validatedShift}`);
    console.log(`📅 Data fetch range: ${dataFetchRange.description}`);
    console.log(`🕒 Time range: ${dataFetchRange.startTime} - ${dataFetchRange.endTime}`);

    // Query batches table with proper time range
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
      .gte('created_at', dataFetchRange.startTime)
      .lt('created_at', dataFetchRange.endTime)
      .order('created_at', { ascending: false });

    console.log(`📊 Active batches query result: ${batchesData?.length || 0} records`);
    
    let dataSource = 'batches';
    let totalArchivedBatches = 0;

    // If no active batches found, check all_batches table
    if (!batchesData || batchesData.length === 0) {
      console.log(`⚠️ No active batches found, checking archived data...`);
      
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
        .gte('created_at', dataFetchRange.startTime)
        .lt('created_at', dataFetchRange.endTime)
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
        batchesData = allBatchesData;
        dataSource = 'all_batches';
        totalArchivedBatches = allBatchesData.length;
        console.log(`✅ Found ${allBatchesData.length} archived batches`);
      } else {
        // No batches found - return empty state
        console.log(`📭 No batches found for current ${validatedShift} shift period`);
        return NextResponse.json({ 
          data: [],
          totalUnits: 0,
          totalBatches: 0,
          totalArchivedBatches: 0,
          shift: validatedShift,
          source: 'batches',
          recordCount: 0,
          dataFetchRange: dataFetchRange,
          shiftContext: {
            shouldShowArchivedData: dataSource === 'all_batches',
            isManager: false, // Inventory page doesn't need manager context
          }
        });
      }
    }

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      return NextResponse.json(
        { error: 'Failed to fetch inventory data' },
        { status: 500 }
      );
    }

    // Group by bread type and calculate totals
    const inventoryMap = new Map();
    
    for (const batch of batchesData || []) {
      const breadType = (batch as any).bread_type;
      if (!breadType) {
        console.warn('⚠️ Batch without bread_type found:', (batch as any).id);
        continue;
      }

      const key = breadType.id;
      
      if (!inventoryMap.has(key)) {
        inventoryMap.set(key, {
          id: breadType.id,
          name: breadType.name,
          size: breadType.size,
          price: breadType.unit_price,
          quantity: 0,
          batches: 0,
          archivedBatches: dataSource === 'all_batches' ? 0 : 0,
        });
      }

      const item = inventoryMap.get(key);
      item.quantity += (batch as any).actual_quantity || 0;
      item.batches += 1;
      
      // Track archived batches
      if (dataSource === 'all_batches') {
        item.archivedBatches += 1;
      }
    }

    const inventory = Array.from(inventoryMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalBatches = inventory.reduce((sum, item) => sum + item.batches, 0);

    console.log(`📊 Final inventory result:`, {
      inventoryItems: inventory.length,
      totalUnits: totalUnits,
      totalBatches: totalBatches,
      totalArchivedBatches: totalArchivedBatches,
      dataSource: dataSource,
      shift: validatedShift
    });

    return NextResponse.json({ 
      data: inventory,
      totalUnits,
      totalBatches,
      totalArchivedBatches,
      shift: validatedShift,
      source: dataSource,
      recordCount: batchesData?.length || 0,
      dataFetchRange: dataFetchRange,
      shiftContext: {
        shouldShowArchivedData: dataSource === 'all_batches',
        isManager: false, // Inventory page doesn't need manager-specific context
      },
      // Debug info for production monitoring
      debug: {
        requestedShift: requestedShift,
        actualShift: actualShift,
        shiftBoundary: `${inventoryShiftInfo.shiftStartTime} - ${inventoryShiftInfo.nextShiftTime}`,
        dataWindow: dataFetchRange.description
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching inventory:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}