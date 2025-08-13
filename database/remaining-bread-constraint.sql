-- Remaining Bread Constraint Script
-- This script creates a unique constraint to prevent duplicate remaining bread entries
-- for the same date, shift, and user combination while allowing quantity updates

-- Drop the constraint if it exists (for re-running the script)
ALTER TABLE remaining_bread DROP CONSTRAINT IF EXISTS unique_remaining_bread_per_day_shift_user;

-- Create unique constraint on record_date, shift, and recorded_by
-- This prevents the same user from creating multiple remaining bread entries
-- for the same bread type on the same date and shift
ALTER TABLE remaining_bread 
ADD CONSTRAINT unique_remaining_bread_per_day_shift_user 
UNIQUE (record_date, shift, recorded_by, bread_type_id);

-- Create index for performance on common query patterns
CREATE INDEX IF NOT EXISTS idx_remaining_bread_lookup 
ON remaining_bread (record_date, shift, recorded_by);

-- Create index for bread type queries
CREATE INDEX IF NOT EXISTS idx_remaining_bread_type_date 
ON remaining_bread (bread_type_id, record_date);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_remaining_bread_per_day_shift_user ON remaining_bread IS 
'Ensures one remaining bread entry per bread type, per day, per shift, per user. Users can update quantities but cannot create duplicates.';

-- Example usage notes:
-- 1. First save: User A saves remaining bread for "White Bread" on 2025-01-15 morning shift → SUCCESS
-- 2. Update save: User A updates quantity for "White Bread" on 2025-01-15 morning shift → SUCCESS (quantity updated)
-- 3. Duplicate attempt: User A tries to save new entry for "White Bread" on 2025-01-15 morning shift → CONSTRAINT VIOLATION
-- 4. Different user: User B saves remaining bread for "White Bread" on 2025-01-15 morning shift → SUCCESS (different user)
-- 5. Different shift: User A saves remaining bread for "White Bread" on 2025-01-15 night shift → SUCCESS (different shift)
-- 6. Different date: User A saves remaining bread for "White Bread" on 2025-01-16 morning shift → SUCCESS (different date)
-- 7. Different bread type: User A saves remaining bread for "Brown Bread" on 2025-01-15 morning shift → SUCCESS (different bread type)