-- Fix the target_quantity NOT NULL constraint issue
-- This script makes target_quantity nullable and updates the function

-- Step 1: Make target_quantity nullable
ALTER TABLE public.batches 
ALTER COLUMN target_quantity DROP NOT NULL;

-- Step 2: Update the function to include target_quantity
DROP FUNCTION IF EXISTS public.create_batch_with_unique_number(
  uuid, integer, text, text, uuid, timestamptz, text
) CASCADE;

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
  target_quantity integer,
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
    bread_type_id, batch_number, start_time, actual_quantity, target_quantity,
    status, notes, created_by, shift
  ) VALUES (
    p_bread_type_id,
    new_batch_number,
    COALESCE(p_start_time, now()),
    p_actual_quantity,
    p_actual_quantity, -- Use actual_quantity as target_quantity
    p_status,
    p_notes,
    p_created_by,
    p_shift
  )
  RETURNING batches.id, batches.bread_type_id, batches.batch_number, batches.start_time, batches.end_time, batches.actual_quantity, batches.target_quantity, batches.status, batches.notes, batches.created_by, batches.created_at, batches.updated_at, batches.shift
  INTO id, bread_type_id, batch_number, start_time, end_time, actual_quantity, target_quantity, status, notes, created_by, created_at, updated_at, shift;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.create_batch_with_unique_number(
  uuid, integer, text, text, uuid, timestamptz, text
) TO authenticated;

-- Step 4: Verify the change
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'batches' AND column_name = 'target_quantity';
