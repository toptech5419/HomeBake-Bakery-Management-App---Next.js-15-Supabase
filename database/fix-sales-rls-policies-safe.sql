-- Fix Sales Logs RLS Policies (Safe Version)
-- This script safely enables RLS and adds proper policies for sales_logs table

-- Enable RLS on sales_logs table (safe - won't error if already enabled)
ALTER TABLE public.sales_logs ENABLE ROW LEVEL SECURITY;

-- Safely drop existing policies if they exist (using IF EXISTS)
DROP POLICY IF EXISTS "Users can view sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Users can insert sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Users can update their own sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Users can delete their own sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Owners and managers can update sales logs" ON public.sales_logs;

-- Create new policies for sales_logs (using IF NOT EXISTS pattern)
DO $$
BEGIN
    -- Create SELECT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales_logs' 
        AND policyname = 'Users can view sales logs'
    ) THEN
        CREATE POLICY "Users can view sales logs" ON public.sales_logs
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;

    -- Create INSERT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales_logs' 
        AND policyname = 'Users can insert sales logs'
    ) THEN
        CREATE POLICY "Users can insert sales logs" ON public.sales_logs
            FOR INSERT WITH CHECK (recorded_by = auth.uid());
    END IF;

    -- Create UPDATE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales_logs' 
        AND policyname = 'Users can update their own sales logs'
    ) THEN
        CREATE POLICY "Users can update their own sales logs" ON public.sales_logs
            FOR UPDATE USING (recorded_by = auth.uid());
    END IF;

    -- Create DELETE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales_logs' 
        AND policyname = 'Users can delete their own sales logs'
    ) THEN
        CREATE POLICY "Users can delete their own sales logs" ON public.sales_logs
            FOR DELETE USING (recorded_by = auth.uid());
    END IF;
END $$;

-- Also enable RLS on remaining_bread table
ALTER TABLE public.remaining_bread ENABLE ROW LEVEL SECURITY;

-- Safely drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view remaining bread" ON public.remaining_bread;
DROP POLICY IF EXISTS "Users can insert remaining bread" ON public.remaining_bread;
DROP POLICY IF EXISTS "Users can update remaining bread" ON public.remaining_bread;
DROP POLICY IF EXISTS "Users can delete remaining bread" ON public.remaining_bread;

-- Create new policies for remaining_bread
DO $$
BEGIN
    -- Create SELECT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'remaining_bread' 
        AND policyname = 'Users can view remaining bread'
    ) THEN
        CREATE POLICY "Users can view remaining bread" ON public.remaining_bread
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;

    -- Create INSERT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'remaining_bread' 
        AND policyname = 'Users can insert remaining bread'
    ) THEN
        CREATE POLICY "Users can insert remaining bread" ON public.remaining_bread
            FOR INSERT WITH CHECK (recorded_by = auth.uid());
    END IF;

    -- Create UPDATE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'remaining_bread' 
        AND policyname = 'Users can update remaining bread'
    ) THEN
        CREATE POLICY "Users can update remaining bread" ON public.remaining_bread
            FOR UPDATE USING (recorded_by = auth.uid());
    END IF;

    -- Create DELETE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'remaining_bread' 
        AND policyname = 'Users can delete remaining bread'
    ) THEN
        CREATE POLICY "Users can delete remaining bread" ON public.remaining_bread
            FOR DELETE USING (recorded_by = auth.uid());
    END IF;
END $$;

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