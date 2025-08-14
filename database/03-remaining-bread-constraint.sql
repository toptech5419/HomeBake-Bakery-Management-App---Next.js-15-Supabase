-- 03-remaining-bread-constraint.sql
-- Database constraint to prevent duplicate remaining_bread records
-- Ensures only one record per bread_type_id (global access constraint)

-- First, clean up any existing duplicates
-- Keep only the most recent record for each bread_type_id
DELETE FROM remaining_bread 
WHERE id NOT IN (
  SELECT DISTINCT ON (bread_type_id) id
  FROM remaining_bread 
  ORDER BY bread_type_id, created_at DESC
);

-- Add unique constraint on bread_type_id to prevent future duplicates
ALTER TABLE remaining_bread 
ADD CONSTRAINT remaining_bread_bread_type_id_unique 
UNIQUE (bread_type_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT remaining_bread_bread_type_id_unique ON remaining_bread IS 
'Ensures only one remaining bread record exists per bread type (global access)';