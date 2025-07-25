-- HomeBake Bakery Management System - Supabase Migration Scripts (FIXED)
-- Scripts to run in Supabase SQL Editor for target_quantity → actual_quantity migration
-- Fixed to handle the exact function signature error

-- =====================================================
-- STEP 1: Drop the existing function with EXACT signature
-- =====================================================
-- Drop the function with the exact signature that's causing the error
DROP FUNCTION IF EXISTS public.create_batch_with_unique_number(
  p_bread_type_id uuid,
  p_target_quantity integer,
  p_notes text,
  p_shift text,
  p_created_by uuid,
  p_start_time timestamp with time zone,
  p_status text
);

-- Also try dropping with other possible signatures
DROP FUNCTION IF EXISTS public.create_batch_with_unique_number(
  uuid, integer, text, text, uuid, timestamp with time zone, text
);

DROP FUNCTION IF EXISTS public.create_batch_with_unique_number(
  uuid, integer, text, text, uuid, timestamp with time zone
);

DROP FUNCTION IF EXISTS public.create_batch_with_unique_number(
  uuid, integer, text, text, uuid
);

-- =====================================================
-- STEP 2: Create updated function using actual_quantity only
-- =====================================================
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
-- STEP 3: Force drop any remaining function variants
-- =====================================================
-- This will drop ALL versions of the function regardless of signature
DROP FUNCTION IF EXISTS public.create_batch_with_unique_number CASCADE;

-- Now create the new function
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
-- STEP 4: Update Table Schema (if target_quantity exists)
-- =====================================================
-- Make target_quantity nullable (safe operation)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'target_quantity'
    ) THEN
        ALTER TABLE public.batches ALTER COLUMN target_quantity DROP NOT NULL;
        
        -- Update existing data to use actual_quantity
        UPDATE public.batches 
        SET actual_quantity = COALESCE(actual_quantity, target_quantity, 0)
        WHERE actual_quantity IS NULL OR actual_quantity = 0;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'all_batches' AND column_name = 'target_quantity'
    ) THEN
        ALTER TABLE public.all_batches ALTER COLUMN target_quantity DROP NOT NULL;
        
        UPDATE public.all_batches 
        SET actual_quantity = COALESCE(actual_quantity, target_quantity, 0)
        WHERE actual_quantity IS NULL OR actual_quantity = 0;
    END IF;
END $$;

-- =====================================================
-- STEP 5: Update Comments
-- =====================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'actual_quantity'
    ) THEN
        COMMENT ON COLUMN batches.actual_quantity IS 'Actual quantity produced for this batch';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'all_batches' AND column_name = 'actual_quantity'
    ) THEN
        COMMENT ON COLUMN all_batches.actual_quantity IS 'Actual quantity produced for this batch';
    END IF;
END $$;

-- =====================================================
-- STEP 6: Verify Changes
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

-- Check if function exists and its signature
SELECT 
    proname,
    pg_get_function_identity_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'create_batch_with_unique_number'
AND pronamespace = 'public'::regnamespace;

-- Test the updated function
-- SELECT * FROM public.create_batch_with_unique_number(
--     '00000000-0000-0000-0000-000000000000', -- Replace with actual bread_type_id
--     50, -- actual_quantity
--     'Test batch', -- notes
--     'morning', -- shift
--     '00000000-0000-0000-0000-000000000000' -- Replace with actual user_id
-- );
