// Test the API endpoint directly
// Run with: node test-api-direct.js

const fetch = require('node-fetch');

async function testAPI() {
  console.log('🔍 Testing API endpoint directly...\n');

  // Test with current date
  const currentDate = '2025-07-25'; // Use your batch date
  const currentShift = 'morning'; // Test morning shift

  console.log(`Testing: ${currentShift} shift on ${currentDate}`);

  try {
    const response = await fetch(`http://localhost:3000/api/inventory/shift?shift=${currentShift}&date=${currentDate}`);
    
    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Data length: ${data.data?.length || 0}`);
    console.log(`   Total units: ${data.totalUnits || 0}`);
    console.log(`   Source: ${data.source}`);
    console.log(`   Shift: ${data.shift}`);
    console.log(`   Date: ${data.date}`);
    
    if (data.data && data.data.length > 0) {
      console.log('\n📋 Inventory items:');
      data.data.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} - ${item.quantity} units`);
      });
    } else {
      console.log('\n❌ No inventory items found');
    }

  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
}

// Run the test
testAPI().catch(console.error);
