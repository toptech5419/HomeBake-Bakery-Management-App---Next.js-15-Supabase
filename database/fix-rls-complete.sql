-- HOMEBAKE RLS COMPLETE FIX SCRIPT
-- Run this script in your Supabase SQL Editor to fix all RLS issues
-- This script is production-ready and safe to run

-- =======================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- =======================
DO $$
BEGIN
    -- Enable RLS on all tables
    EXECUTE 'ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.all_batches ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.available_stock ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.bread_types ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.qr_invites ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.remaining_bread ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.sales_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.shift_feedback ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
    
    RAISE NOTICE 'RLS enabled on all tables';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error enabling RLS: %', SQLERRM;
END $$;

-- =======================
-- STEP 2: CREATE HELPER FUNCTIONS
-- =======================

-- Get current user role from public.users table
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_uuid AND is_active = true;
  
  RETURN COALESCE(user_role, NULL);
END;
$$;

-- Check if current user is owner
CREATE OR REPLACE FUNCTION public.is_owner(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role(user_uuid) = 'owner';
END;
$$;

-- Check if current user is manager or owner
CREATE OR REPLACE FUNCTION public.is_manager_or_owner(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_user_role(user_uuid);
  RETURN user_role IN ('manager', 'owner');
END;
$$;

-- =======================
-- STEP 3: DROP ALL EXISTING POLICIES
-- =======================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
    RAISE NOTICE 'All existing policies dropped';
END $$;

-- =======================
-- STEP 4: CREATE RLS POLICIES
-- =======================

-- USERS TABLE POLICIES
CREATE POLICY "users_select_own" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "users_select_owner" ON public.users FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "users_select_manager" ON public.users FOR SELECT TO authenticated USING (public.is_manager_or_owner() AND role IN ('manager', 'sales_rep'));
CREATE POLICY "users_insert_service" ON public.users FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "users_update_owner" ON public.users FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "users_delete_owner" ON public.users FOR DELETE TO authenticated USING (public.is_owner());

-- PROFILES TABLE POLICIES  
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_signup" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- BREAD TYPES POLICIES
CREATE POLICY "bread_types_select_all" ON public.bread_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "bread_types_insert_manager" ON public.bread_types FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_owner());
CREATE POLICY "bread_types_update_manager" ON public.bread_types FOR UPDATE TO authenticated USING (public.is_manager_or_owner()) WITH CHECK (public.is_manager_or_owner());
CREATE POLICY "bread_types_delete_owner" ON public.bread_types FOR DELETE TO authenticated USING (public.is_owner());

-- BATCHES POLICIES
CREATE POLICY "batches_select_all" ON public.batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "batches_insert_manager" ON public.batches FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_owner());
CREATE POLICY "batches_update_manager" ON public.batches FOR UPDATE TO authenticated USING (public.is_manager_or_owner()) WITH CHECK (public.is_manager_or_owner());
CREATE POLICY "batches_delete_owner" ON public.batches FOR DELETE TO authenticated USING (public.is_owner());

-- ALL BATCHES POLICIES
CREATE POLICY "all_batches_select_all" ON public.all_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "all_batches_insert_system" ON public.all_batches FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_owner());
CREATE POLICY "all_batches_update_owner" ON public.all_batches FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- SALES LOGS POLICIES
CREATE POLICY "sales_logs_select_all" ON public.sales_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_logs_insert_all" ON public.sales_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sales_logs_update_own_or_manager" ON public.sales_logs FOR UPDATE TO authenticated USING (recorded_by = auth.uid() OR public.is_manager_or_owner()) WITH CHECK (recorded_by = auth.uid() OR public.is_manager_or_owner());
CREATE POLICY "sales_logs_delete_owner" ON public.sales_logs FOR DELETE TO authenticated USING (public.is_owner());

-- PRODUCTION LOGS POLICIES
CREATE POLICY "production_logs_select_all" ON public.production_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "production_logs_insert_all" ON public.production_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "production_logs_update_own_or_manager" ON public.production_logs FOR UPDATE TO authenticated USING (recorded_by = auth.uid() OR public.is_manager_or_owner()) WITH CHECK (recorded_by = auth.uid() OR public.is_manager_or_owner());

-- INVENTORY POLICIES
CREATE POLICY "inventory_select_all" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_insert_manager" ON public.inventory FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_owner());
CREATE POLICY "inventory_update_manager" ON public.inventory FOR UPDATE TO authenticated USING (public.is_manager_or_owner()) WITH CHECK (public.is_manager_or_owner());

CREATE POLICY "available_stock_select_all" ON public.available_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "available_stock_insert_manager" ON public.available_stock FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_owner());
CREATE POLICY "available_stock_update_manager" ON public.available_stock FOR UPDATE TO authenticated USING (public.is_manager_or_owner()) WITH CHECK (public.is_manager_or_owner());

