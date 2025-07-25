-- Fix the unique constraint on batches table to include shift
-- This aligns with the intended design where batch numbers are unique per bread type AND shift

-- First, check current constraints
SELECT conname, condef 
FROM pg_constraint 
WHERE conrelid = 'public.batches'::regclass 
AND contype = 'u';

-- Drop the existing unique constraint (if it exists)
ALTER TABLE public.batches 
DROP CONSTRAINT IF EXISTS batches_bread_type_id_batch_number_key;

-- Add the correct unique constraint that includes shift
ALTER TABLE public.batches 
ADD CONSTRAINT batches_bread_type_id_batch_number_shift_unique 
UNIQUE (bread_type_id, batch_number, shift);

-- Verify the constraint was added correctly
SELECT conname, condef 
FROM pg_constraint 
WHERE conrelid = 'public.batches'::regclass 
AND contype = 'u';
