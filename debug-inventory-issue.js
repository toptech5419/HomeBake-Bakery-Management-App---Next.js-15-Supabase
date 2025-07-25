// Comprehensive diagnostic script for inventory issue
// This will help identify exactly why morning shift batches aren't showing

const { createClient } = require('@supabase/supabase-js');

// You'll need to add your Supabase credentials here
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

async function debugInventoryIssue() {
  console.log('🔍 Comprehensive Inventory Debug...\n');

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Today's date: ${today}`);

  // Test 1: Check current time and timezone
  console.log('\n🕐 Current Time Information:');
  const now = new Date();
  console.log(`   Current time: ${now.toLocaleString()}`);
  console.log(`   Current time (UTC): ${now.toISOString()}`);
  console.log(`   Timezone offset: ${now.getTimezoneOffset()} minutes`);
  console.log(`   Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  // Test 2: Check if any batches exist at all for today
  console.log('\n📊 Test 2: Check all batches for today...');
  
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
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`)
    .order('created_at', { ascending: false });

  if (allTodayError) {
    console.error('❌ Error fetching today\'s batches:', allTodayError);
  } else {
    console.log(`✅ Found ${allTodayBatches?.length || 0} total batches for today`);
    
    if (allTodayBatches && allTodayBatches.length > 0) {
      console.log('📋 All today\'s batches:');
      allTodayBatches.forEach((batch, index) => {
        console.log(`   ${index + 1}. ${batch.bread_type?.name} - ${batch.actual_quantity} units (${batch.shift} shift, ${batch.status}) - Created: ${batch.created_at}`);
      });
    }
  }

  // Test 3: Check morning shift batches specifically
  console.log('\n🌅 Test 3: Check morning shift batches...');
  
  const { data: morningBatches, error: morningError } = await supabase
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
    .eq('shift', 'morning')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`)
    .order('created_at', { ascending: false });

  if (morningError) {
    console.error('❌ Error fetching morning batches:', morningError);
  } else {
    console.log(`✅ Found ${morningBatches?.length || 0} morning shift batches for today`);
    
    if (morningBatches && morningBatches.length > 0) {
      console.log('📋 Morning shift batches:');
      morningBatches.forEach((batch, index) => {
        console.log(`   ${index + 1}. ${batch.bread_type?.name} - ${batch.actual_quantity} units (${batch.status}) - Created: ${batch.created_at}`);
      });
    }
  }

  // Test 4: Calculate the exact query boundaries that the API is using
  console.log('\n⏰ Test 4: Calculate API query boundaries...');
  
  const targetDate = new Date(today);
  const shiftStart = new Date(targetDate);
  const shiftEnd = new Date(targetDate);

  // Morning shift: 10:00 AM - 10:00 PM LOCAL TIME
  shiftStart.setHours(10, 0, 0, 0);
  shiftEnd.setHours(22, 0, 0, 0);

  // Convert to UTC for database query
  const utcShiftStart = new Date(shiftStart.getTime() - (shiftStart.getTimezoneOffset() * 60000));
  const utcShiftEnd = new Date(shiftEnd.getTime() - (shiftEnd.getTimezoneOffset() * 60000));

  console.log(`   Local morning start: ${shiftStart.toLocaleString()}`);
  console.log(`   Local morning end: ${shiftEnd.toLocaleString()}`);
  console.log(`   UTC morning start: ${utcShiftStart.toISOString()}`);
  console.log(`   UTC morning end: ${utcShiftEnd.toISOString()}`);

  // Test 5: Check if any batches fall within the API's query boundaries
  console.log('\n🔍 Test 5: Check batches within API boundaries...');
  
  const { data: apiQueryBatches, error: apiQueryError } = await supabase
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
    .eq('shift', 'morning')
    .gte('created_at', utcShiftStart.toISOString())
    .lt('created_at', utcShiftEnd.toISOString())
    .order('created_at', { ascending: false });

  if (apiQueryError) {
    console.error('❌ Error fetching API query batches:', apiQueryError);
  } else {
    console.log(`✅ Found ${apiQueryError?.length || 0} batches within API query boundaries`);
    
    if (apiQueryBatches && apiQueryBatches.length > 0) {
      console.log('📋 Batches within API boundaries:');
      apiQueryBatches.forEach((batch, index) => {
        console.log(`   ${index + 1}. ${batch.bread_type?.name} - ${batch.actual_quantity} units (${batch.status}) - Created: ${batch.created_at}`);
      });
    } else {
      console.log('❌ NO BATCHES FOUND within API query boundaries!');
      console.log('   This means the timezone conversion is wrong or the batches are outside the time range.');
    }
  }

  // Test 6: Check bread types exist
  console.log('\n🍞 Test 6: Check bread types...');
  
  const { data: breadTypes, error: breadTypesError } = await supabase
    .from('bread_types')
    .select('id, name, unit_price')
    .order('name');

  if (breadTypesError) {
    console.error('❌ Error fetching bread types:', breadTypesError);
  } else {
    console.log(`✅ Found ${breadTypes?.length || 0} bread types`);
    
    if (breadTypes && breadTypes.length > 0) {
      console.log('📋 Available bread types:');
      breadTypes.forEach((breadType, index) => {
        console.log(`   ${index + 1}. ${breadType.name} - ₦${breadType.unit_price}`);
      });
    }
  }

  // Test 7: Check RLS policies
  console.log('\n🔒 Test 7: Check if RLS is blocking access...');
  
  const { data: rlsTest, error: rlsError } = await supabase
    .from('batches')
    .select('id, shift, created_at')
    .eq('shift', 'morning')
    .limit(5);

  if (rlsError) {
    console.error('❌ RLS Error:', rlsError);
    console.log('   This suggests RLS policies are blocking access');
  } else {
    console.log(`✅ RLS test passed - found ${rlsTest?.length || 0} records`);
  }

  console.log('\n🔍 Debug complete!');
  console.log('\n📝 Summary:');
  console.log('   - If Test 5 shows no batches: Timezone issue');
  console.log('   - If Test 7 shows RLS error: Permission issue');
  console.log('   - If all tests pass but inventory still empty: Frontend issue');
}

// Run the debug function
debugInventoryIssue().catch(console.error); 