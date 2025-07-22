-- Add unique constraint to prevent duplicate shift reports
-- This ensures only one report per user per day per shift

-- First, let's check if there are any existing duplicates and clean them up
DELETE FROM shift_reports 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM shift_reports 
  GROUP BY user_id, shift, report_date
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE shift_reports 
ADD CONSTRAINT unique_user_shift_date 
UNIQUE (user_id, shift, report_date);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_shift_reports_user_shift_date 
ON shift_reports (user_id, shift, report_date); 