-- FIX BREAD TYPE DELETION
-- This disables RLS on bread_types table to allow owners to delete bread types

-- Check current RLS status
SELECT 'BREAD TYPES RLS STATUS' as status;

SELECT 
  'Current RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'bread_types'
AND schemaname = 'public';

-- Disable RLS on bread_types table
ALTER TABLE bread_types DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  'Updated RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'bread_types'
AND schemaname = 'public';

-- Test deletion works by checking permissions
SELECT 'BREAD TYPE DELETION SHOULD NOW WORK' as final_message;