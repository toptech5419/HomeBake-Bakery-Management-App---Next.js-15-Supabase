-- COMPREHENSIVE FIX FOR BREAD TYPE DELETION WITH INVENTORY CONSTRAINTS
-- This provides multiple solutions for handling the inventory foreign key constraint

-- ============================================================================
-- STEP 1: Analyze the current constraint situation
-- ============================================================================

SELECT 'ANALYZING CURRENT CONSTRAINTS' as status;

-- Check the specific bread type that's causing issues
SELECT 
  'Problematic Bread Type' as check_type,
  bt.id,
  bt.name,
  bt.unit_price
FROM bread_types bt
WHERE bt.id = 'f3a341a7-791e-432d-b506-40b99241b60b';

-- Check what's in the inventory table for this bread type
SELECT 
  'Inventory Records for This Bread Type' as check_type,
  COUNT(*) as inventory_count
FROM inventory 
WHERE bread_type_id = 'f3a341a7-791e-432d-b506-40b99241b60b';

-- Show the foreign key constraint details
SELECT 
  'Foreign Key Constraint Details' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.constraint_name LIKE '%inventory%bread_type%';

-- ============================================================================
-- STEP 2: SOLUTION OPTION 1 - Clear inventory records for the bread type
-- ============================================================================

SELECT 'SOLUTION 1: CLEAR INVENTORY RECORDS' as status;

-- First, let's see what inventory records exist
SELECT 
  'Current Inventory Records' as check_type,
  i.*
FROM inventory i
WHERE i.bread_type_id = 'f3a341a7-791e-432d-b506-40b99241b60b';

-- Clear the inventory records for this bread type
-- UNCOMMENT THE NEXT LINE TO EXECUTE:
-- DELETE FROM inventory WHERE bread_type_id = 'f3a341a7-791e-432d-b506-40b99241b60b';

-- ============================================================================
-- STEP 3: SOLUTION OPTION 2 - Modify the foreign key constraint
-- ============================================================================

SELECT 'SOLUTION 2: MODIFY CONSTRAINT TO CASCADE' as status;

-- Drop the existing constraint and recreate with CASCADE
-- This will automatically delete inventory records when bread type is deleted

-- First, find the exact constraint name
SELECT 
  'Finding Constraint Name' as check_type,
  constraint_name
FROM information_schema.table_constraints 
WHERE table_name = 'inventory' 
AND constraint_type = 'FOREIGN KEY'
AND constraint_name LIKE '%bread_type%';

-- UNCOMMENT THE FOLLOWING LINES TO MODIFY THE CONSTRAINT:
-- ALTER TABLE inventory DROP CONSTRAINT inventory_bread_type_id_fkey;
-- ALTER TABLE inventory ADD CONSTRAINT inventory_bread_type_id_fkey 
--   FOREIGN KEY (bread_type_id) REFERENCES bread_types(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: SOLUTION OPTION 3 - Safe deletion with inventory cleanup
-- ============================================================================

SELECT 'SOLUTION 3: SAFE DELETION WITH CLEANUP' as status;

-- Create a function to safely delete bread types with inventory cleanup
CREATE OR REPLACE FUNCTION safe_delete_bread_type(bread_type_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  bread_type_name TEXT;
  inventory_count INTEGER;
  production_count INTEGER;
  sales_count INTEGER;
BEGIN
  -- Get bread type info
  SELECT name INTO bread_type_name 
  FROM bread_types 
  WHERE id = bread_type_id_param;
  
  IF bread_type_name IS NULL THEN
    RAISE EXCEPTION 'Bread type not found';
  END IF;
  
  -- Count related records
  SELECT COUNT(*) INTO inventory_count FROM inventory WHERE bread_type_id = bread_type_id_param;
  SELECT COUNT(*) INTO production_count FROM production_logs WHERE bread_type_id = bread_type_id_param;
  SELECT COUNT(*) INTO sales_count FROM sales_logs WHERE bread_type_id = bread_type_id_param;
  
  -- Log what we're about to do
  RAISE NOTICE 'Deleting bread type: % (ID: %)', bread_type_name, bread_type_id_param;
  RAISE NOTICE 'This will affect: % inventory records, % production records, % sales records', 
    inventory_count, production_count, sales_count;
  
  -- Delete inventory records first (if any)
  IF inventory_count > 0 THEN
    DELETE FROM inventory WHERE bread_type_id = bread_type_id_param;
    RAISE NOTICE 'Deleted % inventory records', inventory_count;
  END IF;
  
  -- Now delete the bread type
  DELETE FROM bread_types WHERE id = bread_type_id_param;
  
  RAISE NOTICE 'Successfully deleted bread type: %', bread_type_name;
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete bread type: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant permission to use this function
GRANT EXECUTE ON FUNCTION safe_delete_bread_type(UUID) TO authenticated;

-- ============================================================================
-- STEP 5: TEST THE SAFE DELETION FUNCTION
-- ============================================================================

SELECT 'TESTING SAFE DELETION' as status;

-- Test the function (UNCOMMENT TO EXECUTE):
-- SELECT safe_delete_bread_type('f3a341a7-791e-432d-b506-40b99241b60b');

-- ============================================================================
-- STEP 6: RECOMMENDED SOLUTION - Use Option 1 (Clear inventory first)
-- ============================================================================

SELECT 'RECOMMENDED SOLUTION' as status;

-- For immediate fix, clear the inventory records for this specific bread type
DELETE FROM inventory WHERE bread_type_id = 'f3a341a7-791e-432d-b506-40b99241b60b';

-- Verify the records are cleared
SELECT 
  'Verification' as check_type,
  COUNT(*) as remaining_inventory_records
FROM inventory 
WHERE bread_type_id = 'f3a341a7-791e-432d-b506-40b99241b60b';

SELECT 'BREAD TYPE DELETION SHOULD NOW WORK - TRY DELETING FROM THE UI' as final_message;