-- ─────────────────────────────────────────
-- 1. Fix SECURITY DEFINER views
-- ─────────────────────────────────────────
DROP VIEW IF EXISTS public.active_bread_types;
CREATE VIEW public.active_bread_types
  WITH (security_invoker = true) AS
  SELECT id, name, size, unit_price, created_by, created_at, is_active
  FROM public.bread_types
  WHERE is_active = true
  ORDER BY name;

DROP VIEW IF EXISTS public.materialized_view_stats;
CREATE VIEW public.materialized_view_stats
  WITH (security_invoker = true) AS
  SELECT schemaname, matviewname AS view_name, hasindexes, ispopulated, definition
  FROM pg_matviews
  WHERE matviewname = ANY (ARRAY['inventory_realtime'::name, 'shift_statistics_realtime'::name]);

-- ─────────────────────────────────────────
-- 2. push_notification_preferences — CRITICAL
-- ─────────────────────────────────────────
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_push_prefs" ON public.push_notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owners_read_all_push_prefs" ON public.push_notification_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'owner'));

-- ─────────────────────────────────────────
-- 3. user_management_audit — HIGH
-- ─────────────────────────────────────────
ALTER TABLE public.user_management_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_audit" ON public.user_management_audit
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'owner'));

CREATE POLICY "owners_insert_audit" ON public.user_management_audit
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'owner'));

CREATE POLICY "no_audit_updates" ON public.user_management_audit
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "no_audit_deletes" ON public.user_management_audit
  FOR DELETE TO authenticated USING (false);

-- ─────────────────────────────────────────
-- 4. bread_type_sync_log — MEDIUM
-- ─────────────────────────────────────────
ALTER TABLE public.bread_type_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_sync_logs" ON public.bread_type_sync_log
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'owner'));
