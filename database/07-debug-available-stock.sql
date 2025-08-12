-- Debug script to check what's in available_stock vs performance page data
-- This will help us understand the disconnect

-- Check 1: What's in available_stock table?
SELECT 'Available Stock Table Contents:' as debug_step;
SELECT 
  bread_type_name,
  quantity,
  CASE 
    WHEN quantity <= 5 AND quantity > 0 THEN '🔴 LOW STOCK' 
    WHEN quantity = 0 THEN '⚫ OUT OF STOCK'
    ELSE '✅ OK' 
  END as status
FROM available_stock 
ORDER BY quantity;

-- Check 2: What bread types exist?
SELECT 'All Bread Types:' as debug_step;
SELECT id, name, unit_price FROM bread_types ORDER BY name;

-- Check 3: Check batches data for today (this is what performance pages show)
SELECT 'Todays Batches (Performance Page Data):' as debug_step;
SELECT 
  bt.name as bread_name,
  b.actual_quantity as produced,
  b.shift,
  b.batch_number,
  bt.unit_price,
  b.created_at
FROM batches b
JOIN bread_types bt ON bt.id = b.bread_type_id
WHERE DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
ORDER BY b.shift, bt.name;

-- Check 4: Check if available_stock is linked to bread_types properly
SELECT 'Available Stock with Bread Type Details:' as debug_step;
SELECT 
  ast.bread_type_name,
  ast.quantity,
  bt.name as bread_type_table_name,
  bt.unit_price
FROM available_stock ast
LEFT JOIN bread_types bt ON bt.id = ast.bread_type_id
ORDER BY ast.quantity;

-- Check 5: Manual calculation of what SHOULD be low stock based on available_stock
SELECT 'Manual Low Stock Calculation:' as debug_step;
SELECT 
  COUNT(*) as should_be_low_stock_count,
  ARRAY_AGG(bread_type_name || ' (' || quantity || ')') as low_stock_items
FROM available_stock 
WHERE quantity > 0 AND quantity <= 5;

-- Check 6: Check all_batches for today (backup data)
SELECT 'All_Batches for Today:' as debug_step;
SELECT 
  bt.name as bread_name,
  ab.actual_quantity as produced,
  ab.shift,
  ab.batch_number,
  bt.unit_price,
  ab.created_at
FROM all_batches ab
JOIN bread_types bt ON bt.id = ab.bread_type_id
WHERE DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
ORDER BY ab.shift, bt.name;