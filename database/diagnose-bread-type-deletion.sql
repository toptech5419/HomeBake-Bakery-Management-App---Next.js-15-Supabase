-- DIAGNOSE BREAD TYPE DELETION ISSUE
-- This script will help us understand the foreign key constraints and inventory table

-- ============================================================================
-- STEP 1: Check all foreign key constraints on bread_types table
-- ============================================================================

SELECT 'FOREIGN KEY CONSTRAINTS ON BREAD_TYPES' as section;

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (ccu.table_name = 'bread_types' OR tc.table_name = 'bread_types')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- STEP 2: Check inventory table structure and data
-- ============================================================================

SELECT 'INVENTORY TABLE ANALYSIS' as section;

-- Check if inventory table exists and its structure
SELECT 
  'Inventory Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'inventory' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check how many records are in inventory table
SELECT 
  'Inventory Records Count' as check_type,
  COUNT(*) as total_records
FROM inventory;

-- Check which bread types are referenced in inventory
SELECT 
  'Bread Types in Inventory' as check_type,
  bt.name as bread_type_name,
  COUNT(i.id) as inventory_records
FROM inventory i
JOIN bread_types bt ON i.bread_type_id = bt.id
GROUP BY bt.id, bt.name
ORDER BY bt.name;

-- Check the specific bread type that failed to delete
SELECT 
  'Specific Bread Type Analysis' as check_type,
  bt.name,
  bt.id,
  COUNT(i.id) as inventory_count
FROM bread_types bt
LEFT JOIN inventory i ON i.bread_type_id = bt.id
WHERE bt.id = 'f3a341a7-791e-432d-b506-40b99241b60b'
GROUP BY bt.id, bt.name;

-- ============================================================================
-- STEP 3: Check all tables that reference bread_types
-- ============================================================================

SELECT 'ALL TABLES REFERENCING BREAD_TYPES' as section;

SELECT 
  'Tables with bread_type_id' as check_type,
  table_name,
  column_name
FROM information_schema.columns 
WHERE column_name = 'bread_type_id'
AND table_schema = 'public'
ORDER BY table_name;

-- Check production_logs references
SELECT 
  'Production Logs Count' as check_type,
  bt.name,
  COUNT(pl.id) as production_count
FROM bread_types bt
LEFT JOIN production_logs pl ON pl.bread_type_id = bt.id
WHERE bt.id = 'f3a341a7-791e-432d-b506-40b99241b60b'
GROUP BY bt.id, bt.name;

-- Check sales_logs references
SELECT 
  'Sales Logs Count' as check_type,
  bt.name,
  COUNT(sl.id) as sales_count
FROM bread_types bt
LEFT JOIN sales_logs sl ON sl.bread_type_id = bt.id
WHERE bt.id = 'f3a341a7-791e-432d-b506-40b99241b60b'
GROUP BY bt.id, bt.name;

-- ============================================================================
-- STEP 4: Show constraint details
-- ============================================================================

SELECT 'CONSTRAINT DETAILS' as section;

SELECT 
  'Foreign Key Constraint Details' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'bread_types'
ORDER BY tc.table_name;