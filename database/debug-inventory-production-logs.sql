-- COMPREHENSIVE DEBUG SCRIPT FOR INVENTORY AND PRODUCTION LOGS
-- Run this to understand what's happening with your production data

-- ============================================================================
-- STEP 1: Check current time and timezone
-- ============================================================================

SELECT 'CURRENT TIME AND TIMEZONE CHECK' as section;

SELECT 
  'Server Time Info' as check_type,
  NOW() as server_now,
  CURRENT_DATE as server_date,
  EXTRACT(timezone FROM NOW()) as timezone_offset,
  TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS TZ') as formatted_time;

-- ============================================================================
-- STEP 2: Check all production logs
-- ============================================================================

SELECT 'ALL PRODUCTION LOGS' as section;

-- Count total production logs
SELECT 
  'Total Production Logs' as check_type,
  COUNT(*) as total_count
FROM production_logs;

-- Show all production logs with details
SELECT 
  'All Production Logs Details' as check_type,
  pl.id,
  pl.bread_type_id,
  bt.name as bread_type_name,
  pl.quantity,
  pl.shift,
  pl.recorded_by,
  pl.created_at,
  TO_CHAR(pl.created_at, 'YYYY-MM-DD') as date_only,
  TO_CHAR(pl.created_at, 'HH24:MI:SS') as time_only,
  EXTRACT(EPOCH FROM (NOW() - pl.created_at)) / 3600 as hours_ago
FROM production_logs pl
JOIN bread_types bt ON bt.id = pl.bread_type_id
ORDER BY pl.created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 3: Check today's production logs specifically
-- ============================================================================

SELECT 'TODAYS PRODUCTION LOGS' as section;

-- Today's production with different date formats
SELECT 
  'Todays Production (Method 1)' as check_type,
  COUNT(*) as count,
  COALESCE(SUM(quantity), 0) as total_quantity
FROM production_logs 
WHERE DATE(created_at) = CURRENT_DATE;

SELECT 
  'Todays Production (Method 2)' as check_type,
  COUNT(*) as count,
  COALESCE(SUM(quantity), 0) as total_quantity
FROM production_logs 
WHERE created_at >= CURRENT_DATE 
AND created_at < CURRENT_DATE + INTERVAL '1 day';

-- Show today's production details
SELECT 
  'Todays Production Details' as check_type,
  pl.id,
  bt.name as bread_type_name,
  pl.quantity,
  pl.shift,
  pl.created_at,
  EXTRACT(EPOCH FROM (NOW() - pl.created_at)) / 3600 as hours_ago
FROM production_logs pl
JOIN bread_types bt ON bt.id = pl.bread_type_id
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY pl.created_at DESC;

-- ============================================================================
-- STEP 4: Check what the app's date filter would return
-- ============================================================================

SELECT 'APP DATE FILTER SIMULATION' as section;

-- Simulate the app's date filtering logic
WITH app_date_range AS (
  SELECT 
    CURRENT_DATE::text || 'T00:00:00.000Z' as start_of_day,
    CURRENT_DATE::text || 'T23:59:59.999Z' as end_of_day
)
SELECT 
  'App Date Range' as check_type,
  start_of_day,
  end_of_day
FROM app_date_range;

-- Test the exact query the app uses
WITH app_date_range AS (
  SELECT 
    CURRENT_DATE::text || 'T00:00:00.000Z' as start_of_day,
    CURRENT_DATE::text || 'T23:59:59.999Z' as end_of_day
)
SELECT 
  'App Query Result' as check_type,
  COUNT(*) as count,
  COALESCE(SUM(pl.quantity), 0) as total_quantity
FROM production_logs pl, app_date_range adr
WHERE pl.created_at >= adr.start_of_day::timestamptz
AND pl.created_at <= adr.end_of_day::timestamptz;

-- Show what the app query would return
WITH app_date_range AS (
  SELECT 
    CURRENT_DATE::text || 'T00:00:00.000Z' as start_of_day,
    CURRENT_DATE::text || 'T23:59:59.999Z' as end_of_day
)
SELECT 
  'App Query Details' as check_type,
  pl.id,
  bt.name as bread_type_name,
  pl.quantity,
  pl.shift,
  pl.created_at,
  pl.created_at >= adr.start_of_day::timestamptz as matches_start,
  pl.created_at <= adr.end_of_day::timestamptz as matches_end
FROM production_logs pl, app_date_range adr
JOIN bread_types bt ON bt.id = pl.bread_type_id
ORDER BY pl.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 5: Check bread types and their production
-- ============================================================================

SELECT 'BREAD TYPES AND PRODUCTION SUMMARY' as section;

-- All bread types with their production counts
SELECT 
  'Bread Types Production Summary' as check_type,
  bt.id,
  bt.name,
  bt.unit_price,
  COALESCE(prod_today.quantity_today, 0) as produced_today,
  COALESCE(prod_all.quantity_all_time, 0) as produced_all_time,
  COALESCE(prod_all.last_production, 'Never') as last_production_time
FROM bread_types bt
LEFT JOIN (
  SELECT 
    bread_type_id,
    SUM(quantity) as quantity_today
  FROM production_logs 
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY bread_type_id
) prod_today ON prod_today.bread_type_id = bt.id
LEFT JOIN (
  SELECT 
    bread_type_id,
    SUM(quantity) as quantity_all_time,
    MAX(created_at)::text as last_production
  FROM production_logs 
  GROUP BY bread_type_id
) prod_all ON prod_all.bread_type_id = bt.id
ORDER BY bt.name;

-- ============================================================================
-- STEP 6: Final recommendations
-- ============================================================================

SELECT 'RECOMMENDATIONS' as section;

SELECT 
  'Issue Analysis' as check_type,
  CASE 
    WHEN (SELECT COUNT(*) FROM production_logs) = 0 THEN 
      'NO PRODUCTION LOGS FOUND - Add some production logs first'
    WHEN (SELECT COUNT(*) FROM production_logs WHERE DATE(created_at) = CURRENT_DATE) = 0 THEN 
      'NO PRODUCTION LOGS FOR TODAY - Production logs exist but not for today'
    WHEN (SELECT COUNT(*) FROM bread_types) = 0 THEN 
      'NO BREAD TYPES FOUND - Add bread types first'
    ELSE 
      'DATA EXISTS - Check app console for detailed logs'
  END as diagnosis,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM production_logs WHERE DATE(created_at) = CURRENT_DATE) = 0 THEN 
      'Add production logs for today or modify app to show all-time inventory'
    ELSE 
      'Check browser console for detailed debugging information'
  END as recommendation;