-- COMPREHENSIVE DEBUG SCRIPT FOR 403 ERRORS
-- Run this in your Supabase SQL Editor to diagnose the authentication issue

-- ============================================================================
-- STEP 1: Check current authentication state
-- ============================================================================
SELECT 'AUTHENTICATION STATE' as debug_section;

SELECT 
  'Current User Info' as check_type,
  auth.uid() as auth_uid,
  auth.role() as auth_role,
  auth.email() as auth_email;

-- Check if user exists in custom users table
SELECT 
  'Custom Users Table Check' as check_type,
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at
FROM users u
WHERE u.id = auth.uid()
LIMIT 1;

-- Check if there are any users in the table at all
SELECT 
  'Total Users in Custom Table' as check_type,
  COUNT(*) as total_users
FROM users;

-- ============================================================================
-- STEP 2: Check RLS function
-- ============================================================================
SELECT 'RLS FUNCTION CHECK' as debug_section;

-- Test the RLS function
SELECT 
  'RLS Function Test' as check_type,
  get_user_role_safe() as role_result;

-- Check if function exists
SELECT 
  'Function Exists Check' as check_type,
  COUNT(*) as function_count
FROM pg_proc 
WHERE proname = 'get_user_role_safe';

-- ============================================================================
-- STEP 3: Check RLS policies for production_logs
-- ============================================================================
SELECT 'RLS POLICIES CHECK' as debug_section;

-- Check production_logs policies
SELECT 
  'Production Logs Policies' as check_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'production_logs'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('production_logs', 'users', 'bread_types')
AND schemaname = 'public';

-- ============================================================================
-- STEP 4: Test specific operations
-- ============================================================================
SELECT 'OPERATION TESTS' as debug_section;

-- Test if we can select from production_logs
SELECT 
  'Can Select Production Logs' as check_type,
  COUNT(*) as record_count
FROM production_logs
LIMIT 1;

-- Test if we can select from users table
SELECT 
  'Can Select Users' as check_type,
  COUNT(*) as record_count
FROM users
LIMIT 1;

-- ============================================================================
-- STEP 5: Check specific manager user
-- ============================================================================
SELECT 'MANAGER USER CHECK' as debug_section;

-- Check if the specific manager exists (replace with actual manager ID)
SELECT 
  'Specific Manager Check' as check_type,
  u.id,
  u.email,
  u.role,
  CASE 
    WHEN u.id = auth.uid() THEN 'CURRENT USER'
    ELSE 'DIFFERENT USER'
  END as auth_match
FROM users u
WHERE u.id = 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9'
LIMIT 1;

-- ============================================================================
-- STEP 6: Test production log insertion (simulation)
-- ============================================================================
SELECT 'INSERTION TEST' as debug_section;

-- Check what would happen if we tried to insert
SELECT 
  'Insert Permission Check' as check_type,
  auth.uid() as current_auth_uid,
  get_user_role_safe() as current_role,
  CASE 
    WHEN auth.uid() IS NULL THEN 'NO AUTH UID - AUTHENTICATION REQUIRED'
    WHEN get_user_role_safe() NOT IN ('manager', 'owner') THEN 'INSUFFICIENT ROLE'
    ELSE 'SHOULD BE ALLOWED'
  END as insert_status;

-- ============================================================================
-- STEP 7: Check Supabase Auth users (if accessible)
-- ============================================================================
SELECT 'SUPABASE AUTH CHECK' as debug_section;

-- This might not work depending on permissions, but worth trying
SELECT 
  'Auth Users Count' as check_type,
  COUNT(*) as supabase_auth_users
FROM auth.users
WHERE email LIKE '%@homebake.local';

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
SELECT 'SUMMARY' as debug_section;

SELECT 
  'Final Diagnosis' as check_type,
  CASE 
    WHEN auth.uid() IS NULL THEN 'ISSUE: No authenticated user (auth.uid() is NULL)'
    WHEN get_user_role_safe() = 'sales_rep' THEN 'ISSUE: User has sales_rep role, needs manager/owner'
    WHEN NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) THEN 'ISSUE: Authenticated user not in custom users table'
    ELSE 'AUTH LOOKS OK - CHECK SPECIFIC POLICIES'
  END as diagnosis;