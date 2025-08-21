-- =====================================================
-- FIX ALL_BATCHES RLS POLICIES FOR MANAGER END SHIFT
-- This will allow managers to save batches to all_batches
-- =====================================================

-- 1. DROP EXISTING PROBLEMATIC INSERT POLICY
DROP POLICY IF EXISTS "all_batches_insert_system" ON all_batches;

-- 2. CREATE NEW INSERT POLICY THAT WORKS FOR MANAGERS
CREATE POLICY "all_batches_insert_manager" ON all_batches
FOR INSERT
WITH CHECK (
  -- Allow insertion if the user is a manager or owner
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'owner')
    AND is_active = true
  )
  AND
  -- And they're inserting their own batches
  created_by = auth.uid()
);

-- 3. ENSURE RLS IS ENABLED
ALTER TABLE all_batches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'all_batches' 
ORDER BY cmd, policyname;

-- =====================================================
-- HOW TO RUN THIS SCRIPT
-- =====================================================
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor  
-- 3. Paste this entire script
-- 4. Click "Run"
-- 5. Test manager end shift - saving to all_batches should work now!
-- =====================================================