-- Clean up duplicate policies and ensure proper owner-only access
-- This script will remove conflicting policies and keep only the correct ones

-- First, disable RLS on users table temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$
BEGIN
    -- Drop all policies that might conflict
    DROP POLICY IF EXISTS "Allow invited user insert" ON users;
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    DROP POLICY IF EXISTS "owners_manage_all_users" ON users;
    DROP POLICY IF EXISTS "owners_view_all_users" ON users;
    DROP POLICY IF EXISTS "users_manage_owner" ON users;
    DROP POLICY IF EXISTS "users_select_authenticated" ON users;
    DROP POLICY IF EXISTS "users_self_insert" ON users;
    DROP POLICY IF EXISTS "users_self_update" ON users;
    DROP POLICY IF EXISTS "users_self_view" ON users;
    DROP POLICY IF EXISTS "users_update_own" ON users;
    
    -- Drop any other policies that might exist
    DROP POLICY IF EXISTS "Users can view their own profile" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
    DROP POLICY IF EXISTS "Managers and owners can view all users" ON users;
    DROP POLICY IF EXISTS "Owners can view all users" ON users;
    DROP POLICY IF EXISTS "Owners can manage all users" ON users;
    DROP POLICY IF EXISTS "Managers can view all users" ON users;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create clean, owner-only policies
CREATE POLICY "users_self_view" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_self_update" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_self_insert" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Only owners can view all users
CREATE POLICY "owners_view_all_users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Only owners can manage all users (insert, update, delete)
CREATE POLICY "owners_manage_all_users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Verify the final policies
SELECT 
    policyname, 
    cmd, 
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname; 