#!/usr/bin/env node

/**
 * HOMEBAKE FUNCTIONALITY TEST SCRIPT
 * 
 * This script systematically tests all core functionalities to ensure they work after the database fixes.
 * Run this after applying the database schema fix.
 * 
 * Prerequisites:
 * 1. Apply database/complete-schema-fix.sql to your database
 * 2. Ensure you have an owner user in your database
 * 3. Set up proper environment variables
 * 
 * Usage: node scripts/test-functionality.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

/**
 * Test Results Storage
 */
const testResults = {
  passed: 0,
  failed: 0,
  details: []
};

/**
 * Test Helper Functions
 */
function logTest(testName, success, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}${details ? ' - ' + details : ''}`);
  
  testResults.details.push({ testName, success, details });
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function logSection(sectionName) {
  console.log(`\n📋 ${sectionName.toUpperCase()}`);
  console.log('─'.repeat(50));
}

/**
 * Test Functions
 */
async function testDatabaseConnection() {
  logSection('Database Connection');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      logTest('Database Connection', false, error.message);
      return false;
    }
    
    logTest('Database Connection', true, 'Successfully connected to Supabase');
    return true;
  } catch (error) {
    logTest('Database Connection', false, error.message);
    return false;
  }
}

async function testRLSPolicies() {
  logSection('RLS Policies');
  
  try {
    // Test if RLS helper function exists
    const { data, error } = await supabase.rpc('get_current_user_role');
    
    if (error && !error.message.includes('not authenticated')) {
      logTest('RLS Helper Function', false, error.message);
      return false;
    }
    
    logTest('RLS Helper Function', true, 'get_current_user_role() function exists');
    
    // Test basic table access (should fail without auth)
    const { error: breadTypesError } = await supabase
      .from('bread_types')
      .select('*')
      .limit(1);
    
    // This should fail due to RLS when not authenticated
    if (breadTypesError) {
      logTest('RLS Protection', true, 'Tables properly protected by RLS');
    } else {
      logTest('RLS Protection', false, 'Tables not properly protected - RLS may be disabled');
    }
    
    return true;
  } catch (error) {
    logTest('RLS Policies', false, error.message);
    return false;
  }
}

async function testTableStructure() {
  logSection('Table Structure');
  
  const requiredTables = [
    'users',
    'profiles', 
    'bread_types',
    'production_logs',
    'sales_logs',
    'qr_invites',
    'shift_feedback',
    'inventory',
    'inventory_logs'
  ];
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0);
      
      if (error) {
        logTest(`Table: ${table}`, false, error.message);
      } else {
        logTest(`Table: ${table}`, true, 'Table accessible');
      }
    } catch (error) {
      logTest(`Table: ${table}`, false, error.message);
    }
  }
}

async function createTestOwnerUser() {
  logSection('Test Owner Creation');
  
  if (!supabaseAdmin) {
    logTest('Admin Client', false, 'Service role key not available');
    return null;
  }
  
  try {
    const testEmail = `test-owner-${Date.now()}@homebake.test`;
    const testPassword = 'TestPassword123!';
    
    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      user_metadata: { role: 'owner' }
    });
    
    if (authError || !authUser.user) {
      logTest('Create Test Owner Auth', false, authError?.message || 'No user returned');
      return null;
    }
    
    logTest('Create Test Owner Auth', true, `Auth user created: ${authUser.user.id}`);
    
    // Create user record
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authUser.user.id,
        email: testEmail,
        name: 'Test Owner',
        role: 'owner',
        is_active: true
      }]);
    
    if (userError) {
      logTest('Create Test Owner Record', false, userError.message);
      // Cleanup auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return null;
    }
    
    logTest('Create Test Owner Record', true, 'User record created');
    
    return {
      id: authUser.user.id,
      email: testEmail,
      password: testPassword
    };
  } catch (error) {
    logTest('Create Test Owner', false, error.message);
    return null;
  }
}

async function testOwnerFunctionalities(testOwner) {
  if (!testOwner) {
    logTest('Owner Functionalities', false, 'No test owner available');
    return;
  }
  
  logSection('Owner Functionalities');
  
  try {
    // Sign in as test owner
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testOwner.email,
      password: testOwner.password
    });
    
    if (signInError || !signInData.user) {
      logTest('Owner Sign In', false, signInError?.message || 'No user returned');
      return;
    }
    
    logTest('Owner Sign In', true, 'Successfully signed in as owner');
    
    // Test QR Invite Generation
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      const { error: qrError } = await supabase
        .from('qr_invites')
        .insert([{
          token,
          role: 'manager',
          expires_at: expiresAt.toISOString(),
          created_by: signInData.user.id
        }]);
      
      if (qrError) {
        logTest('QR Invite Creation', false, qrError.message);
      } else {
        logTest('QR Invite Creation', true, 'QR invite created successfully');
        
        // Clean up
        await supabase.from('qr_invites').delete().eq('token', token);
      }
    } catch (error) {
      logTest('QR Invite Creation', false, error.message);
    }
    
    // Test Bread Type Creation
    try {
      const breadTypeName = `Test Bread ${Date.now()}`;
      const { data: breadTypeData, error: breadTypeError } = await supabase
        .from('bread_types')
        .insert([{
          name: breadTypeName,
          size: 'Medium',
          unit_price: 150,
          created_by: signInData.user.id
        }])
        .select()
        .single();
      
      if (breadTypeError) {
        logTest('Bread Type Creation', false, breadTypeError.message);
      } else {
        logTest('Bread Type Creation', true, 'Bread type created successfully');
        
        // Clean up
        await supabase.from('bread_types').delete().eq('id', breadTypeData.id);
      }
    } catch (error) {
      logTest('Bread Type Creation', false, error.message);
    }
    
    // Test Users List
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role, is_active');
      
      if (usersError) {
        logTest('Users List', false, usersError.message);
      } else {
        logTest('Users List', true, `Found ${usersData.length} users`);
      }
    } catch (error) {
      logTest('Users List', false, error.message);
    }
    
    // Sign out
    await supabase.auth.signOut();
    
  } catch (error) {
    logTest('Owner Functionalities', false, error.message);
  }
}

async function cleanupTestData(testOwner) {
  if (!testOwner || !supabaseAdmin) return;
  
  logSection('Cleanup');
  
  try {
    // Delete user record
    await supabaseAdmin.from('users').delete().eq('id', testOwner.id);
    
    // Delete auth user
    await supabaseAdmin.auth.admin.deleteUser(testOwner.id);
    
    logTest('Cleanup Test Data', true, 'Test data cleaned up');
  } catch (error) {
    logTest('Cleanup Test Data', false, error.message);
  }
}

/**
 * Main Test Function
 */
async function runTests() {
  console.log('🧪 HOMEBAKE FUNCTIONALITY TESTS');
  console.log('═'.repeat(50));
  
  // Basic tests
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('\n❌ Cannot proceed without database connection');
    return;
  }
  
  await testRLSPolicies();
  await testTableStructure();
  
  // Advanced tests with test user
  const testOwner = await createTestOwnerUser();
  await testOwnerFunctionalities(testOwner);
  await cleanupTestData(testOwner);
  
  // Results
  console.log('\n📊 TEST RESULTS');
  console.log('═'.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🔍 FAILED TESTS:');
    testResults.details
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`  ❌ ${test.testName}: ${test.details}`);
      });
  }
  
  console.log('\n🎯 NEXT STEPS:');
  if (testResults.failed === 0) {
    console.log('  ✅ All tests passed! Your HomeBake app should be working correctly.');
    console.log('  ✅ You can now test the app manually in your browser.');
  } else {
    console.log('  ⚠️  Some tests failed. Please:');
    console.log('     1. Apply the database/complete-schema-fix.sql file');
    console.log('     2. Check your environment variables');
    console.log('     3. Verify your database connection');
    console.log('     4. Run this test again');
  }
}

// Handle errors and run tests
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

runTests().catch(console.error);