-- Simple fix for users table policies
-- This script safely creates owner-only policies

-- First, disable RLS on users table temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for users table (safe approach)
DO $$
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Users can view their own profile" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
    DROP POLICY IF EXISTS "Managers and owners can view all users" ON users;
    DROP POLICY IF EXISTS "Owners can view all users" ON users;
    DROP POLICY IF EXISTS "Owners can manage all users" ON users;
    DROP POLICY IF EXISTS "Managers can view all users" ON users;
    
    -- Drop any other policies that might exist
    DROP POLICY IF EXISTS "Users can view their own profile" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
    DROP POLICY IF EXISTS "Owners can view all users" ON users;
    DROP POLICY IF EXISTS "Owners can manage all users" ON users;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
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

-- Only owners can manage all users
CREATE POLICY "owners_manage_all_users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Verify the policies
SELECT 
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname; 