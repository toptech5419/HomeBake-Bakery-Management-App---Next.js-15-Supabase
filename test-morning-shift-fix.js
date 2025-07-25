// Test script to verify the morning shift inventory fix
// This will test the API endpoint with proper timezone handling

async function testMorningShiftFix() {
  console.log('🧪 Testing Morning Shift Inventory Fix...\n');

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Testing for date: ${today}`);

  // Test 1: Check current time and timezone
  console.log('\n🕐 Current Time Information:');
  const now = new Date();
  console.log(`   Current time: ${now.toLocaleString()}`);
  console.log(`   Current time (UTC): ${now.toISOString()}`);
  console.log(`   Timezone offset: ${now.getTimezoneOffset()} minutes`);
  console.log(`   Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  // Test 2: Calculate expected shift boundaries
  console.log('\n⏰ Expected Shift Boundaries:');
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

  // Test 3: Call the API endpoint
  console.log('\n🌅 Testing Morning Shift API...');
  try {
    const response = await fetch(`http://localhost:3000/api/inventory/shift?shift=morning&date=${today}`);
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
    
    if (data.data && data.data.length > 0) {
      console.log(`✅ SUCCESS: Found ${data.data.length} inventory items for morning shift`);
      console.log(`📋 Source: ${data.source}`);
      console.log(`📋 Total Units: ${data.totalUnits}`);
      console.log(`📋 Record Count: ${data.recordCount}`);
      
      // Show the inventory items
      data.data.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} - ${item.quantity} units (${item.batches} batches)`);
      });
    } else {
      console.log(`❌ No inventory items found for morning shift`);
      console.log(`📋 Source: ${data.source}`);
      console.log(`📋 Total Units: ${data.totalUnits}`);
      console.log(`📋 Record Count: ${data.recordCount}`);
    }
  } catch (error) {
    console.error('❌ Error testing morning shift:', error);
  }

  // Test 4: Compare with night shift
  console.log('\n🌙 Testing Night Shift for Comparison...');
  try {
    const nightResponse = await fetch(`http://localhost:3000/api/inventory/shift?shift=night&date=${today}`);
    const nightData = await nightResponse.json();
    
    console.log(`📊 Night Shift Response Status: ${nightResponse.status}`);
    console.log(`📊 Night Shift Data:`, JSON.stringify(nightData, null, 2));
    
    if (nightData.data && nightData.data.length > 0) {
      console.log(`✅ Found ${nightData.data.length} inventory items for night shift`);
      console.log(`📋 Source: ${nightData.source}`);
      console.log(`📋 Total Units: ${nightData.totalUnits}`);
      console.log(`📋 Record Count: ${nightData.recordCount}`);
    } else {
      console.log(`❌ No inventory items found for night shift`);
      console.log(`📋 Source: ${nightData.source}`);
      console.log(`📋 Total Units: ${nightData.totalUnits}`);
      console.log(`📋 Record Count: ${nightData.recordCount}`);
    }
  } catch (error) {
    console.error('❌ Error testing night shift:', error);
  }

  console.log('\n🧪 Test Complete!');
  console.log('\n📝 Summary:');
  console.log('   - If morning shift shows data: ✅ FIX WORKED');
  console.log('   - If morning shift shows no data: ❌ Need further investigation');
  console.log('   - Check the server logs for debugging information');
}

// Run the test
testMorningShiftFix().catch(console.error); 