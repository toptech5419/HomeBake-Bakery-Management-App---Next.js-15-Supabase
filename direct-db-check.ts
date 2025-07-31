// Direct database check
import { createClient } from '@supabase/supabase-js';

// Use environment variables instead of hardcoded values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kqhrrjykkrfrzbbjzlpl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
  console.error('Please create a .env.local file with:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Batch {
  id: string;
  batch_number: string;
  shift: string;
  status: string;
  actual_quantity: number;
  created_at: string;
  start_time: string;
  bread_types?: {
    id: string;
    name: string;
    unit_price: number;
    size: string;
  };
}

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
  
  batches?.forEach((batch: Batch, index: number) => {
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
