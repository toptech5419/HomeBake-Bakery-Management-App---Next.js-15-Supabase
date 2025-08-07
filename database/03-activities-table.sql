-- Activities table for live notifications in owner dashboard
-- This table will store all user activities for real-time notifications

CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL CHECK (user_role = ANY (ARRAY['manager'::text, 'sales_rep'::text])),
  activity_type text NOT NULL CHECK (activity_type = ANY (ARRAY['sale'::text, 'batch'::text, 'report'::text, 'login'::text, 'end_shift'::text, 'created'::text])),
  shift text CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Index for faster queries by date (for 3-day cleanup and date grouping)
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);

-- Index for faster user-based queries
CREATE INDEX idx_activities_user_role ON public.activities(user_role, created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create policy for owners to see all activities
CREATE POLICY "Owners can view all activities" ON public.activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'owner'
    )
  );

-- Create policy for managers and sales reps to insert their own activities
CREATE POLICY "Users can insert their own activities" ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);