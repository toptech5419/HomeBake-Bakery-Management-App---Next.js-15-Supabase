-- Safe fix for qr_invites RLS policies
-- This script handles existing policies properly

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'qr_invites';

-- Drop ALL existing policies for qr_invites (if any exist)
DROP POLICY IF EXISTS "Users can view their own invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Owners can view all invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Owners can insert invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Owners can update all invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Owners can delete all invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Owners can manage all invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Users can manage their own invites" ON public.qr_invites;

-- Enable RLS (in case it's not enabled)
ALTER TABLE public.qr_invites ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper naming to avoid conflicts
CREATE POLICY "qr_invites_users_view_own" ON public.qr_invites
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "qr_invites_owners_view_all" ON public.qr_invites
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "qr_invites_owners_insert" ON public.qr_invites
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "qr_invites_owners_update" ON public.qr_invites
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "qr_invites_owners_delete" ON public.qr_invites
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Verify the new policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'qr_invites'
ORDER BY policyname; 