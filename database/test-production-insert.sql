-- TEST DIRECT INSERT INTO PRODUCTION_LOGS
-- This will show us exactly what error occurs when trying to insert

-- First, let's see the table structure again
SELECT 'PRODUCTION_LOGS STRUCTURE' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'production_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what bread types are available
SELECT 'AVAILABLE BREAD TYPES' as section;

SELECT id, name FROM bread_types LIMIT 3;

-- Try a test insert with actual data
SELECT 'TEST INSERT' as section;

-- Let's try to insert a test record
INSERT INTO production_logs (
  bread_type_id,
  quantity,
  shift,
  recorded_by,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM bread_types LIMIT 1),  -- Use first bread type
  5,                                      -- quantity
  'morning',                             -- shift
  'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9', -- recorded_by (your manager ID)
  NOW(),                                 -- created_at
  NOW()                                  -- updated_at
);

-- If the insert succeeds, let's see the record
SELECT 'INSERTED RECORD' as section;

SELECT * FROM production_logs 
WHERE recorded_by = 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9'
ORDER BY created_at DESC 
LIMIT 1;