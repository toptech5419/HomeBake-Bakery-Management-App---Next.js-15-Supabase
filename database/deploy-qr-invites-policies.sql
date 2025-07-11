-- Deploy qr_invites RLS policies for production
-- This script should be run in your Supabase SQL editor

-- Enable RLS on qr_invites table (if not already enabled)
ALTER TABLE public.qr_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Owners can view all invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Owners can insert invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Owners can update all invites" ON public.qr_invites;
DROP POLICY IF EXISTS "Owners can delete all invites" ON public.qr_invites;

-- Create new policies that work with your schema
CREATE POLICY "Users can view their own invites" ON public.qr_invites
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Owners can view all invites" ON public.qr_invites
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Owners can insert invites" ON public.qr_invites
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Owners can update all invites" ON public.qr_invites
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Owners can delete all invites" ON public.qr_invites
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'qr_invites'; 