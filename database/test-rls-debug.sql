-- DEBUG SCRIPT TO TEST RLS POLICIES
-- Run this in Supabase SQL Editor while logged in as a manager

-- Test 1: Check current user and role
SELECT 
  'Current User Info' as test_name,
  auth.uid() as current_user_id,
  get_user_role_safe() as current_role,
  auth.role() as auth_role;

-- Test 2: Check if user exists in users table
SELECT 
  'User in Database' as test_name,
  u.id,
  u.email,
  u.name,
  u.role
FROM users u 
WHERE u.id = auth.uid();

-- Test 3: Test production log insert directly
-- Replace 'YOUR_BREAD_TYPE_ID' with an actual bread type ID from your database
SELECT 
  'Bread Types Available' as test_name,
  id,
  name
FROM bread_types 
LIMIT 5;

-- Test 4: Try to insert a production log (this will show the exact RLS error)
-- UNCOMMENT and replace the bread_type_id with a real one from the query above
/*
INSERT INTO production_logs (
  bread_type_id,
  quantity,
  shift,
  recorded_by
) VALUES (
  'YOUR_BREAD_TYPE_ID_HERE', -- Replace with real bread type ID
  10,
  'morning',
  auth.uid()
);
*/

-- Test 5: Check RLS policies on production_logs table
SELECT 
  'Production Log Policies' as test_name,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'production_logs'
ORDER BY policyname;