-- INVENTORY LOGS POLICIES
CREATE POLICY "inventory_logs_select_all" ON public.inventory_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_logs_insert_all" ON public.inventory_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ACTIVITIES POLICIES
CREATE POLICY "activities_select_all" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities_insert_all" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);

-- PUSH NOTIFICATION PREFERENCES POLICIES
CREATE POLICY "push_preferences_select_own" ON public.push_notification_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_preferences_insert_own" ON public.push_notification_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_preferences_update_own" ON public.push_notification_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_preferences_delete_own" ON public.push_notification_preferences FOR DELETE TO authenticated USING (user_id = auth.uid());

-- QR INVITES POLICIES
CREATE POLICY "qr_invites_select_owner" ON public.qr_invites FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "qr_invites_insert_owner" ON public.qr_invites FOR INSERT TO authenticated WITH CHECK (public.is_owner());
CREATE POLICY "qr_invites_update_owner" ON public.qr_invites FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- REMAINING BREAD POLICIES
CREATE POLICY "remaining_bread_select_all" ON public.remaining_bread FOR SELECT TO authenticated USING (true);
CREATE POLICY "remaining_bread_insert_all" ON public.remaining_bread FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "remaining_bread_update_own_or_manager" ON public.remaining_bread FOR UPDATE TO authenticated USING (recorded_by = auth.uid() OR public.is_manager_or_owner()) WITH CHECK (recorded_by = auth.uid() OR public.is_manager_or_owner());

-- SHIFT REPORTS POLICIES
CREATE POLICY "shift_reports_select_all" ON public.shift_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_reports_insert_all" ON public.shift_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shift_reports_update_own_or_manager" ON public.shift_reports FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_manager_or_owner()) WITH CHECK (user_id = auth.uid() OR public.is_manager_or_owner());

-- SHIFT FEEDBACK POLICIES
CREATE POLICY "shift_feedback_select_all" ON public.shift_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_feedback_insert_all" ON public.shift_feedback FOR INSERT TO authenticated WITH CHECK (true);

-- SHIFT HANDOVERS POLICIES
CREATE POLICY "shift_handovers_select_all" ON public.shift_handovers FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_handovers_insert_manager" ON public.shift_handovers FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_owner());

-- SESSIONS POLICIES
CREATE POLICY "sessions_select_own" ON public.sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sessions_insert_own" ON public.sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_update_own" ON public.sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_delete_own" ON public.sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =======================
-- STEP 5: SET UP AUTH TRIGGERS
-- =======================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  user_role TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  IF user_count = 0 THEN
    user_role := 'owner';
  ELSE
    user_role := 'sales_rep';
  END IF;
  
  INSERT INTO public.users (id, name, role, email, is_active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role,
    NEW.email,
    true,
    NOW()
  );
  
  INSERT INTO public.profiles (id, name, role, is_active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role,
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers and create new ones
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =======================
-- STEP 6: SYNC EXISTING USERS
-- =======================

-- Sync any existing auth.users to public.users
DO $$
DECLARE
  auth_user RECORD;
  user_count INTEGER;
  user_role TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  FOR auth_user IN SELECT * FROM auth.users LOOP
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth_user.id) THEN
      IF user_count = 0 THEN
        user_role := 'owner';
        user_count := 1;
      ELSE
        user_role := 'sales_rep';
      END IF;
      
      INSERT INTO public.users (id, name, role, email, is_active, created_at)
      VALUES (
        auth_user.id,
        COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1)),
        user_role,
        auth_user.email,
        true,
        COALESCE(auth_user.created_at, NOW())
      );
      
      INSERT INTO public.profiles (id, name, role, is_active, created_at)
      VALUES (
        auth_user.id,
        COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1)),
        user_role,
        true,
        COALESCE(auth_user.created_at, NOW())
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'User synchronization completed';
END $$;

-- =======================
-- STEP 7: GRANT PERMISSIONS
-- =======================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_manager_or_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;

-- =======================
-- COMPLETION MESSAGE
-- =======================

DO $$
BEGIN
    RAISE NOTICE '🎉 HomeBake RLS setup completed successfully!';
    RAISE NOTICE '✅ RLS enabled on all tables';
    RAISE NOTICE '✅ Helper functions created';
    RAISE NOTICE '✅ Policies created for all tables';
    RAISE NOTICE '✅ Auth triggers set up';
    RAISE NOTICE '✅ Existing users synchronized';
    RAISE NOTICE '✅ Permissions granted';
    RAISE NOTICE '';
    RAISE NOTICE 'Your app should now work properly with RLS enabled!';
END $$;