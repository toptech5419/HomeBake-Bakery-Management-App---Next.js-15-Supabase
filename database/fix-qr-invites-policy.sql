-- Fix qr_invites RLS policy to allow owners to insert records
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own invites" ON qr_invites;
DROP POLICY IF EXISTS "Owners can manage all invites" ON qr_invites;

-- Create new policies that avoid recursive issues
CREATE POLICY "Users can view their own invites" ON qr_invites
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Owners can view all invites" ON qr_invites
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
    );

CREATE POLICY "Owners can insert invites" ON qr_invites
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
    );

CREATE POLICY "Owners can update all invites" ON qr_invites
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
    );

CREATE POLICY "Owners can delete all invites" ON qr_invites
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
    ); 