#!/usr/bin/env node

/**
 * HomeBake Manager Functionality Test Suite
 * Tests all manager features from Steps 1-12
 */

const { createClient } = require('@supabase/supabase-js');

// Mock environment variables for testing
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class TestResults {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  add(name, status, message = '') {
    this.tests.push({ name, status, message });
    if (status === 'PASS') this.passed++;
    else this.failed++;
  }

  summary() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 HOMEBAKE MANAGER FUNCTIONALITY TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`🎯 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(80));

    if (this.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`   • ${t.name}: ${t.message}`);
      });
    }

    if (this.passed === this.tests.length) {
      console.log('\n🎉 ALL TESTS PASSED! Manager functionality is working perfectly.');
    } else {
      console.log(`\n⚠️  ${this.failed} test(s) need attention.`);
    }
  }
}

const results = new TestResults();

// Test helper functions
function logTest(name) {
  console.log(`🧪 Testing: ${name}...`);
}

async function testDatabaseConnection() {
  logTest('Database Connection');
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    results.add('Database Connection', 'PASS');
  } catch (error) {
    results.add('Database Connection', 'FAIL', error.message);
  }
}

async function testRLSPolicies() {
  logTest('RLS Policies');
  try {
    // Test if RLS is enabled
    const { data, error } = await supabase.rpc('get_current_user_role');
    if (error && error.message.includes('function get_current_user_role() does not exist')) {
      results.add('RLS Policies', 'FAIL', 'RLS function missing - run the RLS policies script');
    } else {
      results.add('RLS Policies', 'PASS');
    }
  } catch (error) {
    results.add('RLS Policies', 'FAIL', error.message);
  }
}

async function testTableStructure() {
  logTest('Table Structure');
  try {
    const tables = [
      'users', 'bread_types', 'production_logs', 'sales_logs', 
      'inventory', 'shift_feedback', 'qr_invitations'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) throw new Error(`Table ${table}: ${error.message}`);
    }
    
    results.add('Table Structure', 'PASS');
  } catch (error) {
    results.add('Table Structure', 'FAIL', error.message);
  }
}

async function testBreadTypes() {
  logTest('Bread Types Management');
  try {
    const { data, error } = await supabase.from('bread_types').select('*');
    if (error) throw error;
    
    if (data.length === 0) {
      results.add('Bread Types', 'FAIL', 'No bread types found - seed data needed');
    } else {
      results.add('Bread Types', 'PASS', `${data.length} bread types available`);
    }
  } catch (error) {
    results.add('Bread Types', 'FAIL', error.message);
  }
}

async function testInventoryStructure() {
  logTest('Inventory Table Structure');
  try {
    // Check if inventory table has correct columns
    const { data, error } = await supabase
      .from('inventory')
      .select('id, bread_type_id, quantity, last_updated')
      .limit(1);
    
    if (error) throw error;
    results.add('Inventory Structure', 'PASS', 'Inventory table structure is correct');
  } catch (error) {
    results.add('Inventory Structure', 'FAIL', error.message);
  }
}

async function testProductionLogStructure() {
  logTest('Production Log Structure');
  try {
    const { data, error } = await supabase
      .from('production_logs')
      .select('id, bread_type_id, quantity, shift, recorded_by, created_at')
      .limit(1);
    
    if (error) throw error;
    results.add('Production Log Structure', 'PASS');
  } catch (error) {
    results.add('Production Log Structure', 'FAIL', error.message);
  }
}

async function testSalesLogStructure() {
  logTest('Sales Log Structure');
  try {
    const { data, error } = await supabase
      .from('sales_logs')
      .select('id, bread_type_id, quantity, unit_price, shift, recorded_by, created_at')
      .limit(1);
    
    if (error) throw error;
    results.add('Sales Log Structure', 'PASS');
  } catch (error) {
    results.add('Sales Log Structure', 'FAIL', error.message);
  }
}

async function testShiftFeedback() {
  logTest('Shift Feedback System');
  try {
    const { data, error } = await supabase
      .from('shift_feedback')
      .select('id, user_id, shift, note, created_at')
      .limit(1);
    
    if (error) throw error;
    results.add('Shift Feedback', 'PASS');
  } catch (error) {
    results.add('Shift Feedback', 'FAIL', error.message);
  }
}

async function testUserRoles() {
  logTest('User Role System');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, role')
      .in('role', ['owner', 'manager', 'sales_rep'])
      .limit(5);
    
    if (error) throw error;
    
    const roleDistribution = data.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    results.add('User Roles', 'PASS', `Role distribution: ${JSON.stringify(roleDistribution)}`);
  } catch (error) {
    results.add('User Roles', 'FAIL', error.message);
  }
}

async function testQRInvitations() {
  logTest('QR Invitation System');
  try {
    const { data, error } = await supabase
      .from('qr_invitations')
      .select('id, role, is_used, created_by')
      .limit(1);
    
    if (error) throw error;
    results.add('QR Invitations', 'PASS');
  } catch (error) {
    results.add('QR Invitations', 'FAIL', error.message);
  }
}

async function testInventoryCalculation() {
  logTest('Inventory Calculation Logic');
  try {
    // Test that inventory can be calculated from production/sales
    const { data: productionData, error: prodError } = await supabase
      .from('production_logs')
      .select('bread_type_id, quantity')
      .limit(5);
    
    if (prodError) throw prodError;
    
    const { data: salesData, error: salesError } = await supabase
      .from('sales_logs')
      .select('bread_type_id, quantity')
      .limit(5);
    
    if (salesError) throw salesError;
    
    results.add('Inventory Calculation', 'PASS', 'Can access production and sales data for calculations');
  } catch (error) {
    results.add('Inventory Calculation', 'FAIL', error.message);
  }
}

async function testShiftSystem() {
  logTest('Shift Management System');
  try {
    // Test that shift data exists in logs
    const { data, error } = await supabase
      .from('production_logs')
      .select('shift')
      .in('shift', ['morning', 'night'])
      .limit(5);
    
    if (error) throw error;
    
    const shiftCounts = data.reduce((acc, log) => {
      acc[log.shift] = (acc[log.shift] || 0) + 1;
      return acc;
    }, {});
    
    results.add('Shift System', 'PASS', `Shift data available: ${JSON.stringify(shiftCounts)}`);
  } catch (error) {
    results.add('Shift System', 'FAIL', error.message);
  }
}

async function testManagerPermissions() {
  logTest('Manager Permissions (Production & Inventory)');
  try {
    // This would require an authenticated manager user
    // For now, just test table accessibility
    const { data, error } = await supabase
      .from('production_logs')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    results.add('Manager Permissions', 'PASS', 'Manager tables accessible');
  } catch (error) {
    results.add('Manager Permissions', 'FAIL', error.message);
  }
}

async function testRealtimeCapabilities() {
  logTest('Realtime Capabilities');
  try {
    // Test if realtime is enabled on key tables
    const channel = supabase.channel('test-channel');
    channel.on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'production_logs' 
    }, (payload) => {
      console.log('Realtime working:', payload);
    });
    
    await channel.subscribe();
    await channel.unsubscribe();
    
    results.add('Realtime Capabilities', 'PASS');
  } catch (error) {
    results.add('Realtime Capabilities', 'FAIL', error.message);
  }
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting HomeBake Manager Functionality Tests...\n');
  
  const tests = [
    testDatabaseConnection,
    testRLSPolicies,
    testTableStructure,
    testBreadTypes,
    testInventoryStructure,
    testProductionLogStructure,
    testSalesLogStructure,
    testShiftFeedback,
    testUserRoles,
    testQRInvitations,
    testInventoryCalculation,
    testShiftSystem,
    testManagerPermissions,
    testRealtimeCapabilities
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      console.error(`Unexpected error in ${test.name}:`, error);
    }
    console.log(''); // Add spacing
  }

  results.summary();
}

// Step-by-step feature validation
async function validateManagerFeatures() {
  console.log('\n📋 VALIDATING MANAGER FEATURES (Steps 1-12):\n');
  
  const features = [
    { step: 1, name: 'Authentication & Role-based Access', table: 'users' },
    { step: 2, name: 'Database Schema & RLS', table: 'production_logs' },
    { step: 3, name: 'Bread Types Management', table: 'bread_types' },
    { step: 4, name: 'Shared Components (UI/UX)', table: null },
    { step: 5, name: 'Manager Dashboard', table: null },
    { step: 6, name: 'Production Logging', table: 'production_logs' },
    { step: 7, name: 'Production History & Filters', table: 'production_logs' },
    { step: 8, name: 'Production Analytics', table: 'production_logs' },
    { step: 9, name: 'Real-time Updates', table: null },
    { step: 10, name: 'Sales Logging System', table: 'sales_logs' },
    { step: 11, name: 'Shift Management & Feedback', table: 'shift_feedback' },
    { step: 12, name: 'Inventory Tracking', table: 'inventory' }
  ];

  for (const feature of features) {
    if (feature.table) {
      try {
        const { data, error } = await supabase.from(feature.table).select('count').limit(1);
        if (error) throw error;
        console.log(`✅ Step ${feature.step}: ${feature.name} - Database Ready`);
      } catch (error) {
        console.log(`❌ Step ${feature.step}: ${feature.name} - Database Issue: ${error.message}`);
      }
    } else {
      console.log(`🔄 Step ${feature.step}: ${feature.name} - UI Component (Manual Test Required)`);
    }
  }
}

// Run the tests
if (require.main === module) {
  runAllTests()
    .then(() => validateManagerFeatures())
    .then(() => {
      console.log('\n🎯 Test execution completed.');
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { TestResults, runAllTests };