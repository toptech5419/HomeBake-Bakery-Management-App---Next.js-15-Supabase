-- Final cleanup for qr_invites policies
-- Remove conflicting and overly permissive policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "qr_invites_manage_owner" ON public.qr_invites;
DROP POLICY IF EXISTS "qr_invites_select_all" ON public.qr_invites;

-- Verify the final clean state
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'qr_invites'
ORDER BY policyname;

-- Test the policies work correctly
-- This should show only the policies we want:
-- 1. qr_invites_owners_insert
-- 2. qr_invites_owners_update  
-- 3. qr_invites_owners_delete
-- 4. qr_invites_owners_view_all
-- 5. qr_invites_users_view_own 