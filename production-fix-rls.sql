-- PRODUCTION FIX: RLS Policy for sales_logs DELETE
-- This policy allows users to delete their own sales logs

-- First, check the current policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'sales_logs' AND cmd = 'DELETE';

-- Drop the existing policy to recreate it properly
DROP POLICY IF EXISTS "sales_logs_delete_own_records" ON public.sales_logs;

-- Create the correct policy that works with your app structure
-- The key issue: your app uses public.users table but RLS checks auth.users
CREATE POLICY "sales_logs_delete_own_records" 
ON public.sales_logs 
FOR DELETE 
TO authenticated
USING (
  -- Check if the record belongs to the authenticated user
  recorded_by = auth.uid()
  OR
  -- Allow if user is owner/manager (for admin access)
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('owner', 'manager')
  )
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'sales_logs' AND cmd = 'DELETE';