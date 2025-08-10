-- HomeBake Authentication Triggers and Functions
-- This script sets up automatic user profile creation and management

-- =======================
-- USER CREATION TRIGGER FUNCTION
-- =======================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  user_role TEXT;
BEGIN
  -- Count existing users to determine if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- First user gets owner role, others get sales_rep by default
  IF user_count = 0 THEN
    user_role := 'owner';
  ELSE
    user_role := 'sales_rep';
  END IF;
  
  -- Insert into public.users table
  INSERT INTO public.users (id, name, role, email, is_active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role,
    NEW.email,
    true,
    NOW()
  );
  
  -- Also insert into profiles table for compatibility
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
    -- Log the error and continue
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- USER UPDATE TRIGGER FUNCTION
-- =======================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_user_update() CASCADE;

-- Function to sync user updates between auth.users and public.users
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update public.users when auth.users is updated
  UPDATE public.users SET
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    email = NEW.email
  WHERE id = NEW.id;
  
  -- Update profiles table as well
  UPDATE public.profiles SET
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_user_update: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- USER DELETION TRIGGER FUNCTION
-- =======================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_user_delete() CASCADE;

-- Function to clean up user data when auth.users is deleted
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from public.users
  DELETE FROM public.users WHERE id = OLD.id;
  
  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = OLD.id;
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_user_delete: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- CREATE TRIGGERS
-- =======================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for user updates
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Trigger for user deletion
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- =======================
-- FUNCTION TO SYNC EXISTING USERS
-- =======================

-- Function to sync existing auth.users to public.users
CREATE OR REPLACE FUNCTION public.sync_auth_users()
RETURNS void AS $$
DECLARE
  auth_user RECORD;
  user_count INTEGER;
  user_role TEXT;
BEGIN
  -- Get count of existing users in public.users
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- Loop through auth.users and sync to public.users
  FOR auth_user IN SELECT * FROM auth.users LOOP
    -- Skip if user already exists in public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE id = auth_user.id) THEN
      CONTINUE;
    END IF;
    
    -- Determine role (first user is owner, others are sales_rep)
    IF user_count = 0 THEN
      user_role := 'owner';
      user_count := 1;
    ELSE
      user_role := 'sales_rep';
    END IF;
    
    -- Insert into public.users
    INSERT INTO public.users (id, name, role, email, is_active, created_at)
    VALUES (
      auth_user.id,
      COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1)),
      user_role,
      auth_user.email,
      true,
      COALESCE(auth_user.created_at, NOW())
    );
    
    -- Also insert into profiles
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
      
  END LOOP;
  
  RAISE NOTICE 'User synchronization completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to handle any existing users
SELECT public.sync_auth_users();

-- =======================
-- GRANT PERMISSIONS
-- =======================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_delete() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_auth_users() TO service_role;