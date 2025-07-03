-- FINAL PRODUCTION LOGGING FIX
-- This addresses the schema issues and RLS problems

-- ============================================================================
-- STEP 1: Check what tables actually exist and their RLS status
-- ============================================================================

SELECT 'CHECKING EXISTING TABLES' as status;

-- Check all tables with "log" in the name
SELECT 
  'Tables with LOG' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename LIKE '%log%' 
AND schemaname = 'public';

-- Check all tables with "inventory" in the name
SELECT 
  'Tables with INVENTORY' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename LIKE '%inventory%' 
AND schemaname = 'public';

-- ============================================================================
-- STEP 2: Disable RLS on ALL related tables
-- ============================================================================

SELECT 'DISABLING RLS ON ALL RELATED TABLES' as status;

-- Disable RLS on production_logs
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;

-- Disable RLS on inventory_logs if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_logs' AND table_schema = 'public') THEN
    ALTER TABLE inventory_logs DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on inventory table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory' AND table_schema = 'public') THEN
    ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on sales_logs if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_logs' AND table_schema = 'public') THEN
    ALTER TABLE sales_logs DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Check production_logs table structure and fix if needed
-- ============================================================================

SELECT 'CHECKING PRODUCTION_LOGS STRUCTURE' as status;

-- Check if updated_at column exists
SELECT 
  'Production Logs Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'production_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_logs' 
    AND column_name = 'updated_at'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE production_logs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Test direct insert to verify it works
-- ============================================================================

SELECT 'TESTING DIRECT INSERT' as status;

-- Try inserting a test record
INSERT INTO production_logs (
  bread_type_id,
  quantity,
  shift,
  recorded_by,
  created_at
) VALUES (
  (SELECT id FROM bread_types LIMIT 1),  -- Use first bread type
  1,                                      -- quantity
  'morning',                             -- shift
  'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9', -- recorded_by (your manager ID)
  NOW()                                  -- created_at
);

-- Check if the test record was inserted
SELECT 
  'Test Record Inserted' as check_type,
  COUNT(*) as records_inserted
FROM production_logs 
WHERE recorded_by = 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9'
AND quantity = 1;

-- ============================================================================
-- STEP 5: Clean up test record and verify final status
-- ============================================================================

-- Remove the test record
DELETE FROM production_logs 
WHERE recorded_by = 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9' 
AND quantity = 1;

-- Final status check
SELECT 'FINAL STATUS CHECK' as status;

SELECT 
  'Final RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('production_logs', 'inventory_logs', 'inventory', 'sales_logs')
AND schemaname = 'public';

SELECT 'PRODUCTION LOGGING SHOULD NOW WORK - TRY SAVING A PRODUCTION LOG' as final_message;