-- SIMPLE INVENTORY DEBUG SCRIPT
-- This will help identify why production logs aren't showing in inventory

-- ============================================================================
-- STEP 1: Check current time
-- ============================================================================

SELECT 'CURRENT TIME CHECK' as section;

SELECT 
  'Server Time' as info,
  NOW() as server_time,
  CURRENT_DATE as server_date,
  TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS TZ') as formatted_time;

-- ============================================================================
-- STEP 2: Count all data
-- ============================================================================

SELECT 'DATA COUNTS' as section;

SELECT 'Total Bread Types' as info, COUNT(*) as count FROM bread_types;
SELECT 'Total Production Logs' as info, COUNT(*) as count FROM production_logs;
SELECT 'Total Sales Logs' as info, COUNT(*) as count FROM sales_logs;

-- ============================================================================
-- STEP 3: Show all production logs
-- ============================================================================

SELECT 'ALL PRODUCTION LOGS' as section;

SELECT 
  'Production Log Details' as info,
  pl.id,
  bt.name as bread_name,
  pl.quantity,
  pl.shift,
  pl.created_at,
  TO_CHAR(pl.created_at, 'YYYY-MM-DD') as date_only,
  TO_CHAR(pl.created_at, 'HH24:MI:SS') as time_only
FROM production_logs pl
JOIN bread_types bt ON bt.id = pl.bread_type_id
ORDER BY pl.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 4: Check today's production
-- ============================================================================

SELECT 'TODAYS PRODUCTION' as section;

SELECT 
  'Today Production Count' as info,
  COUNT(*) as count,
  COALESCE(SUM(pl.quantity), 0) as total_quantity
FROM production_logs pl
WHERE DATE(pl.created_at) = CURRENT_DATE;

SELECT 
  'Today Production Details' as info,
  pl.id,
  bt.name as bread_name,
  pl.quantity,
  pl.shift,
  pl.created_at
FROM production_logs pl
JOIN bread_types bt ON bt.id = pl.bread_type_id
WHERE DATE(pl.created_at) = CURRENT_DATE
ORDER BY pl.created_at DESC;

-- ============================================================================
-- STEP 5: Show bread types with production summary
-- ============================================================================

SELECT 'BREAD TYPES SUMMARY' as section;

SELECT 
  'Bread Type Production Summary' as info,
  bt.id,
  bt.name,
  bt.unit_price,
  COALESCE(today_prod.quantity, 0) as produced_today,
  COALESCE(all_prod.quantity, 0) as produced_all_time
FROM bread_types bt
LEFT JOIN (
  SELECT bread_type_id, SUM(quantity) as quantity
  FROM production_logs 
  WHERE DATE(production_logs.created_at) = CURRENT_DATE
  GROUP BY bread_type_id
) today_prod ON today_prod.bread_type_id = bt.id
LEFT JOIN (
  SELECT bread_type_id, SUM(quantity) as quantity
  FROM production_logs 
  GROUP BY bread_type_id
) all_prod ON all_prod.bread_type_id = bt.id
ORDER BY bt.name;

-- ============================================================================
-- STEP 6: Simple diagnosis
-- ============================================================================

SELECT 'DIAGNOSIS' as section;

SELECT 
  'Issue Analysis' as info,
  CASE 
    WHEN (SELECT COUNT(*) FROM production_logs) = 0 THEN 
      'NO PRODUCTION LOGS - Add production logs first'
    WHEN (SELECT COUNT(*) FROM production_logs WHERE DATE(production_logs.created_at) = CURRENT_DATE) = 0 THEN 
      'NO PRODUCTION TODAY - Logs exist but not for today'
    WHEN (SELECT COUNT(*) FROM bread_types) = 0 THEN 
      'NO BREAD TYPES - Add bread types first'
    ELSE 
      'DATA EXISTS - Check browser console for app logs'
  END as diagnosis;

-- ============================================================================
-- STEP 7: Show recent activity
-- ============================================================================

SELECT 'RECENT ACTIVITY' as section;

SELECT 
  'Last 5 Production Logs' as info,
  pl.created_at,
  bt.name as bread_name,
  pl.quantity,
  pl.shift,
  EXTRACT(EPOCH FROM (NOW() - pl.created_at)) / 3600 as hours_ago
FROM production_logs pl
JOIN bread_types bt ON bt.id = pl.bread_type_id
ORDER BY pl.created_at DESC
LIMIT 5;