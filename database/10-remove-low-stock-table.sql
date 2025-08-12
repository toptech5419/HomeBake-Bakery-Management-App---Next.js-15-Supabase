-- Remove the database-based low stock tracking system
-- We're replacing it with real-time monitoring of performance pages

-- Drop the table
DROP TABLE IF EXISTS public.daily_low_stock_counts CASCADE;

-- Drop any related functions if they exist
DROP FUNCTION IF EXISTS public.update_daily_low_stock_count(text, integer, date);
DROP FUNCTION IF EXISTS public.get_daily_low_stock_count(date);
DROP FUNCTION IF EXISTS public.reset_daily_low_stock_counts();
DROP FUNCTION IF EXISTS public.refresh_low_stock_counts_now();

-- Drop any triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_low_stock_count ON public.available_stock;
DROP FUNCTION IF EXISTS public.update_low_stock_count_trigger();

-- Clean up any policies
DROP POLICY IF EXISTS "Allow authenticated users to read daily low stock counts" ON public.daily_low_stock_counts;
DROP POLICY IF EXISTS "Allow owners to manage daily low stock counts" ON public.daily_low_stock_counts;

-- Note: This simplifies the system by removing database-based tracking
-- in favor of real-time calculation from performance pages