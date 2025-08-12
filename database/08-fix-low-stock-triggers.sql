-- Fix low stock triggers to match performance page calculation logic
-- Performance pages use: available = produced - sold from batches/sales data
-- NOT the available_stock table

-- Updated function to calculate low stock the same way as performance pages
CREATE OR REPLACE FUNCTION public.auto_update_low_stock_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lagos_date date;
  v_current_shift text;
  v_morning_low_count integer := 0;
  v_night_low_count integer := 0;
  v_lagos_hour integer;
  v_nigeria_time timestamp with time zone;
BEGIN
  -- Get current Lagos date and time
  v_nigeria_time := timezone('Africa/Lagos', now());
  v_lagos_date := v_nigeria_time::date;
  
  -- Get current Lagos hour to determine shift
  v_lagos_hour := EXTRACT(hour FROM v_nigeria_time)::integer;
  
  -- Determine current shift (10AM-10PM = morning, 10PM-10AM = night)
  IF v_lagos_hour >= 10 AND v_lagos_hour < 22 THEN
    v_current_shift := 'morning';
  ELSE
    v_current_shift := 'night';
  END IF;

  -- Calculate morning shift low stock items using SAME LOGIC AS PERFORMANCE PAGES
  -- Low stock = (produced - sold) <= 5 AND (produced - sold) > 0
  SELECT COUNT(*)
  INTO v_morning_low_count
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
        AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
      GROUP BY bread_type_id
    ) s ON s.bread_type_id = b.bread_type_id
    WHERE b.shift = 'morning'
      AND DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
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
        AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
      GROUP BY bread_type_id
    ) s ON s.bread_type_id = ab.bread_type_id
    WHERE ab.shift = 'morning'
      AND DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
      AND ab.status IN ('active', 'completed')
  ) morning_calc
  WHERE available > 0 AND available <= 5;

  -- Calculate night shift low stock items using SAME LOGIC AS PERFORMANCE PAGES
  SELECT COUNT(*)
  INTO v_night_low_count
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
        AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
      GROUP BY bread_type_id
    ) s ON s.bread_type_id = b.bread_type_id
    WHERE b.shift = 'night'
      AND DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
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
        AND DATE(created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
      GROUP BY bread_type_id
    ) s ON s.bread_type_id = ab.bread_type_id
    WHERE ab.shift = 'night'
      AND DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
      AND ab.status IN ('active', 'completed')
  ) night_calc
  WHERE available > 0 AND available <= 5;

  -- Update or insert the daily count
  INSERT INTO public.daily_low_stock_counts (
    count_date,
    morning_shift_count,
    night_shift_count,
    last_updated_morning,
    last_updated_night
  )
  VALUES (
    v_lagos_date,
    v_morning_low_count,
    v_night_low_count,
    CASE WHEN v_current_shift = 'morning' THEN now() ELSE NULL END,
    CASE WHEN v_current_shift = 'night' THEN now() ELSE NULL END
  )
  ON CONFLICT (count_date) DO UPDATE SET
    morning_shift_count = v_morning_low_count,
    night_shift_count = v_night_low_count,
    last_updated_morning = CASE WHEN v_current_shift = 'morning' THEN now() ELSE daily_low_stock_counts.last_updated_morning END,
    last_updated_night = CASE WHEN v_current_shift = 'night' THEN now() ELSE daily_low_stock_counts.last_updated_night END,
    updated_at = now();

  -- Log the update
  RAISE NOTICE '✅ Auto-updated low stock counts (FIXED LOGIC): Morning=%, Night=%, Date=%, Current_Shift=%', 
    v_morning_low_count, v_night_low_count, v_lagos_date, v_current_shift;
END;
$$;

-- Update the refresh function to use the same logic
CREATE OR REPLACE FUNCTION public.refresh_low_stock_counts_now()
RETURNS TABLE(
  date_updated date,
  morning_count integer,
  night_count integer,
  total_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Force update using the corrected logic
  PERFORM public.auto_update_low_stock_counts();
  
  -- Return current counts
  RETURN QUERY
  SELECT 
    dlsc.count_date,
    dlsc.morning_shift_count,
    dlsc.night_shift_count,
    dlsc.total_count
  FROM public.daily_low_stock_counts dlsc
  WHERE dlsc.count_date = CURRENT_DATE;
END;
$$;

-- Test the fixed function immediately
SELECT 'Testing fixed low stock calculation...' as test_step;
SELECT public.auto_update_low_stock_counts();

-- Show the results
SELECT 'Fixed results:' as test_step;
SELECT * FROM daily_low_stock_counts WHERE count_date = CURRENT_DATE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🔧 FIXED: Low stock triggers now use same logic as performance pages!';
  RAISE NOTICE '📊 Calculation: available = produced - sold (from batches + sales data)';
  RAISE NOTICE '✅ Low stock = available > 0 AND available <= 5';
END $$;