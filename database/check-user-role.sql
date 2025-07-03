-- CHECK SPECIFIC USER ROLE AND RLS ISSUE
-- Run this in Supabase SQL Editor while logged in as the manager

-- Test 1: Check if this specific user exists
SELECT 
  'Specific User Check' as test_name,
  u.id,
  u.email,
  u.name,
  u.role,
  u.is_active,
  u.created_at
FROM users u 
WHERE u.id = 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9';

-- Test 2: Check current authenticated user
SELECT 
  'Current Auth User' as test_name,
  auth.uid() as current_user_id,
  get_user_role_safe() as current_role,
  auth.role() as auth_role;

-- Test 3: Check if current user matches the manager ID
SELECT 
  'User ID Match' as test_name,
  auth.uid() = 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9' as ids_match,
  auth.uid() as auth_uid,
  'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9' as manager_id;

-- Test 4: Test the RLS function directly
SELECT 
  'RLS Function Test' as test_name,
  get_user_role_safe() as role_function_result;

-- Test 5: Check production log insert policies
SELECT 
  'Production Insert Policies' as test_name,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'production_logs' 
AND cmd = 'INSERT'
ORDER BY policyname;

-- Test 6: Try a simple insert test (this will show the exact error)
-- ONLY RUN THIS IF YOU WANT TO TEST THE INSERT
/*
INSERT INTO production_logs (
  bread_type_id,
  quantity,
  shift,
  recorded_by
) VALUES (
  'a099d317-733c-48c4-8cab-8a7a7c1c119c', -- Use the bread type ID from your logs
  10,
  'morning',
  auth.uid()
);
*/