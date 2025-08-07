-- TEMPORARY: Disable RLS on activities table for testing
-- This is just for testing - you should re-enable RLS after confirming it works

-- Disable RLS temporarily
ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;

-- Note: After testing, you can re-enable RLS with:
-- ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;