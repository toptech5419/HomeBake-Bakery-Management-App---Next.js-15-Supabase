-- Fix for actual_quantity issue in batch creation
-- This script ensures that actual_quantity is properly set when creating batches

-- Verify the current database function
SELECT 
    routine_name,
    parameter_name,
    data_type,
    parameter_default
FROM information_schema.parameters
WHERE specific_schema = 'public' 
    AND routine_name = 'create_batch_with_unique_number'
ORDER BY ordinal_position;

-- Test the function with actual_quantity
SELECT * FROM public.create_batch_with_unique_number(
    'b338839a-f4d4-4761-9a1a-9c09b76ceb7a', -- bread_type_id
    100, -- target_quantity
    'Test batch with actual quantity', -- notes
    'night', -- shift
    '00000000-0000-0000-0000-000000000000', -- created_by (replace with actual user ID)
    100, -- actual_quantity (this should be used instead of defaulting to target_quantity)
    NOW(), -- start_time
    'active' -- status
);

-- Check the result
SELECT 
    id,
    batch_number,
    target_quantity,
    actual_quantity,
    shift,
    created_at
FROM public.batches
WHERE bread_type_id = 'b338839a-f4d4-4761-9a1a-9c09b76ceb7a'
    AND shift = 'night'
ORDER BY created_at DESC
LIMIT 1;
