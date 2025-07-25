// Simple API debug test
// This will help identify the exact issue

async function testAPIDebug() {
  console.log('🧪 Testing API Debug...\n');

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Today's date: ${today}`);

  // Test the API directly
  console.log('\n🌅 Testing Morning Shift API...');
  try {
    const response = await fetch(`http://localhost:3000/api/inventory/shift?shift=morning&date=${today}`);
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
    
    if (data.data && data.data.length > 0) {
      console.log(`✅ SUCCESS: Found ${data.data.length} inventory items for morning shift`);
    } else {
      console.log(`❌ No inventory items found for morning shift`);
    }
  } catch (error) {
    console.error('❌ Error testing morning shift:', error);
  }

  // Test with July 25th specifically (since you mentioned that date)
  console.log('\n📅 Testing with July 25th date...');
  try {
    const response = await fetch(`http://localhost:3000/api/inventory/shift?shift=morning&date=2025-07-25`);
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
    
    if (data.data && data.data.length > 0) {
      console.log(`✅ SUCCESS: Found ${data.data.length} inventory items for July 25th morning shift`);
    } else {
      console.log(`❌ No inventory items found for July 25th morning shift`);
    }
  } catch (error) {
    console.error('❌ Error testing July 25th:', error);
  }

  console.log('\n🧪 Test Complete!');
}

// Run the test
testAPIDebug().catch(console.error); 