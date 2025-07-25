-- Migration to remove target_quantity column and use actual_quantity only
-- This script will:
-- 1. Remove target_quantity from batches table
-- 2. Remove target_quantity from all_batches table  
-- 3. Update the create_batch_with_unique_number function
-- 4. Update all related constraints and indexes

-- Step 1: Backup existing data (optional but recommended)
-- CREATE TABLE batches_backup AS SELECT * FROM batches;
-- CREATE TABLE all_batches_backup AS SELECT * FROM all_batches;

-- Step 2: Update the database function to remove target_quantity parameter
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
  p_quantity integer,
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
  quantity integer,
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
    next_number := COALESCE((regexp_replace(last_batch_number, '\\D', '', 'g'))::int, 0) + 1;
  END IF;

  new_batch_number := lpad(next_number::text, 3, '0');

  INSERT INTO public.batches (
    bread_type_id, batch_number, start_time, quantity,
    status, notes, created_by, shift
  ) VALUES (
    p_bread_type_id,
    new_batch_number,
    COALESCE(p_start_time, now()),
    p_quantity,
    p_status,
    p_notes,
    p_created_by,
    p_shift
  )
  RETURNING batches.id, batches.bread_type_id, batches.batch_number, batches.start_time, batches.end_time, batches.quantity, batches.status, batches.notes, batches.created_by, batches.created_at, batches.updated_at, batches.shift
  INTO id, bread_type_id, batch_number, start_time, end_time, quantity, status, notes, created_by, created_at, updated_at, shift;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Alter tables to remove target_quantity column
-- Note: These are destructive operations - run only after confirming backup
-- ALTER TABLE public.batches DROP COLUMN IF EXISTS target_quantity;
-- ALTER TABLE public.all_batches DROP COLUMN IF EXISTS target_quantity;

-- Step 4: Rename actual_quantity to quantity for consistency
-- ALTER TABLE public.batches RENAME COLUMN actual_quantity TO quantity;
-- ALTER TABLE public.all_batches RENAME COLUMN actual_quantity TO quantity;

-- Step 5: Update any constraints or indexes that reference target_quantity
-- (None found in current schema)

-- Step 6: Verify the changes
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('batches', 'all_batches')
    AND column_name LIKE '%quantity%'
ORDER BY table_name, ordinal_position;
