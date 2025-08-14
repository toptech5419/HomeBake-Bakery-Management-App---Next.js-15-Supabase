-- 04-remaining-bread-fix.sql
-- Fix remaining_bread table issues for production use

-- 1. Clean up any existing duplicates (table already has UNIQUE constraint on bread_type_id)
-- Keep only the most recent record for each bread_type_id
DELETE FROM remaining_bread 
WHERE id NOT IN (
  SELECT DISTINCT ON (bread_type_id) id
  FROM remaining_bread 
  ORDER BY bread_type_id, created_at DESC
);

-- 2. Add missing foreign key constraint to bread_types table
-- This ensures data integrity
ALTER TABLE remaining_bread 
ADD CONSTRAINT remaining_bread_bread_type_id_fkey 
FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id);

-- 3. Add missing foreign key constraint to users table
-- This ensures recorded_by references valid users
ALTER TABLE remaining_bread 
ADD CONSTRAINT remaining_bread_recorded_by_fkey 
FOREIGN KEY (recorded_by) REFERENCES public.users(id);

-- 4. Add comments for clarity
COMMENT ON COLUMN remaining_bread.total_value IS 'Generated column: automatically calculated as quantity * unit_price';
COMMENT ON CONSTRAINT remaining_bread_bread_type_id_fkey ON remaining_bread IS 'Foreign key to bread_types table';
COMMENT ON CONSTRAINT remaining_bread_recorded_by_fkey ON remaining_bread IS 'Foreign key to users table';

-- Note: bread_type_id already has UNIQUE constraint, so no duplicates are possible
-- Note: total_value is a generated column, so don't set it manually in application code