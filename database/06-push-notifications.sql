-- Push notifications support for HomeBake
-- Stores user push notification preferences and browser subscriptions

-- Create push_notification_preferences table
CREATE TABLE IF NOT EXISTS public.push_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  endpoint text,
  p256dh_key text,
  auth_key text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_preferences_user_id ON public.push_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_push_preferences_enabled ON public.push_notification_preferences(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own notification preferences
CREATE POLICY "Users can manage own push preferences" 
ON public.push_notification_preferences 
FOR ALL 
USING (user_id = auth.uid());

-- RLS Policy: Owners can view all push preferences (for system management)
CREATE POLICY "Owners can view all push preferences" 
ON public.push_notification_preferences 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'owner'
  )
);

-- Function to update timestamp on row update
CREATE OR REPLACE FUNCTION update_push_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_push_preferences_timestamp
  BEFORE UPDATE ON public.push_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_push_preferences_timestamp();

-- Insert default preference for existing owner users
INSERT INTO public.push_notification_preferences (user_id, enabled)
SELECT id, true 
FROM public.users 
WHERE role = 'owner'
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE public.push_notification_preferences IS 'Stores user push notification preferences and browser push subscriptions';
COMMENT ON COLUMN public.push_notification_preferences.endpoint IS 'Push service endpoint URL from browser subscription';
COMMENT ON COLUMN public.push_notification_preferences.p256dh_key IS 'P256DH key from browser subscription for encryption';
COMMENT ON COLUMN public.push_notification_preferences.auth_key IS 'Auth key from browser subscription';
COMMENT ON COLUMN public.push_notification_preferences.user_agent IS 'Browser user agent for debugging';