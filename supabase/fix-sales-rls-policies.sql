-- Comprehensive fix for sales_logs RLS policies
-- This script will fix the RLS issues preventing sales reps from recording sales

-- Step 1: Review and clean up existing policies
DROP POLICY IF EXISTS "Owners and managers can update sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "sales_logs_delete_owner" ON public.sales_logs;
DROP POLICY IF EXISTS "sales_logs_insert_authenticated" ON public.sales_logs;
DROP POLICY IF EXISTS "sales_logs_manage_owner" ON public.sales_logs;
DROP POLICY IF EXISTS "sales_logs_select_all" ON public.sales_logs;
DROP POLICY IF EXISTS "Users can insert sales logs" ON public.sales_logs;
DROP POLICY IF EXISTS "Users can view sales logs" ON public.sales_logs;

-- Step 2: Create proper RLS policies for sales_logs
-- Allow all authenticated users to view sales logs
CREATE POLICY "Allow all authenticated users to view sales logs" ON public.sales_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow sales reps, managers, and owners to insert sales logs
CREATE POLICY "Allow sales reps to insert sales logs" ON public.sales_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('sales_rep', 'manager', 'owner')
    )
  );

-- Allow managers and owners to update/delete sales logs
CREATE POLICY "Allow managers and owners to manage sales logs" ON public.sales_logs
  FOR UPDATE, DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'owner')
    )
  );

-- Step 3: Ensure proper permissions
GRANT SELECT, INSERT ON public.sales_logs TO authenticated;
GRANT UPDATE, DELETE ON public.sales_logs TO authenticated;

-- Step 4: Test the fix
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'sales_logs'
ORDER BY policyname;

-- Step 5: Test insert functionality
-- This should work after running the script
INSERT INTO public.sales_logs (bread_type_id, quantity, unit_price, discount, shift, recorded_by)
VALUES (
  (SELECT id FROM public.bread_types LIMIT 1),
  5,
  100.00,
  0.00,
  'morning',
  auth.uid()
) RETURNING *;

-- Step 6: Verify data is being saved
SELECT * FROM public.sales_logs ORDER BY created_at DESC LIMIT 5;
