-- COMPREHENSIVE INVESTIGATION OF INVENTORY SYSTEM
-- This will help us understand what's really happening with the inventory and bread types

-- ============================================================================
-- STEP 1: Check if there's actually an inventory table
-- ============================================================================

SELECT 'CHECKING INVENTORY TABLE EXISTENCE' as section;

-- Check if inventory table exists
SELECT 
  'Inventory Table Exists' as check_type,
  EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inventory' 
    AND table_schema = 'public'
  ) as table_exists;

-- If it exists, show its structure
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

-- ============================================================================
-- STEP 2: Check what's actually in the inventory table
-- ============================================================================

SELECT 'INVENTORY TABLE CONTENT' as section;

-- Count total records in inventory
SELECT 
  'Total Inventory Records' as check_type,
  COUNT(*) as total_records
FROM inventory;

-- Show all inventory records
SELECT 
  'All Inventory Records' as check_type,
  i.*
FROM inventory i
ORDER BY i.created_at DESC
LIMIT 20;

-- Check which bread types are in inventory
SELECT 
  'Bread Types in Inventory' as check_type,
  bt.name as bread_type_name,
  bt.id as bread_type_id,
  COUNT(i.id) as inventory_records
FROM bread_types bt
LEFT JOIN inventory i ON i.bread_type_id = bt.id
GROUP BY bt.id, bt.name
ORDER BY bt.name;

-- ============================================================================
-- STEP 3: Check the specific bread type you're trying to delete
-- ============================================================================

SELECT 'SPECIFIC BREAD TYPE ANALYSIS' as section;

-- Find the "small bread" - let's check all bread types
SELECT 
  'All Bread Types' as check_type,
  id,
  name,
  size,
  unit_price,
  created_at
FROM bread_types
ORDER BY name;

-- Check which bread types have inventory records
SELECT 
  'Bread Types with Inventory' as check_type,
  bt.name,
  bt.id,
  COUNT(i.id) as inventory_count,
  ARRAY_AGG(i.id) as inventory_ids
FROM bread_types bt
JOIN inventory i ON i.bread_type_id = bt.id
GROUP BY bt.id, bt.name
ORDER BY bt.name;

-- ============================================================================
-- STEP 4: Check production logs vs inventory sync
-- ============================================================================

SELECT 'PRODUCTION TO INVENTORY SYNC CHECK' as section;

-- Check today's production logs
SELECT 
  'Todays Production Logs' as check_type,
  bt.name as bread_type_name,
  pl.quantity,
  pl.shift,
  pl.created_at
FROM production_logs pl
JOIN bread_types bt ON bt.id = pl.bread_type_id
WHERE pl.created_at >= CURRENT_DATE
ORDER BY pl.created_at DESC;

-- Check if production logs create inventory records
SELECT 
  'Production vs Inventory Comparison' as check_type,
  bt.name,
  COALESCE(prod_count.total_produced, 0) as total_produced_today,
  COALESCE(inv_count.inventory_records, 0) as inventory_records
FROM bread_types bt
LEFT JOIN (
  SELECT bread_type_id, SUM(quantity) as total_produced
  FROM production_logs
  WHERE created_at >= CURRENT_DATE
  GROUP BY bread_type_id
) prod_count ON prod_count.bread_type_id = bt.id
LEFT JOIN (
  SELECT bread_type_id, COUNT(*) as inventory_records
  FROM inventory
  GROUP BY bread_type_id
) inv_count ON inv_count.bread_type_id = bt.id
ORDER BY bt.name;

-- ============================================================================
-- STEP 5: Check for triggers or functions that populate inventory
-- ============================================================================

SELECT 'TRIGGERS AND FUNCTIONS CHECK' as section;

-- Check for triggers on production_logs that might create inventory
SELECT 
  'Triggers on Production Logs' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'production_logs';

-- Check for triggers on inventory table
SELECT 
  'Triggers on Inventory' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'inventory';

-- Check for functions that might be creating inventory records
SELECT 
  'Functions with Inventory' as check_type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%inventory%'
AND routine_schema = 'public';

-- ============================================================================
-- STEP 6: Check foreign key constraints
-- ============================================================================

SELECT 'FOREIGN KEY CONSTRAINTS' as section;

-- Show all foreign key constraints involving bread_types
SELECT 
  'All Foreign Keys to Bread Types' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'bread_types'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- STEP 7: Test deletion to see exact error
-- ============================================================================

SELECT 'DELETION TEST PREPARATION' as section;

-- Show which bread types would be safe to delete (no references)
SELECT 
  'Safe to Delete Bread Types' as check_type,
  bt.name,
  bt.id,
  CASE 
    WHEN inv.inventory_count > 0 THEN 'HAS INVENTORY'
    WHEN prod.production_count > 0 THEN 'HAS PRODUCTION'
    WHEN sales.sales_count > 0 THEN 'HAS SALES'
    ELSE 'SAFE TO DELETE'
  END as deletion_status
FROM bread_types bt
LEFT JOIN (
  SELECT bread_type_id, COUNT(*) as inventory_count
  FROM inventory GROUP BY bread_type_id
) inv ON inv.bread_type_id = bt.id
LEFT JOIN (
  SELECT bread_type_id, COUNT(*) as production_count
  FROM production_logs GROUP BY bread_type_id
) prod ON prod.bread_type_id = bt.id
LEFT JOIN (
  SELECT bread_type_id, COUNT(*) as sales_count
  FROM sales_logs GROUP BY bread_type_id
) sales ON sales.bread_type_id = bt.id
ORDER BY bt.name;