-- Detailed debug script to see exactly why low stock count is 0
-- This will show step-by-step what the triggers are finding

-- Step 1: Check what batches exist for today
SELECT '=== STEP 1: Batches for today ===' as debug_step;
SELECT 
  bt.name as bread_name,
  b.actual_quantity as produced,
  b.shift,
  b.status,
  b.created_at,
  DATE(b.created_at AT TIME ZONE 'Africa/Lagos') as lagos_date,
  CURRENT_DATE as current_date,
  DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE as is_today
FROM batches b
JOIN bread_types bt ON bt.id = b.bread_type_id
ORDER BY b.created_at DESC;

-- Step 2: Check all_batches for today
SELECT '=== STEP 2: All_batches for today ===' as debug_step;
SELECT 
  bt.name as bread_name,
  ab.actual_quantity as produced,
  ab.shift,
  ab.status,
  ab.created_at,
  DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') as lagos_date,
  CURRENT_DATE as current_date,
  DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE as is_today
FROM all_batches ab
JOIN bread_types bt ON bt.id = ab.bread_type_id
WHERE DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
ORDER BY ab.created_at DESC;

-- Step 3: Check sales for today
SELECT '=== STEP 3: Sales for today ===' as debug_step;
SELECT 
  bt.name as bread_name,
  sl.quantity as sold,
  sl.shift,
  sl.created_at,
  DATE(sl.created_at AT TIME ZONE 'Africa/Lagos') as lagos_date
