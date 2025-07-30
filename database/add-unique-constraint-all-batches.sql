-- Add unique constraint to prevent duplicate batch IDs in all_batches table
-- This ensures that the same batch cannot be saved twice to all_batches

-- Add unique constraint on the id column (which is the batch ID from batches table)
ALTER TABLE public.all_batches 
ADD CONSTRAINT all_batches_id_unique UNIQUE (id);

-- Add index for better performance when checking for duplicates
CREATE INDEX IF NOT EXISTS idx_all_batches_id ON public.all_batches(id);

-- Add index for better performance when filtering by user and date
CREATE INDEX IF NOT EXISTS idx_all_batches_created_by_date ON public.all_batches(created_by, created_at);

-- Add index for better performance when filtering by user, shift and date
CREATE INDEX IF NOT EXISTS idx_all_batches_created_by_shift_date ON public.all_batches(created_by, shift, created_at);

-- Verify the constraint was added
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'all_batches' 
AND constraint_type = 'UNIQUE'; 