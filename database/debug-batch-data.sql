-- Debug script to check batch data
-- Run this in your Supabase SQL editor to see what's actually stored

-- Check all batches for night shift
SELECT 
    id,
    bread_type_id,
    batch_number,
    target_quantity,
    actual_quantity,
    status,
    shift,
    created_at,
    bread_type_id::text as bread_type_uuid
FROM public.batches 
WHERE shift = 'night'
ORDER BY created_at DESC
LIMIT 10;

-- Check if bread types exist
SELECT 
    id,
    name,
    unit_price
FROM public.bread_types
WHERE id IN (
    SELECT DISTINCT bread_type_id 
    FROM public.batches 
    WHERE shift = 'night'
);

-- Check for any data issues
SELECT 
    COUNT(*) as total_batches,
    COUNT(CASE WHEN actual_quantity = 0 THEN 1 END) as zero_actual,
    COUNT(CASE WHEN actual_quantity IS NULL THEN 1 END) as null_actual,
    COUNT(CASE WHEN actual_quantity = target_quantity THEN 1 END) as same_as_target,
    AVG(actual_quantity) as avg_actual,
    AVG(target_quantity) as avg_target
FROM public.batches 
WHERE shift = 'night';
