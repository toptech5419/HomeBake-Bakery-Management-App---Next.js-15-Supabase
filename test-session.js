// Quick test script to verify session management
const { createServiceRoleClient } = require('./src/lib/supabase/server.js');

async function testSessionManagement() {
  try {
    console.log('🧪 Testing session management with service role client...');
    
    const serviceClient = createServiceRoleClient();
    
    // Test 1: Try to read sessions table
    console.log('📋 Test 1: Reading sessions table...');
    const { data: sessions, error: sessionsError } = await serviceClient
      .from('sessions')
      .select('*')
      .limit(5);
    
    if (sessionsError) {
      console.error('❌ Failed to read sessions:', sessionsError);
      return;
    }
    
    console.log(`✅ Sessions table readable. Found ${sessions?.length || 0} sessions`);
    
    // Test 2: Try to read users table
    console.log('👥 Test 2: Reading users table...');
    const { data: users, error: usersError } = await serviceClient
      .from('users')
      .select('id, name, role')
      .neq('role', 'owner')
      .eq('is_active', true);
    
    if (usersError) {
      console.error('❌ Failed to read users:', usersError);
      return;
    }
    
    console.log(`✅ Users table readable. Found ${users?.length || 0} staff members`);
    
    // Test 3: Try to create a test session
    const testUserId = users?.[0]?.id;
    if (!testUserId) {
      console.log('⚠️ No users found to test session creation');
      return;
    }
    
    console.log(`🔐 Test 3: Creating test session for user ${testUserId.slice(-4)}...`);
    const testToken = `test_session_${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    const { data: newSession, error: createError } = await serviceClient
      .from('sessions')
      .insert({
        user_id: testUserId,
        token: testToken,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create test session:', createError);
      return;
    }
    
    console.log('✅ Test session created successfully:', {
      sessionId: newSession.id,
      userId: newSession.user_id.slice(-4)
    });
    
    // Test 4: Clean up test session
    console.log('🧹 Test 4: Cleaning up test session...');
    const { error: deleteError } = await serviceClient
      .from('sessions')
      .delete()
      .eq('id', newSession.id);
    
    if (deleteError) {
      console.error('❌ Failed to delete test session:', deleteError);
    } else {
      console.log('✅ Test session cleaned up successfully');
    }
    
    console.log('🎉 All tests passed! Session management is working properly.');
    
  } catch (error) {
    console.error('💥 Test failed with exception:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  testSessionManagement();
}

module.exports = { testSessionManagement };