FROM sales_logs sl
JOIN bread_types bt ON bt.id = sl.bread_type_id
WHERE DATE(sl.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
ORDER BY sl.created_at DESC;

-- Step 4: Check current time and shift logic
SELECT '=== STEP 4: Current time and shift ===' as debug_step;
SELECT 
  now() as utc_now,
  timezone('Africa/Lagos', now()) as nigeria_now,
  EXTRACT(hour FROM timezone('Africa/Lagos', now())) as nigeria_hour,
  CASE 
    WHEN EXTRACT(hour FROM timezone('Africa/Lagos', now())) >= 10 AND EXTRACT(hour FROM timezone('Africa/Lagos', now())) < 22 
    THEN 'morning' 
    ELSE 'night' 
  END as current_shift;

-- Step 5: Manual calculation for morning shift (matching the trigger logic)
SELECT '=== STEP 5: Manual morning calculation ===' as debug_step;
SELECT 
  bt.name as bread_name,
  morning_calc.produced,
  morning_calc.sold,
  morning_calc.available,
  CASE WHEN morning_calc.available > 0 AND morning_calc.available <= 5 THEN '🔴 LOW STOCK' ELSE '✅ OK' END as status
FROM (
  SELECT 
    b.bread_type_id,
    bt.name,
    b.actual_quantity as produced,
    COALESCE(s.sold, 0) as sold,
    GREATEST(0, b.actual_quantity - COALESCE(s.sold, 0)) as available
  FROM batches b
  JOIN bread_types bt ON bt.id = b.bread_type_id
  LEFT JOIN (
    SELECT 
      bread_type_id,
      SUM(quantity) as sold
    FROM sales_logs 
    WHERE shift = 'morning' 
      AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    GROUP BY bread_type_id
  ) s ON s.bread_type_id = b.bread_type_id
  WHERE b.shift = 'morning'
    AND DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    AND b.status IN ('active', 'completed')
  
  UNION
  
  SELECT 
    ab.bread_type_id,
    bt.name,
    ab.actual_quantity as produced,
    COALESCE(s.sold, 0) as sold,
    GREATEST(0, ab.actual_quantity - COALESCE(s.sold, 0)) as available
  FROM all_batches ab
  JOIN bread_types bt ON bt.id = ab.bread_type_id
  LEFT JOIN (
    SELECT 
      bread_type_id,
      SUM(quantity) as sold
    FROM sales_logs 
    WHERE shift = 'morning' 
      AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    GROUP BY bread_type_id
  ) s ON s.bread_type_id = ab.bread_type_id
  WHERE ab.shift = 'morning'
    AND DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    AND ab.status IN ('active', 'completed')
) morning_calc
JOIN bread_types bt ON bt.id = morning_calc.bread_type_id
ORDER BY morning_calc.available;

-- Step 6: Manual calculation for night shift (matching the trigger logic)
SELECT '=== STEP 6: Manual night calculation ===' as debug_step;
SELECT 
  bt.name as bread_name,
  night_calc.produced,
  night_calc.sold,
  night_calc.available,
  CASE WHEN night_calc.available > 0 AND night_calc.available <= 5 THEN '🔴 LOW STOCK' ELSE '✅ OK' END as status
FROM (
  SELECT 
    b.bread_type_id,
    bt.name,
    b.actual_quantity as produced,
    COALESCE(s.sold, 0) as sold,
    GREATEST(0, b.actual_quantity - COALESCE(s.sold, 0)) as available
  FROM batches b
  JOIN bread_types bt ON bt.id = b.bread_type_id
  LEFT JOIN (
    SELECT 
      bread_type_id,
      SUM(quantity) as sold
    FROM sales_logs 
    WHERE shift = 'night' 
      AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    GROUP BY bread_type_id
  ) s ON s.bread_type_id = b.bread_type_id
  WHERE b.shift = 'night'
    AND DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    AND b.status IN ('active', 'completed')
  
  UNION
  
  SELECT 
    ab.bread_type_id,
    bt.name,
    ab.actual_quantity as produced,
    COALESCE(s.sold, 0) as sold,
    GREATEST(0, ab.actual_quantity - COALESCE(s.sold, 0)) as available
  FROM all_batches ab
  JOIN bread_types bt ON bt.id = ab.bread_type_id
  LEFT JOIN (
    SELECT 
      bread_type_id,
      SUM(quantity) as sold
    FROM sales_logs 
    WHERE shift = 'night' 
      AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    GROUP BY bread_type_id
  ) s ON s.bread_type_id = ab.bread_type_id
  WHERE ab.shift = 'night'
    AND DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    AND ab.status IN ('active', 'completed')
) night_calc
JOIN bread_types bt ON bt.id = night_calc.bread_type_id
ORDER BY night_calc.available;

-- Step 7: Count low stock items manually
SELECT '=== STEP 7: Manual low stock counts ===' as debug_step;
SELECT 
  'Morning low stock count:' as shift,
  COUNT(*) as count
FROM (
  SELECT 
    b.bread_type_id,
    b.actual_quantity as produced,
    COALESCE(s.sold, 0) as sold,
    GREATEST(0, b.actual_quantity - COALESCE(s.sold, 0)) as available
  FROM batches b
  LEFT JOIN (
    SELECT 
      bread_type_id,
      SUM(quantity) as sold
    FROM sales_logs 
    WHERE shift = 'morning' 
      AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    GROUP BY bread_type_id
  ) s ON s.bread_type_id = b.bread_type_id
  WHERE b.shift = 'morning'
    AND DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    AND b.status IN ('active', 'completed')
  
  UNION
  
  SELECT 
    ab.bread_type_id,
    ab.actual_quantity as produced,
    COALESCE(s.sold, 0) as sold,
    GREATEST(0, ab.actual_quantity - COALESCE(s.sold, 0)) as available
  FROM all_batches ab
  LEFT JOIN (
    SELECT 
      bread_type_id,
      SUM(quantity) as sold
    FROM sales_logs 
    WHERE shift = 'morning' 
      AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    GROUP BY bread_type_id
  ) s ON s.bread_type_id = ab.bread_type_id
  WHERE ab.shift = 'morning'
    AND DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    AND ab.status IN ('active', 'completed')
) morning_calc
WHERE available > 0 AND available <= 5

UNION ALL

SELECT 
  'Night low stock count:' as shift,
  COUNT(*) as count
FROM (
  SELECT 
    b.bread_type_id,
    b.actual_quantity as produced,
    COALESCE(s.sold, 0) as sold,
    GREATEST(0, b.actual_quantity - COALESCE(s.sold, 0)) as available
  FROM batches b
  LEFT JOIN (
    SELECT 
      bread_type_id,
      SUM(quantity) as sold
    FROM sales_logs 
    WHERE shift = 'night' 
      AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    GROUP BY bread_type_id
  ) s ON s.bread_type_id = b.bread_type_id
  WHERE b.shift = 'night'
    AND DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    AND b.status IN ('active', 'completed')
  
  UNION
  
  SELECT 
    ab.bread_type_id,
    ab.actual_quantity as produced,
    COALESCE(s.sold, 0) as sold,
    GREATEST(0, ab.actual_quantity - COALESCE(s.sold, 0)) as available
  FROM all_batches ab
  LEFT JOIN (
    SELECT 
      bread_type_id,
      SUM(quantity) as sold
    FROM sales_logs 
    WHERE shift = 'night' 
      AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    GROUP BY bread_type_id
  ) s ON s.bread_type_id = ab.bread_type_id
  WHERE ab.shift = 'night'
    AND DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE
    AND ab.status IN ('active', 'completed')
) night_calc
WHERE available > 0 AND available <= 5;