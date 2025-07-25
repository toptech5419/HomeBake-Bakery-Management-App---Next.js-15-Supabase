// Deep debug script for inventory issue
// Run this with: node debug-inventory-deep.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to add your Supabase credentials here
const supabase = createClient(
  process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
);

async function debugInventoryDeep() {
  console.log('🔍 DEEP INVENTORY DEBUG START...\n');

  // 1. Check current system state
  const now = new Date();
  const hours = now.getHours();
  const currentShift = hours >= 10 && hours < 22 ? 'morning' : 'night';
  const currentDate = now.toISOString().split('T')[0];
  
  console.log('📅 SYSTEM STATE:');
  console.log(`   Current local time: ${now.toLocaleString()}`);
  console.log(`   Current UTC time: ${now.toISOString()}`);
  console.log(`   Current shift: ${currentShift}`);
  console.log(`   Current date: ${currentDate}`);
  console.log(`   Timezone offset: ${now.getTimezoneOffset()} minutes`);

  // 2. Calculate exact shift boundaries
  const shiftStart = new Date(currentDate);
  const shiftEnd = new Date(currentDate);
  
  if (currentShift === 'morning') {
    shiftStart.setHours(10, 0, 0, 0);
    shiftEnd.setHours(22, 0, 0, 0);
  } else {
    shiftStart.setHours(22, 0, 0, 0);
    shiftEnd.setDate(shiftEnd.getDate() + 1);
    shiftEnd.setHours(10, 0, 0, 0);
  }

  const utcShiftStart = new Date(shiftStart.getTime() - (shiftStart.getTimezoneOffset() * 60000));
  const utcShiftEnd = new Date(shiftEnd.getTime() - (shiftEnd.getTimezoneOffset() * 60000));

  console.log('\n⏰ SHIFT BOUNDARIES:');
  console.log(`   Local ${currentShift} start: ${shiftStart.toLocaleString()}`);
  console.log(`   Local ${currentShift} end: ${shiftEnd.toLocaleString()}`);
  console.log(`   UTC ${currentShift} start: ${utcShiftStart.toISOString()}`);
  console.log(`   UTC ${currentShift} end: ${utcShiftEnd.toISOString()}`);

  // 3. Check ALL batches for today
  console.log('\n📊 ALL BATCHES FOR TODAY:');
  const { data: allTodayBatches, error: allTodayError } = await supabase
    .from('batches')
    .select(`
      id,
      bread_type_id,
      batch_number,
      actual_quantity,
      status,
      shift,
      created_at,
      bread_type:bread_types!inner(
        id,
        name,
        unit_price
      )
    `)
    .gte('created_at', `${currentDate}T00:00:00`)
    .lt('created_at', `${currentDate}T23:59:59`)
    .order('created_at', { ascending: false });

  if (allTodayError) {
    console.error('❌ Error fetching today\'s batches:', allTodayError);
  } else {
    console.log(`✅ Found ${allTodayBatches?.length || 0} total batches for today`);
    allTodayBatches?.forEach((batch, index) => {
      console.log(`   ${index + 1}. ${batch.bread_type?.name} - ${batch.actual_quantity} units (${batch.shift} shift) - Created: ${batch.created_at}`);
    });
  }

  // 4. Check CURRENT SHIFT batches
  console.log(`\n🌅 ${currentShift.toUpperCase()} SHIFT BATCHES:`);
  const { data: shiftBatches, error: shiftError } = await supabase
    .from('batches')
    .select(`
      id,
      bread_type_id,
      batch_number,
      actual_quantity,
      status,
      shift,
      created_at,
      bread_type:bread_types!inner(
        id,
        name,
        unit_price
      )
    `)
    .eq('shift', currentShift)
    .gte('created_at', utcShiftStart.toISOString())
    .lt('created_at', utcShiftEnd.toISOString())
    .order('created_at', { ascending: false });

  if (shiftError) {
    console.error('❌ Error fetching shift batches:', shiftError);
  } else {
    console.log(`✅ Found ${shiftBatches?.length || 0} ${currentShift} shift batches`);
    shiftBatches?.forEach((batch, index) => {
      console.log(`   ${index + 1}. ${batch.bread_type?.name} - ${batch.actual_quantity} units - Created: ${batch.created_at}`);
    });
  }

  // 5. Check if batches exist but are outside time range
  console.log(`\n🔍 CHECKING TIME RANGE ISSUES:`);
  const { data: allShiftBatches, error: allShiftError } = await supabase
    .from('batches')
    .select(`
      id,
      bread_type_id,
      batch_number,
      actual_quantity,
      status,
      shift,
      created_at,
      bread_type:bread_types!inner(
        id,
        name,
        unit_price
      )
    `)
    .eq('shift', currentShift)
    .gte('created_at', `${currentDate}T00:00:00`)
    .lt('created_at', `${currentDate}T23:59:59`)
    .order('created_at', { ascending: false });

  if (allShiftError) {
    console.error('❌ Error fetching all shift batches:', allShiftError);
  } else {
    console.log(`✅ Found ${allShiftBatches?.length || 0} ${currentShift} batches for entire day`);
    
    if (allShiftBatches && allShiftBatches.length > 0) {
      console.log('📋 Checking if any fall outside UTC range:');
      allShiftBatches.forEach(batch => {
        const batchTime = new Date(batch.created_at);
        const inRange = batchTime >= utcShiftStart && batchTime < utcShiftEnd;
        console.log(`   ${batch.bread_type?.name} - ${batch.created_at} - In range: ${inRange}`);
      });
    }
  }

  // 6. Check RLS policies
  console.log('\n🔒 RLS POLICY CHECK:');
  const { data: rlsTest, error: rlsError } = await supabase
    .from('batches')
    .select('id, shift, created_at')
    .eq('shift', currentShift)
    .limit(5);

  if (rlsError) {
    console.error('❌ RLS Error:', rlsError);
  } else {
    console.log(`✅ RLS test passed - found ${rlsTest?.length || 0} records`);
  }

  // 7. Check bread types
  console.log('\n🍞 BREAD TYPES:');
  const { data: breadTypes, error: breadTypesError } = await supabase
    .from('bread_types')
    .select('id, name, unit_price')
    .order('name');

  if (breadTypesError) {
    console.error('❌ Error fetching bread types:', breadTypesError);
  } else {
    console.log(`✅ Found ${breadTypes?.length || 0} bread types`);
    breadTypes?.forEach((bt, index) => {
      console.log(`   ${index + 1}. ${bt.name} - ₦${bt.unit_price}`);
    });
  }

  // 8. Summary
  console.log('\n📋 SUMMARY:');
  console.log(`   Current shift: ${currentShift}`);
  console.log(`   Expected batches: ${shiftBatches?.length || 0}`);
  console.log(`   Total today: ${allTodayBatches?.length || 0}`);
  console.log(`   ${currentShift} shift today: ${allShiftBatches?.length || 0}`);
  
  if ((shiftBatches?.length || 0) === 0 && (allShiftBatches?.length || 0) > 0) {
    console.log('   ❌ ISSUE: Batches exist but outside UTC time range');
    console.log('   🔧 SOLUTION: Adjust timezone conversion or expand query range');
  } else if ((shiftBatches?.length || 0) === 0 && (allShiftBatches?.length || 0) === 0) {
    console.log('   ❌ ISSUE: No batches recorded for this shift today');
    console.log('   🔧 SOLUTION: Check if batches were recorded with correct shift/date');
  } else {
    console.log('   ✅ Batches should be displaying correctly');
  }
}

// Run the debug
debugInventoryDeep().catch(console.error);
