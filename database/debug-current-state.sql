-- DEBUG SCRIPT TO CHECK CURRENT STATE AFTER RUNNING THE FIX
-- Run this to see what's happening with authentication

-- ============================================================================
-- Check if the function exists and works
-- ============================================================================
SELECT 'FUNCTION CHECK' as section;

-- Check if get_user_role_safe exists
SELECT 
  'Function Exists' as check_type,
  COUNT(*) as function_count
FROM pg_proc 
WHERE proname = 'get_user_role_safe';

-- Test the function
SELECT 
  'Function Test' as check_type,
  get_user_role_safe() as role_result;

-- ============================================================================
-- Check current authentication state
-- ============================================================================
SELECT 'AUTHENTICATION STATE' as section;

SELECT 
  'Current Auth Info' as check_type,
  auth.uid() as auth_uid,
  auth.email() as auth_email,
  auth.role() as auth_role;

-- ============================================================================
-- Check if user exists in custom users table
-- ============================================================================
SELECT 'USER TABLE CHECK' as section;

-- Check current user in users table
SELECT 
  'Current User in Custom Table' as check_type,
  u.id,
  u.email,
  u.role,
  CASE 
    WHEN u.id = auth.uid() THEN 'MATCH'
    ELSE 'NO MATCH'
  END as auth_match
FROM users u
WHERE u.id = auth.uid()
LIMIT 1;

-- Check the specific manager
SELECT 
  'Manager f45d8ffb exists' as check_type,
  u.id,
  u.email,
  u.role
FROM users u
WHERE u.id = 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9'
LIMIT 1;

-- Check all users with manager role
SELECT 
  'All Managers' as check_type,
  u.id,
  u.email,
  u.role
FROM users u
WHERE u.role = 'manager';

-- ============================================================================
-- Check RLS policies for production_logs
-- ============================================================================
SELECT 'RLS POLICIES CHECK' as section;

SELECT 
  'Production Logs Policies' as check_type,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'production_logs'
ORDER BY policyname;

-- ============================================================================
-- Test the debug function if it exists
-- ============================================================================
SELECT 'DEBUG FUNCTION TEST' as section;

SELECT * FROM debug_production_auth();

-- ============================================================================
-- Check Supabase Auth users with manager emails
-- ============================================================================
SELECT 'SUPABASE AUTH USERS' as section;

SELECT 
  'Manager Email Users' as check_type,
  id,
  email,
  created_at
FROM auth.users
WHERE email LIKE 'manager-%@homebake.local'
ORDER BY created_at DESC;

-- ============================================================================
-- Final diagnosis
-- ============================================================================
SELECT 'DIAGNOSIS' as section;

SELECT 
  'Auth Diagnosis' as check_type,
  CASE 
    WHEN auth.uid() IS NULL THEN 'NO AUTH UID - NOT AUTHENTICATED'
    WHEN NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) THEN 'AUTH UID NOT IN CUSTOM USERS TABLE'
    WHEN get_user_role_safe() = 'sales_rep' THEN 'ROLE DEFAULTING TO SALES_REP'
    WHEN get_user_role_safe() IN ('manager', 'owner') THEN 'ROLE IS CORRECT - CHECK POLICIES'
    ELSE 'UNKNOWN ISSUE'
  END as diagnosis;