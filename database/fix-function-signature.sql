-- Fix the function signature issue by properly dropping and recreating it
-- This script handles the PostgreSQL error about changing return types

-- Step 1: Drop the existing function with the old signature
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

-- Step 2: Drop any other variations of the function
DROP FUNCTION IF EXISTS public.create_batch_with_unique_number(
  p_bread_type_id uuid,
  p_actual_quantity integer,
  p_notes text,
  p_shift text,
  p_created_by uuid,
  p_start_time timestamptz,
  p_status text
);

-- Step 3: Create the new function with the correct signature
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

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_batch_with_unique_number(
  uuid, integer, text, text, uuid, timestamptz, text
) TO authenticated;

-- Step 5: Verify the function was created correctly
SELECT 
    routine_name,
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public' 
    AND routine_name = 'create_batch_with_unique_number'
ORDER BY ordinal_position;

-- Step 6: Test the function
-- SELECT * FROM public.create_batch_with_unique_number(
--   'b338839a-f4d4-4761-9a1a-9c09b76ceb7a', -- bread_type_id
--   50, -- actual_quantity
--   'Test batch', -- notes
--   'night', -- shift
--   '00000000-0000-0000-0000-000000000000' -- created_by (replace with actual user ID)
-- );
