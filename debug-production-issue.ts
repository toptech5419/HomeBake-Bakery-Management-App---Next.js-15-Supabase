// Debug script to test production items display
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProductionItems() {
  console.log('=== DEBUGGING PRODUCTION ITEMS ISSUE ===');
  
  // Current Nigeria time
  const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
  console.log('Current Nigeria time:', nigeriaTime.toISOString());
  console.log('Current Nigeria date:', nigeriaTime.toISOString().split('T')[0]);
  console.log('Current Nigeria hour:', nigeriaTime.getHours());
  
  // Test both shifts
  const shifts = ['morning', 'night'] as const;
  
  for (const shift of shifts) {
    console.log(`\n=== TESTING ${shift.toUpperCase()} SHIFT ===`);
    
    // Calculate date range
    const targetDate = nigeriaTime.toISOString().split('T')[0];
    const nigeriaDate = new Date(targetDate);
    const startOfDay = new Date(nigeriaDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(nigeriaDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('Target date:', targetDate);
    console.log('Start of day (UTC):', startOfDay.toISOString());
    console.log('End of day (UTC):', endOfDay.toISOString());
    
    // Query batches
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
      .eq('shift', shift)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .in('status', ['active', 'completed']);
    
    if (error) {
      console.error(`Error fetching ${shift} batches:`, error);
      continue;
    }
    
    console.log(`Found ${batches?.length || 0} batches for ${shift} shift`);
    
    if (batches && batches.length > 0) {
      batches.forEach((batch: any, index: number) => {
        console.log(`  Batch ${index + 1}:`);
        console.log(`    ID: ${batch.id}`);
        console.log(`    Batch Number: ${batch.batch_number}`);
        console.log(`    Bread Type: ${batch.bread_types?.name || 'Unknown'}`);
        console.log(`    Quantity: ${batch.actual_quantity}`);
        console.log(`    Start Time (UTC): ${batch.start_time}`);
        console.log(`    Start Time (Nigeria): ${new Date(batch.start_time).toLocaleString("en-US", {timeZone: "Africa/Lagos"})}`);
        console.log(`    Shift: ${batch.shift}`);
        console.log(`    Status: ${batch.status}`);
      });
    } else {
      console.log(`  No batches found for ${shift} shift`);
      
      // Let's check all batches for today regardless of shift
      console.log(`  Checking ALL batches for today...`);
      const { data: allBatches } = await supabase
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
      
      console.log(`  Found ${allBatches?.length || 0} total batches for today`);
      if (allBatches && allBatches.length > 0) {
        allBatches.forEach((batch: any) => {
          console.log(`    Batch ${batch.batch_number} - Shift: ${batch.shift}, Time: ${new Date(batch.start_time).toLocaleString("en-US", {timeZone: "Africa/Lagos"})}`);
        });
      }
    }
  }
}

// Run the debug
debugProductionItems().catch(console.error);
