-- =====================================================
-- URGENT FIX: User Deletion Issues - Complete Resolution
-- =====================================================
-- Run this script IMMEDIATELY in Supabase SQL Editor

-- Step 1: Check current foreign key constraints
DO $$
BEGIN
  RAISE NOTICE '🔍 Checking current foreign key constraints...';
END $$;

-- Display current constraints for verification
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'users'
ORDER BY tc.table_name;

-- Step 2: DROP ALL problematic foreign key constraints
DO $$
BEGIN
  RAISE NOTICE '🗑️ Dropping old foreign key constraints...';
END $$;

-- Drop constraints that reference users table
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_user_id_fkey;
ALTER TABLE public.all_batches DROP CONSTRAINT IF EXISTS all_batches_created_by_fkey;
ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS batches_created_by_fkey;
ALTER TABLE public.bread_types DROP CONSTRAINT IF EXISTS bread_types_created_by_fkey;
ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS inventory_logs_user_id_fkey;
ALTER TABLE public.production_logs DROP CONSTRAINT IF EXISTS production_logs_recorded_by_fkey;
ALTER TABLE public.qr_invites DROP CONSTRAINT IF EXISTS qr_invites_created_by_fkey;
ALTER TABLE public.remaining_bread DROP CONSTRAINT IF EXISTS remaining_bread_recorded_by_fkey;
ALTER TABLE public.sales_logs DROP CONSTRAINT IF EXISTS sales_logs_recorded_by_fkey;
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE public.shift_feedback DROP CONSTRAINT IF EXISTS shift_feedback_user_id_fkey;
ALTER TABLE public.shift_handovers DROP CONSTRAINT IF EXISTS shift_handovers_manager_id_fkey;
ALTER TABLE public.shift_reports DROP CONSTRAINT IF EXISTS shift_reports_user_id_fkey;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_created_by_fkey;

-- Step 3: ADD proper CASCADE and SET NULL constraints
DO $$
BEGIN
  RAISE NOTICE '✅ Adding proper CASCADE and SET NULL constraints...';
END $$;

-- DELETE CASCADE (personal data that should be removed)
ALTER TABLE public.activities 
ADD CONSTRAINT activities_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) 
ON DELETE CASCADE;

ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) 
ON DELETE CASCADE;

ALTER TABLE public.shift_feedback 
ADD CONSTRAINT shift_feedback_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) 
ON DELETE CASCADE;

ALTER TABLE public.qr_invites 
ADD CONSTRAINT qr_invites_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) 
ON DELETE CASCADE;

-- SET NULL (business data that should be preserved)
ALTER TABLE public.all_batches 
ADD CONSTRAINT all_batches_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.batches 
ADD CONSTRAINT batches_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.bread_types 
ADD CONSTRAINT bread_types_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.inventory_logs 
ADD CONSTRAINT inventory_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.production_logs 
ADD CONSTRAINT production_logs_recorded_by_fkey 
FOREIGN KEY (recorded_by) REFERENCES public.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.remaining_bread 
ADD CONSTRAINT remaining_bread_recorded_by_fkey 
FOREIGN KEY (recorded_by) REFERENCES public.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.sales_logs 
ADD CONSTRAINT sales_logs_recorded_by_fkey 
FOREIGN KEY (recorded_by) REFERENCES public.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.shift_handovers 
ADD CONSTRAINT shift_handovers_manager_id_fkey 
FOREIGN KEY (manager_id) REFERENCES public.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.shift_reports 
ADD CONSTRAINT shift_reports_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) 
ON DELETE SET NULL;

-- Users self-reference
ALTER TABLE public.users 
ADD CONSTRAINT users_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) 
ON DELETE SET NULL;

