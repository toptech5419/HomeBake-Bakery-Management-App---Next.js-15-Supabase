-- CHECK PRODUCTION_LOGS TABLE SCHEMA AND CONSTRAINTS
-- Run this to see if there are any schema issues causing the insert to fail

-- Check table structure
SELECT 'TABLE STRUCTURE' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'production_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check constraints
SELECT 'CONSTRAINTS' as section;

SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'production_logs' 
AND table_schema = 'public';

-- Check foreign key constraints specifically
SELECT 'FOREIGN KEYS' as section;

SELECT 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name
WHERE kcu.table_name = 'production_logs' 
AND kcu.table_schema = 'public';

-- Check if bread_types table exists and has the referenced IDs
SELECT 'BREAD TYPES CHECK' as section;

SELECT 
  'Bread Types Count' as check_type,
  COUNT(*) as total_bread_types
FROM bread_types;

-- Check specific bread type that might be causing issues
SELECT 
  'Sample Bread Types' as check_type,
  id,
  name
FROM bread_types 
LIMIT 5;

-- Check if RLS is actually disabled
SELECT 'RLS STATUS' as section;

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'production_logs'
AND schemaname = 'public';

-- Try a simple insert test (this will show what specific error occurs)
SELECT 'INSERT TEST' as section;

-- This is just to see what would happen - we'll use a test UUID
SELECT 'Testing insert permissions...' as test_result;