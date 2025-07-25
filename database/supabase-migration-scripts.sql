-- HomeBake Bakery Management System - Supabase Migration Scripts
-- Scripts to run in Supabase SQL Editor for target_quantity → actual_quantity migration

-- =====================================================
-- STEP 1: Update Database Function
-- =====================================================
-- Drop the old function with target_quantity parameter
DROP FUNCTION IF EXISTS public.create_batch_with_unique_number(
  p_bread_type_id uuid,
  p_target_quantity integer,
  p_notes text,
  p_shift text,
  p_created_by uuid,
  p_actual_quantity integer,
  p_start_time timestamptz,
  p_status text
);

-- Create updated function using actual_quantity only
CREATE OR REPLACE FUNCTION public.create_batch_with_unique_number(
  p_bread_type_id uuid,
  p_actual_quantity integer,
  p_notes text,
  p_shift text,
  p_created_by uuid,
  p_start_time timestamptz DEFAULT NULL,
  p_status text DEFAULT 'active'
)
RETURNS TABLE (
  id uuid,
  bread_type_id uuid,
  batch_number varchar,
  start_time timestamptz,
  end_time timestamptz,
  actual_quantity integer,
  status varchar,
  notes text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  shift text
) AS $$
DECLARE
  last_batch_number varchar;
  next_number int;
  new_batch_number varchar;
BEGIN
  -- Lock only relevant rows for this bread_type_id and shift
  SELECT batches.batch_number
    INTO last_batch_number
    FROM public.batches
    WHERE batches.bread_type_id = p_bread_type_id AND batches.shift = p_shift
    ORDER BY batches.batch_number DESC
    LIMIT 1
    FOR UPDATE;

  IF last_batch_number IS NULL THEN
    next_number := 1;
  ELSE
    -- Extract numeric part, handle leading zeros
    next_number := COALESCE((regexp_replace(last_batch_number, '\D', '', 'g'))::int, 0) + 1;
  END IF;

  new_batch_number := lpad(next_number::text, 3, '0');

  INSERT INTO public.batches (
    bread_type_id, batch_number, start_time, actual_quantity,
    status, notes, created_by, shift
  ) VALUES (
    p_bread_type_id,
    new_batch_number,
    COALESCE(p_start_time, now()),
    p_actual_quantity,
    p_status,
    p_notes,
    p_created_by,
    p_shift
  )
  RETURNING batches.id, batches.bread_type_id, batches.batch_number, batches.start_time, batches.end_time, batches.actual_quantity, batches.status, batches.notes, batches.created_by, batches.created_at, batches.updated_at, batches.shift
  INTO id, bread_type_id, batch_number, start_time, end_time, actual_quantity, status, notes, created_by, created_at, updated_at, shift;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Update Table Schema (if target_quantity exists)
-- =====================================================
-- Make target_quantity nullable (safe operation)
ALTER TABLE public.batches 
ALTER COLUMN target_quantity DROP NOT NULL;

-- Update existing data to use actual_quantity
UPDATE public.batches 
SET actual_quantity = COALESCE(actual_quantity, target_quantity, 0)
WHERE actual_quantity IS NULL OR actual_quantity = 0;

-- Update all_batches table similarly
ALTER TABLE public.all_batches 
ALTER COLUMN target_quantity DROP NOT NULL;

UPDATE public.all_batches 
SET actual_quantity = COALESCE(actual_quantity, target_quantity, 0)
WHERE actual_quantity IS NULL OR actual_quantity = 0;

-- =====================================================
-- STEP 3: Update Comments
-- =====================================================
COMMENT ON COLUMN batches.actual_quantity IS 'Actual quantity produced for this batch';
COMMENT ON COLUMN all_batches.actual_quantity IS 'Actual quantity produced for this batch';

-- =====================================================
-- STEP 4: Verify Changes
-- =====================================================
-- Check current table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('batches', 'all_batches')
    AND column_name LIKE '%quantity%'
ORDER BY table_name, ordinal_position;

-- Test the updated function
-- SELECT * FROM public.create_batch_with_unique_number(
--     '00000000-0000-0000-0000-000000000000', -- Replace with actual bread_type_id
--     50, -- actual_quantity
--     'Test batch', -- notes
--     'morning', -- shift
--     '00000000-0000-0000-0000-000000000000' -- Replace with actual user_id
-- );

-- =====================================================
-- STEP 5: Optional - Remove target_quantity column
-- WARNING: Only run after confirming everything works
-- =====================================================
-- ALTER TABLE public.batches DROP COLUMN IF EXISTS target_quantity;
-- ALTER TABLE public.all_batches DROP COLUMN IF EXISTS target_quantity;

-- =====================================================
-- STEP 6: Final Verification
-- =====================================================
-- Check if any batches still have NULL actual_quantity
SELECT 
    COUNT(*) as total_batches,
    COUNT(CASE WHEN actual_quantity IS NULL THEN 1 END) as null_actual,
    COUNT(CASE WHEN actual_quantity = 0 THEN 1 END) as zero_actual
FROM public.batches;

-- Check if any batches still reference target_quantity
SELECT COUNT(*) as batches_with_target
FROM public.batches
WHERE target_quantity IS NOT NULL;
