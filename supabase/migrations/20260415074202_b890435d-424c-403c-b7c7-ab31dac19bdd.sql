
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create scheduled_scans table
CREATE TABLE public.scheduled_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_url TEXT NOT NULL,
  cron_expression TEXT NOT NULL DEFAULT '0 3 * * 1',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled scans"
  ON public.scheduled_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled scans"
  ON public.scheduled_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled scans"
  ON public.scheduled_scans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled scans"
  ON public.scheduled_scans FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_scheduled_scans_updated_at
  BEFORE UPDATE ON public.scheduled_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
