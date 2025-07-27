-- Fix Sales Logs RLS Policies
-- This script enables RLS and adds proper policies for sales_logs table

-- Enable RLS on sales_logs table
ALTER TABLE public.sales_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Users can insert sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Owners and managers can update sales logs" ON public.sales_logs;

-- Create new policies for sales_logs
CREATE POLICY "Users can view sales logs" ON public.sales_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert sales logs" ON public.sales_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Users can update their own sales logs" ON public.sales_logs
    FOR UPDATE USING (recorded_by = auth.uid());

CREATE POLICY "Users can delete their own sales logs" ON public.sales_logs
    FOR DELETE USING (recorded_by = auth.uid());

-- Also enable RLS on remaining_bread table
ALTER TABLE public.remaining_bread ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view remaining bread" ON public.remaining_bread;
DROP POLICY IF EXISTS "Users can insert remaining bread" ON public.remaining_bread;
DROP POLICY IF EXISTS "Users can update remaining bread" ON public.remaining_bread;
DROP POLICY IF EXISTS "Users can delete remaining bread" ON public.remaining_bread;

-- Create new policies for remaining_bread
CREATE POLICY "Users can view remaining bread" ON public.remaining_bread
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert remaining bread" ON public.remaining_bread
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Users can update remaining bread" ON public.remaining_bread
    FOR UPDATE USING (recorded_by = auth.uid());

CREATE POLICY "Users can delete remaining bread" ON public.remaining_bread
    FOR DELETE USING (recorded_by = auth.uid());

-- Verify the changes
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('sales_logs', 'remaining_bread');

-- Show policies for sales_logs
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sales_logs'; 