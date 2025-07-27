// Test Database Connection and RLS Policies
// Run this script to verify database connectivity and permissions

const { createClient } = require('@supabase/supabase-js');

// You'll need to add your Supabase URL and anon key here
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('sales_logs')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
}

async function testSalesLogsAccess() {
  console.log('🔍 Testing sales_logs table access...');
  
  try {
    // Test reading from sales_logs
    const { data, error } = await supabase
      .from('sales_logs')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Sales logs access failed:', error);
      return false;
    }
    
    console.log('✅ Sales logs access successful');
    console.log(`📊 Found ${data?.length || 0} sales records`);
    return true;
  } catch (error) {
    console.error('❌ Sales logs access error:', error);
    return false;
  }
}

async function testRemainingBreadAccess() {
  console.log('🔍 Testing remaining_bread table access...');
  
  try {
    // Test reading from remaining_bread
    const { data, error } = await supabase
      .from('remaining_bread')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Remaining bread access failed:', error);
      return false;
    }
    
    console.log('✅ Remaining bread access successful');
    console.log(`📊 Found ${data?.length || 0} remaining bread records`);
    return true;
  } catch (error) {
    console.error('❌ Remaining bread access error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database connection tests...\n');
  
  const connectionOk = await testDatabaseConnection();
  if (!connectionOk) {
    console.log('\n❌ Database connection failed. Please check your Supabase configuration.');
    process.exit(1);
  }
  
  const salesAccessOk = await testSalesLogsAccess();
  const remainingAccessOk = await testRemainingBreadAccess();
  
  console.log('\n📋 Test Results:');
  console.log(`Database Connection: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Sales Logs Access: ${salesAccessOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Remaining Bread Access: ${remainingAccessOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (salesAccessOk && remainingAccessOk) {
    console.log('\n🎉 All tests passed! Your database is properly configured.');
  } else {
    console.log('\n⚠️ Some tests failed. Please run the RLS fix script:');
    console.log('database/fix-sales-rls-policies.sql');
  }
}

main().catch(console.error); 