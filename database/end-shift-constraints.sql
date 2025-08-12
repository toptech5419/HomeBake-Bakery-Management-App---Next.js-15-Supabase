-- Database constraints for end-shift page duplicate prevention
-- Run this script in Supabase SQL Editor

-- 1. Unique constraint for sales_logs to prevent duplicate entries
-- One sales record per bread_type per user per shift per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_logs_unique_daily_entry 
ON public.sales_logs (
    recorded_by, 
    shift, 
    bread_type_id, 
    DATE(created_at AT TIME ZONE 'Africa/Lagos')
);

-- 2. Unique constraint for remaining_bread to prevent duplicate entries  
-- One remaining bread record per bread_type per user per shift per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_remaining_bread_unique_daily_entry 
ON public.remaining_bread (
    recorded_by, 
    shift, 
    bread_type_id, 
    DATE(created_at AT TIME ZONE 'Africa/Lagos')
);

-- Add comments for documentation
COMMENT ON INDEX idx_sales_logs_unique_daily_entry IS 
'Prevents duplicate sales entries for same user, shift, bread_type and date (Nigeria timezone)';

COMMENT ON INDEX idx_remaining_bread_unique_daily_entry IS 
'Prevents duplicate remaining bread entries for same user, shift, bread_type and date (Nigeria timezone)';

-- Note: These constraints will prevent duplicate inserts at the database level
-- The application logic should handle UPSERT operations (INSERT ... ON CONFLICT UPDATE)
-- to update existing records when conflicts occur