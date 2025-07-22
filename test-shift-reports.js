// Test script to verify shift_reports table functionality
const { createClient } = require('@supabase/supabase-js');

// You'll need to add your Supabase URL and anon key here
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testShiftReports() {
  try {
    console.log('Testing shift_reports table...');
    
    // Test 1: Check if table exists by trying to select from it
    const { data, error } = await supabase
      .from('shift_reports')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing shift_reports table:', error);
      console.log('This might mean the table doesn\'t exist or RLS policies are blocking access');
    } else {
      console.log('✅ shift_reports table exists and is accessible');
      console.log('Current records:', data?.length || 0);
    }
    
    // Test 2: Try to insert a test record (this will fail due to RLS, but we can see the error)
    const testRecord = {
      user_id: 'test-user-id',
      shift: 'morning',
      total_revenue: 1000,
      total_items_sold: 10,
      total_remaining: 100,
      feedback: 'Test record',
      sales_data: [],
      remaining_breads: []
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('shift_reports')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.log('Expected insert error (due to RLS):', insertError.message);
    } else {
      console.log('✅ Test record inserted successfully');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testShiftReports(); 