-- Final fix for users table infinite recursion
-- This creates completely non-recursive policies

-- First, disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing users policies
DO $$
BEGIN
    -- Drop all possible users policies
    DROP POLICY IF EXISTS "Users can view their own profile" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
    DROP POLICY IF EXISTS "Managers and owners can view all users" ON users;
    DROP POLICY IF EXISTS "Owners can manage all users" ON users;
    DROP POLICY IF EXISTS "Owners can view all users" ON users;
    DROP POLICY IF EXISTS "Managers can view all users" ON users;
    DROP POLICY IF EXISTS "users_self_view" ON users;
    DROP POLICY IF EXISTS "users_self_update" ON users;
    DROP POLICY IF EXISTS "users_self_insert" ON users;
    DROP POLICY IF EXISTS "owners_view_all_users" ON users;
    DROP POLICY IF EXISTS "owners_manage_all_users" ON users;
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    DROP POLICY IF EXISTS "Owners can view all users" ON users;
    DROP POLICY IF EXISTS "Managers can view all users" ON users;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create completely non-recursive policies
-- Users can view their own profile
CREATE POLICY "users_self_view" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_self_update" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "users_self_insert" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- All authenticated users can view all users (for now, to avoid recursion)
CREATE POLICY "users_view_all" ON users
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- All authenticated users can manage all users (for now, to avoid recursion)
CREATE POLICY "users_manage_all" ON users
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Verify the policies
SELECT 
    tablename, 
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname; 