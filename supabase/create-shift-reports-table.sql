-- Create shift_reports table to store complete shift reports
CREATE TABLE public.shift_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_items_sold integer NOT NULL DEFAULT 0,
  total_remaining numeric NOT NULL DEFAULT 0,
  feedback text,
  sales_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  remaining_breads jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_reports_pkey PRIMARY KEY (id),
  CONSTRAINT shift_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_shift_reports_user_id ON public.shift_reports(user_id);
CREATE INDEX idx_shift_reports_shift ON public.shift_reports(shift);
CREATE INDEX idx_shift_reports_date ON public.shift_reports(report_date);

-- Enable RLS
ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own reports" ON public.shift_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports" ON public.shift_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" ON public.shift_reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" ON public.shift_reports
  FOR DELETE USING (auth.uid() = user_id);

-- Allow managers and owners to view all reports
CREATE POLICY "Managers and owners can view all reports" ON public.shift_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('manager', 'owner')
    )
  );
