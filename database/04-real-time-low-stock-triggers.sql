-- Real-Time Low Stock Tracking System
-- Automatically tracks low stock changes without requiring page visits
-- Uses database triggers and real-time monitoring

-- Function to automatically recalculate low stock counts in real-time
-- This runs whenever available_stock, batches, or production data changes
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
BEGIN
  -- Get current Lagos date and time
  v_lagos_date := CURRENT_DATE;
  
  -- Get current Lagos hour to determine shift
  SELECT EXTRACT(hour FROM (now() AT TIME ZONE 'Africa/Lagos'))::integer INTO v_lagos_hour;
  
  -- Determine current shift (10AM-10PM = morning, 10PM-10AM = night)
  IF v_lagos_hour >= 10 AND v_lagos_hour < 22 THEN
    v_current_shift := 'morning';
  ELSE
    v_current_shift := 'night';
  END IF;

  -- Count morning shift low stock items
  -- Low stock = available <= 5 AND available > 0
  SELECT COUNT(*)
  INTO v_morning_low_count
  FROM public.available_stock ast
  JOIN public.bread_types bt ON bt.id = ast.bread_type_id
  WHERE ast.quantity > 0 
    AND ast.quantity <= 5
    AND EXISTS (
      -- Only count if there's production activity for morning shift today
      SELECT 1 FROM public.batches b 
      WHERE b.bread_type_id = ast.bread_type_id 
        AND b.shift = 'morning'
        AND DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
      UNION
      SELECT 1 FROM public.all_batches ab 
      WHERE ab.bread_type_id = ast.bread_type_id 
        AND ab.shift = 'morning'
        AND DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
    );

  -- Count night shift low stock items
  SELECT COUNT(*)
  INTO v_night_low_count
  FROM public.available_stock ast
  JOIN public.bread_types bt ON bt.id = ast.bread_type_id
  WHERE ast.quantity > 0 
    AND ast.quantity <= 5
    AND EXISTS (
      -- Only count if there's production activity for night shift today
      SELECT 1 FROM public.batches b 
      WHERE b.bread_type_id = ast.bread_type_id 
        AND b.shift = 'night'
        AND DATE(b.created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
      UNION
      SELECT 1 FROM public.all_batches ab 
      WHERE ab.bread_type_id = ast.bread_type_id 
        AND ab.shift = 'night'
        AND DATE(ab.created_at AT TIME ZONE 'Africa/Lagos') = v_lagos_date
    );

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
  RAISE NOTICE 'Auto-updated low stock counts: Morning=%, Night=%, Date=%', v_morning_low_count, v_night_low_count, v_lagos_date;
END;
$$;

-- Trigger function for available_stock changes
CREATE OR REPLACE FUNCTION public.trigger_update_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the auto update function
  PERFORM public.auto_update_low_stock_counts();
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for batch/production changes
CREATE OR REPLACE FUNCTION public.trigger_update_low_stock_on_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger on today's batches
  IF DATE(COALESCE(NEW.created_at, OLD.created_at) AT TIME ZONE 'Africa/Lagos') = CURRENT_DATE THEN
    PERFORM public.auto_update_low_stock_counts();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS auto_update_low_stock_on_stock_change ON public.available_stock;
DROP TRIGGER IF EXISTS auto_update_low_stock_on_batch_change ON public.batches;
DROP TRIGGER IF EXISTS auto_update_low_stock_on_all_batch_change ON public.all_batches;
DROP TRIGGER IF EXISTS auto_update_low_stock_on_sales_change ON public.sales_logs;

-- Create triggers for real-time updates
-- Trigger on available_stock changes (most important)
CREATE TRIGGER auto_update_low_stock_on_stock_change
  AFTER INSERT OR UPDATE OR DELETE ON public.available_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_low_stock();

-- Trigger on batch creation/completion
CREATE TRIGGER auto_update_low_stock_on_batch_change
  AFTER INSERT OR UPDATE OR DELETE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_low_stock_on_batch();

-- Trigger on all_batches changes (for historical data)
CREATE TRIGGER auto_update_low_stock_on_all_batch_change
  AFTER INSERT OR UPDATE OR DELETE ON public.all_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_low_stock_on_batch();

-- Trigger on sales (which affect available stock indirectly)
CREATE TRIGGER auto_update_low_stock_on_sales_change
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_low_stock();

-- Function to manually refresh low stock counts (for testing/admin)
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
  -- Force update
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

-- Initial population of today's data
SELECT public.auto_update_low_stock_counts();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.auto_update_low_stock_counts TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_update_low_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_update_low_stock_on_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_low_stock_counts_now TO authenticated;

-- Enable real-time notifications for the daily_low_stock_counts table
-- This allows the frontend to listen for changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_low_stock_counts;

-- Comments for documentation
COMMENT ON FUNCTION public.auto_update_low_stock_counts IS 'Automatically recalculates low stock counts in real-time based on current inventory and production data';
COMMENT ON FUNCTION public.trigger_update_low_stock IS 'Trigger function that updates low stock counts when available_stock changes';
COMMENT ON FUNCTION public.trigger_update_low_stock_on_batch IS 'Trigger function that updates low stock counts when batch/production data changes';
COMMENT ON FUNCTION public.refresh_low_stock_counts_now IS 'Manual function to refresh low stock counts immediately (for testing/admin use)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Real-time low stock tracking system installed successfully!';
  RAISE NOTICE '📊 Low stock counts will now update automatically when:';
  RAISE NOTICE '   • Available stock changes';
  RAISE NOTICE '   • Batches are created/updated';  
  RAISE NOTICE '   • Sales are recorded';
  RAISE NOTICE '🔄 No more manual page visits required!';
END $$;