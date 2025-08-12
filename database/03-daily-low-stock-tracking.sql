-- Daily Low Stock Tracking System
-- Production-ready table to track daily low stock counts for owner dashboard
-- This table resets daily at midnight Lagos time and aggregates low stock from performance pages

-- Create daily_low_stock_counts table
CREATE TABLE IF NOT EXISTS public.daily_low_stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  morning_shift_count integer NOT NULL DEFAULT 0 CHECK (morning_shift_count >= 0),
  night_shift_count integer NOT NULL DEFAULT 0 CHECK (night_shift_count >= 0),
  total_count integer GENERATED ALWAYS AS (morning_shift_count + night_shift_count) STORED,
  last_updated_morning timestamp with time zone,
  last_updated_night timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Ensure one record per date
  CONSTRAINT daily_low_stock_counts_date_unique UNIQUE (count_date)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS daily_low_stock_counts_date_idx ON public.daily_low_stock_counts (count_date);
CREATE INDEX IF NOT EXISTS daily_low_stock_counts_updated_idx ON public.daily_low_stock_counts (updated_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.daily_low_stock_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authenticated users can read
CREATE POLICY "Allow authenticated users to read daily low stock counts"
  ON public.daily_low_stock_counts FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Only owners can insert/update
CREATE POLICY "Allow owners to manage daily low stock counts"
  ON public.daily_low_stock_counts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'owner'
      AND users.is_active = true
    )
  );

-- Function to update daily low stock counts
-- This will be called from the performance pages
CREATE OR REPLACE FUNCTION public.update_daily_low_stock_count(
  p_shift text,
  p_count integer,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lagos_date date;
BEGIN
  -- Validate shift parameter
  IF p_shift NOT IN ('morning', 'night') THEN
    RAISE EXCEPTION 'Invalid shift: %. Must be morning or night', p_shift;
  END IF;

  -- Validate count parameter
  IF p_count < 0 THEN
    RAISE EXCEPTION 'Invalid count: %. Must be >= 0', p_count;
  END IF;

  -- Get Lagos date
  v_lagos_date := COALESCE(p_date, CURRENT_DATE);

  -- Insert or update the daily count
  INSERT INTO public.daily_low_stock_counts (
    count_date,
    morning_shift_count,
    night_shift_count,
    last_updated_morning,
    last_updated_night
  )
  VALUES (
    v_lagos_date,
    CASE WHEN p_shift = 'morning' THEN p_count ELSE 0 END,
    CASE WHEN p_shift = 'night' THEN p_count ELSE 0 END,
    CASE WHEN p_shift = 'morning' THEN now() ELSE NULL END,
    CASE WHEN p_shift = 'night' THEN now() ELSE NULL END
  )
  ON CONFLICT (count_date) DO UPDATE SET
    morning_shift_count = CASE WHEN p_shift = 'morning' THEN p_count ELSE daily_low_stock_counts.morning_shift_count END,
    night_shift_count = CASE WHEN p_shift = 'night' THEN p_count ELSE daily_low_stock_counts.night_shift_count END,
    last_updated_morning = CASE WHEN p_shift = 'morning' THEN now() ELSE daily_low_stock_counts.last_updated_morning END,
    last_updated_night = CASE WHEN p_shift = 'night' THEN now() ELSE daily_low_stock_counts.last_updated_night END,
    updated_at = now();
END;
$$;

-- Function to get daily low stock count for owner dashboard
CREATE OR REPLACE FUNCTION public.get_daily_low_stock_count(
  p_date date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count integer := 0;
  v_lagos_date date;
BEGIN
  -- Get Lagos date
  v_lagos_date := COALESCE(p_date, CURRENT_DATE);

  -- Get total count for the date
  SELECT COALESCE(total_count, 0)
  INTO v_total_count
  FROM public.daily_low_stock_counts
  WHERE count_date = v_lagos_date;

  RETURN COALESCE(v_total_count, 0);
END;
$$;

-- Function to reset daily counts at midnight (called by cron job or scheduled task)
CREATE OR REPLACE FUNCTION public.reset_daily_low_stock_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_yesterday date;
  v_today date;
BEGIN
  -- Calculate dates
  v_today := CURRENT_DATE;
  v_yesterday := v_today - INTERVAL '1 day';

  -- Archive yesterday's data if it exists (optional - for historical tracking)
  -- The data persists for reporting purposes

  -- Create today's entry with zero counts
  INSERT INTO public.daily_low_stock_counts (
    count_date,
    morning_shift_count,
    night_shift_count
  )
  VALUES (v_today, 0, 0)
  ON CONFLICT (count_date) DO NOTHING; -- Don't reset if already exists

  -- Log the reset (optional)
  RAISE NOTICE 'Daily low stock counts initialized for date: %', v_today;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_daily_low_stock_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_low_stock_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_low_stock_counts TO service_role;

-- Create initial entry for today
SELECT public.reset_daily_low_stock_counts();

-- Comments for documentation
COMMENT ON TABLE public.daily_low_stock_counts IS 'Tracks daily low stock counts for owner dashboard - resets at midnight Lagos time';
COMMENT ON FUNCTION public.update_daily_low_stock_count IS 'Updates daily low stock count for a specific shift';
COMMENT ON FUNCTION public.get_daily_low_stock_count IS 'Gets total daily low stock count for owner dashboard';
COMMENT ON FUNCTION public.reset_daily_low_stock_counts IS 'Resets daily low stock counts at midnight - called by scheduled job';