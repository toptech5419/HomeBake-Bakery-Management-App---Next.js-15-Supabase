-- ============================================
-- BATCH CREATION FIX DEPLOYMENT SCRIPT
-- ============================================
-- This script fixes the batch creation issue by:
-- 1. Updating the unique constraint to include shift
-- 2. Updating the batch creation function with better error handling
-- 3. Ensuring batch numbers are unique per bread type AND shift

-- Start transaction
BEGIN;

-- Step 1: Check current constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.batches'::regclass 
AND contype = 'u';

-- Step 2: Drop the old constraint if it exists
ALTER TABLE public.batches 
DROP CONSTRAINT IF EXISTS batches_bread_type_id_batch_number_key;

-- Step 3: Add the correct unique constraint that includes shift
ALTER TABLE public.batches 
ADD CONSTRAINT batches_bread_type_id_batch_number_shift_unique 
UNIQUE (bread_type_id, batch_number, shift);

-- Step 4: Update the batch creation function
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

CREATE OR REPLACE FUNCTION public.create_batch_with_unique_number(
  p_bread_type_id uuid,
  p_target_quantity integer,
  p_notes text,
  p_shift text,
  p_created_by uuid,
  p_actual_quantity integer DEFAULT NULL,
  p_start_time timestamptz DEFAULT NULL,
  p_status text DEFAULT 'active'
)
RETURNS TABLE (
  id uuid,
  bread_type_id uuid,
  batch_number varchar,
  start_time timestamptz,
  end_time timestamptz,
  target_quantity integer,
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
  max_attempts int := 5;
  attempt int := 0;
BEGIN
  -- Loop to handle potential race conditions
  LOOP
    attempt := attempt + 1;
    
    -- Lock only relevant rows for this bread_type_id and shift
    SELECT batches.batch_number
      INTO last_batch_number
      FROM public.batches
      WHERE batches.bread_type_id = p_bread_type_id 
        AND batches.shift = p_shift
      ORDER BY batches.batch_number DESC
      LIMIT 1
      FOR UPDATE;

    IF last_batch_number IS NULL THEN
      next_number := 1;
    ELSE
      -- Extract numeric part, handle leading zeros and non-numeric characters
      BEGIN
        next_number := COALESCE((regexp_replace(last_batch_number, '\D', '', 'g'))::int, 0) + 1;
      EXCEPTION 
        WHEN OTHERS THEN
          -- Fallback if regex fails
          next_number := 1;
      END;
    END IF;

    new_batch_number := lpad(next_number::text, 3, '0');

    BEGIN
      INSERT INTO public.batches (
        bread_type_id, batch_number, start_time, target_quantity, actual_quantity,
        status, notes, created_by, shift
      ) VALUES (
        p_bread_type_id,
        new_batch_number,
        COALESCE(p_start_time, now()),
        p_target_quantity,
        COALESCE(p_actual_quantity, 0),
        p_status,
        p_notes,
        p_created_by,
        p_shift
      )
      RETURNING batches.id, batches.bread_type_id, batches.batch_number, batches.start_time, batches.end_time, batches.target_quantity, batches.actual_quantity, batches.status, batches.notes, batches.created_by, batches.created_at, batches.updated_at, batches.shift
      INTO id, bread_type_id, batch_number, start_time, end_time, target_quantity, actual_quantity, status, notes, created_by, created_at, updated_at, shift;

      -- Success, exit loop
      EXIT;

    EXCEPTION 
      WHEN unique_violation THEN
        -- If we hit a unique constraint violation, retry with next number
        IF attempt >= max_attempts THEN
          RAISE EXCEPTION 'Failed to generate unique batch number after % attempts', max_attempts;
        END IF;
        -- Continue loop to try next number
    END;
  END LOOP;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_batch_with_unique_number(
  uuid, integer, text, text, uuid, integer, timestamptz, text
) TO authenticated;

-- Step 6: Verify the fix
-- Test the constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.batches'::regclass 
AND contype = 'u';

-- Test the function (optional - uncomment to test)
-- SELECT * FROM public.create_batch_with_unique_number(
--   (SELECT id FROM bread_types LIMIT 1), 
--   50, 
--   'Test batch for night shift', 
--   'night', 
--   (SELECT id FROM users LIMIT 1)
-- );

COMMIT;

-- ============================================
-- DEPLOYMENT COMPLETE
-- ============================================
-- To apply these changes:
-- 1. Run this script in your Supabase SQL editor
-- 2. Test batch creation in the manager dashboard
-- 3. Verify batch numbers are unique per bread type AND shift
