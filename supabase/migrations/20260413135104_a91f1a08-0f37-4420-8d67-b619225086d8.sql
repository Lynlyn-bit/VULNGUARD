
-- User scan configuration (ZAP API settings)
CREATE TABLE public.user_scan_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  zap_api_url TEXT NOT NULL DEFAULT '',
  zap_api_key TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_scan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own config"
  ON public.user_scan_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
  ON public.user_scan_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
  ON public.user_scan_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own config"
  ON public.user_scan_config FOR DELETE
  USING (auth.uid() = user_id);

-- Scan jobs table
CREATE TABLE public.scan_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'spidering', 'scanning', 'completed', 'failed')),
  zap_spider_id TEXT,
  zap_scan_id TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scan jobs"
  ON public.scan_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan jobs"
  ON public.scan_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scan jobs"
  ON public.scan_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scan jobs"
  ON public.scan_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Real vulnerability findings
CREATE TABLE public.scan_vulnerabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_job_id UUID NOT NULL REFERENCES public.scan_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  alert_name TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'Informational',
  confidence TEXT NOT NULL DEFAULT 'Low',
  description TEXT,
  solution TEXT,
  reference TEXT,
  cwe_id INTEGER,
  wasc_id INTEGER,
  url TEXT,
  parameter TEXT,
  evidence TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_vulnerabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vulns"
  ON public.scan_vulnerabilities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vulns"
  ON public.scan_vulnerabilities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vulns"
  ON public.scan_vulnerabilities FOR DELETE
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_scan_config_updated_at
  BEFORE UPDATE ON public.user_scan_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scan_jobs_updated_at
  BEFORE UPDATE ON public.scan_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for scan_jobs so frontend can poll status
ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_jobs;