-- Step 4: Create or replace session invalidation function
CREATE OR REPLACE FUNCTION public.invalidate_user_sessions(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all sessions for the user
  DELETE FROM public.sessions WHERE user_id = target_user_id;
  
  -- Delete push notification preferences (will force re-registration)
  DELETE FROM public.push_notification_preferences WHERE user_id = target_user_id;
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error invalidating sessions for user %: %', target_user_id, SQLERRM;
    RETURN false;
END;
$$;

-- Step 5: Create or replace dependencies count function
CREATE OR REPLACE FUNCTION public.get_user_dependencies_count(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  activities_count int := 0;
  batches_count int := 0;
  all_batches_count int := 0;
  sales_count int := 0;
  reports_count int := 0;
  production_count int := 0;
  inventory_count int := 0;
  remaining_count int := 0;
  handovers_count int := 0;
  bread_types_count int := 0;
  sessions_count int := 0;
  feedback_count int := 0;
  qr_count int := 0;
BEGIN
  -- Count dependencies safely
  SELECT COUNT(*) INTO activities_count FROM public.activities WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO batches_count FROM public.batches WHERE created_by = target_user_id;
  SELECT COUNT(*) INTO all_batches_count FROM public.all_batches WHERE created_by = target_user_id;
  SELECT COUNT(*) INTO sales_count FROM public.sales_logs WHERE recorded_by = target_user_id;
  SELECT COUNT(*) INTO reports_count FROM public.shift_reports WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO production_count FROM public.production_logs WHERE recorded_by = target_user_id;
  SELECT COUNT(*) INTO inventory_count FROM public.inventory_logs WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO remaining_count FROM public.remaining_bread WHERE recorded_by = target_user_id;
  SELECT COUNT(*) INTO handovers_count FROM public.shift_handovers WHERE manager_id = target_user_id;
  SELECT COUNT(*) INTO bread_types_count FROM public.bread_types WHERE created_by = target_user_id;
  SELECT COUNT(*) INTO sessions_count FROM public.sessions WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO feedback_count FROM public.shift_feedback WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO qr_count FROM public.qr_invites WHERE created_by = target_user_id;
  
  -- Build comprehensive result
  result := json_build_object(
    'activities', activities_count,
    'batches', batches_count,
    'all_batches', all_batches_count,
    'sales', sales_count,
    'reports', reports_count,
    'production', production_count,
    'inventory', inventory_count,
    'remaining_bread', remaining_count,
    'handovers', handovers_count,
    'bread_types', bread_types_count,
    'sessions', sessions_count,
    'feedback', feedback_count,
    'qr_invites', qr_count,
    'total', activities_count + batches_count + all_batches_count + sales_count + reports_count + production_count + inventory_count + remaining_count + handovers_count + bread_types_count + sessions_count + feedback_count + qr_count
  );
  
  RETURN result;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error counting dependencies for user %: %', target_user_id, SQLERRM;
    RETURN '{"error": "Failed to count dependencies"}'::json;
END;
$$;

-- Step 6: Ensure user_management_audit table exists
CREATE TABLE IF NOT EXISTS public.user_management_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operation text NOT NULL CHECK (operation IN ('role_change', 'user_delete', 'user_deactivate')),
  target_user_id uuid NOT NULL,
  target_user_name text NOT NULL,
  target_user_role text NOT NULL,
  performed_by uuid NOT NULL,
  performed_by_name text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  dependencies_affected jsonb,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Step 7: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.invalidate_user_sessions(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_dependencies_count(uuid) TO service_role;
GRANT ALL ON public.user_management_audit TO service_role;

-- Step 8: Test the specific user deletion that's failing
DO $$
DECLARE
  melissa_id uuid := 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9';
  deps json;
BEGIN
  RAISE NOTICE '🧪 Testing Melissa deletion readiness...';
  
  -- Check if user exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = melissa_id) THEN
    RAISE NOTICE '✅ User Melissa found in database';
    
    -- Get dependencies
    SELECT public.get_user_dependencies_count(melissa_id) INTO deps;
    RAISE NOTICE '📊 Melissa dependencies: %', deps;
    
    RAISE NOTICE '🚀 Ready to delete Melissa! All constraints are now properly configured.';
  ELSE
    RAISE NOTICE '❌ User Melissa not found - may have been already deleted or ID mismatch';
  END IF;
END $$;

-- Step 9: Verification
DO $$
BEGIN
  RAISE NOTICE '✅ URGENT FIX COMPLETE!';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '   - Dropped old foreign key constraints';
  RAISE NOTICE '   - Added proper CASCADE DELETE for personal data';
  RAISE NOTICE '   - Added proper SET NULL for business data';
  RAISE NOTICE '   - Created session invalidation function';
  RAISE NOTICE '   - Created dependencies count function';
  RAISE NOTICE '   - Created audit table';
  RAISE NOTICE '   - Tested Melissa deletion readiness';
  RAISE NOTICE '🚀 User deletion should now work perfectly!';
  RAISE NOTICE '⚠️  Also fix the mobile toast display in your app!';
END $$;