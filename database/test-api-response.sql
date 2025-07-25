-- Test the exact query that's being used in the API
-- This simulates what the API is returning

SELECT 
    b.id,
    b.bread_type_id,
    b.batch_number,
    b.target_quantity,
    b.actual_quantity,
    b.status,
    b.created_at,
    b.shift,
    bt.name as bread_type_name,
    bt.unit_price
FROM public.batches b
LEFT JOIN public.bread_types bt ON b.bread_type_id = bt.id
WHERE b.shift = 'night' AND b.status = 'active'
ORDER BY b.created_at DESC
LIMIT 5;
