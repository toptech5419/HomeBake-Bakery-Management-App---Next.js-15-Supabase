-- Test script to verify low stock tracking system is working
-- Run this to test if the database triggers are functioning properly

-- Step 1: Check current state
SELECT 'Current daily low stock counts:' as test_step;
SELECT * FROM daily_low_stock_counts WHERE count_date = CURRENT_DATE;

-- Step 2: Check available stock that should be counted as low stock
SELECT 'Items that should count as low stock (quantity <= 5 and > 0):' as test_step;
SELECT 
  ast.bread_type_name,
  ast.quantity,
  CASE WHEN ast.quantity <= 5 AND ast.quantity > 0 THEN 'LOW STOCK' ELSE 'OK' END as status
FROM available_stock ast
WHERE ast.quantity <= 5 AND ast.quantity > 0
ORDER BY ast.quantity;

-- Step 3: Check if there's any production activity for today
SELECT 'Production activity for today:' as test_step;
SELECT 
  'batches' as source,
  shift,
  COUNT(*) as count
FROM batches 
WHERE DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
GROUP BY shift
UNION
SELECT 
  'all_batches' as source,
  shift,
  COUNT(*) as count
FROM all_batches 
WHERE DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
GROUP BY shift;

-- Step 4: Manually trigger the auto update function
SELECT 'Manually triggering auto update...' as test_step;
SELECT auto_update_low_stock_counts();

-- Step 5: Check the result after manual trigger
SELECT 'Updated daily low stock counts:' as test_step;
SELECT * FROM daily_low_stock_counts WHERE count_date = CURRENT_DATE;

-- Step 6: Force a refresh to see real-time calculation
SELECT 'Force refresh result:' as test_step;
SELECT * FROM refresh_low_stock_counts_now();