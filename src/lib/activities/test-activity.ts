'use server';

import { createServer } from '@/lib/supabase/server';

export async function testActivityLogging() {
  try {
    console.log('🧪 Testing activity logging...');
    
    const supabase = await createServer();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user found');
      return { success: false, error: 'No authenticated user' };
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Get user details
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', user.id)
      .single();
    
    if (userDataError) {
      console.error('❌ Error fetching user data:', userDataError);
      return { success: false, error: 'Could not fetch user data' };
    }
    
    console.log('✅ User data:', userData);
    
    // Test inserting activity
    const testActivity = {
      user_id: user.id,
      user_name: userData.name || 'Test User',
      user_role: userData.role as 'manager' | 'sales_rep',
      activity_type: 'batch' as const,
      shift: 'morning' as const,
      message: `🧪 Test activity - ${new Date().toISOString()}`,
      metadata: { test: true }
    };
    
    console.log('📤 Attempting to insert test activity:', testActivity);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('activities')
      .insert([testActivity])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting activity:', insertError);
      return { 
        success: false, 
        error: `Insert failed: ${insertError.message}`, 
        code: insertError.code,
        details: insertError.details 
      };
    }
    
    console.log('✅ Activity inserted successfully:', insertResult);
    
    // Verify it was inserted by reading it back
    const { data: readResult, error: readError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', insertResult.id)
      .single();
    
    if (readError) {
      console.error('❌ Error reading back activity:', readError);
      return { success: false, error: 'Insert succeeded but read failed' };
    }
    
    console.log('✅ Activity read back successfully:', readResult);
    
    return { 
      success: true, 
      message: 'Activity logging test successful!',
      activity: readResult 
    };
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}