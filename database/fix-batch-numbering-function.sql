-- Update the batch creation function to properly handle shift-based numbering
-- This ensures batch numbers are unique per bread type AND shift

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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_batch_with_unique_number(
  uuid, integer, text, text, uuid, integer, timestamptz, text
) TO authenticated;

-- Test the function
-- SELECT * FROM public.create_batch_with_unique_number(
--   'b338839a-f4d4-4761-9a1a-9c09b76ceb7a', 
--   50, 
--   'Test batch', 
--   'night', 
--   '00000000-0000-0000-0000-000000000000'
-- );
