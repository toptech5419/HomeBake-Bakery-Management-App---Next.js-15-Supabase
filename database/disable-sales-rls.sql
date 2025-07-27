-- Disable RLS on sales_logs table
-- This will allow all operations without RLS restrictions

-- Disable RLS on sales_logs table
ALTER TABLE public.sales_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for sales_logs
DROP POLICY IF EXISTS "Users can view sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Users can insert sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Users can update their own sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Users can delete their own sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Owners and managers can update sales logs" ON public.sales_logs;

-- Also disable RLS on remaining_bread table for consistency
ALTER TABLE public.remaining_bread DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for remaining_bread
DROP POLICY IF EXISTS "Users can view remaining bread" ON public.remaining_bread;
DROP POLICY IF EXISTS "Users can insert remaining bread" ON public.remaining_bread;
DROP POLICY IF EXISTS "Users can update remaining bread" ON public.remaining_bread;
DROP POLICY IF EXISTS "Users can delete remaining bread" ON public.remaining_bread;

-- Verify the changes
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('sales_logs', 'remaining_bread');

-- Show that no policies exist for sales_logs
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename = 'sales_logs'; 