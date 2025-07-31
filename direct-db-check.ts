// Direct database check
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kqhrrjykkrfrzbbjzlpl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaHJyanlra3JmcnpiYmp6bHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1OTQ3NjAsImV4cCI6MjA1MTE3MDc2MH0.4iHI2Q3NhgKrS6g-KeQvs8XqYqZ6s2GqVq3X0VhQ3CM'
);

async function checkDatabase() {
  console.log('=== DIRECT DATABASE CHECK ===');
  
  // Get all batches from the last 2 days
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const { data: batches, error } = await supabase
    .from('batches')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price,
        size
      )
    `)
    .gte('created_at', twoDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${batches?.length || 0} batches from last 2 days:`);
  
  batches?.forEach((batch, index) => {
    const createdAt = new Date(batch.created_at);
    const startTime = new Date(batch.start_time);
    const nigeriaCreated = createdAt.toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
    const nigeriaStart = startTime.toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
    
    console.log(`\n${index + 1}. Batch ${batch.batch_number}`);
    console.log(`   ID: ${batch.id}`);
    console.log(`   Shift: ${batch.shift}`);
    console.log(`   Status: ${batch.status}`);
    console.log(`   Quantity: ${batch.actual_quantity}`);
    console.log(`   Created (UTC): ${batch.created_at}`);
    console.log(`   Created (Nigeria): ${nigeriaCreated}`);
    console.log(`   Start Time (UTC): ${batch.start_time}`);
    console.log(`   Start Time (Nigeria): ${nigeriaStart}`);
    console.log(`   Bread Type: ${batch.bread_types?.name || 'Unknown'}`);
  });

  // Now let's test the date filtering
  console.log('\n=== TESTING DATE FILTERING ===');
  
  const testDate = '2025-07-30';
  const nigeriaDate = new Date(testDate);
  const startOfDay = new Date(nigeriaDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(nigeriaDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  console.log('Testing with date:', testDate);
  console.log('Start of day (UTC):', startOfDay.toISOString());
  console.log('End of day (UTC):', endOfDay.toISOString());
  
  const { data: filteredBatches } = await supabase
    .from('batches')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price,
        size
      )
    `)
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .in('status', ['active', 'completed']);

  console.log(`Found ${filteredBatches?.length || 0} batches for ${testDate}`);
  
  // Test with yesterday's date
  const yesterday = '2025-07-29';
  const yesterdayDate = new Date(yesterday);
  const startOfYesterday = new Date(yesterdayDate);
  startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(yesterdayDate);
  endOfYesterday.setHours(23, 59, 59, 999);
  
  console.log('\nTesting with yesterday:', yesterday);
  console.log('Start of yesterday (UTC):', startOfYesterday.toISOString());
  console.log('End of yesterday (UTC):', endOfYesterday.toISOString());
  
  const { data: yesterdayBatches } = await supabase
    .from('batches')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price,
        size
      )
    `)
    .gte('start_time', startOfYesterday.toISOString())
    .lte('start_time', endOfYesterday.toISOString())
    .in('status', ['active', 'completed']);

  console.log(`Found ${yesterdayBatches?.length || 0} batches for ${yesterday}`);
}

checkDatabase().catch(console.error);
