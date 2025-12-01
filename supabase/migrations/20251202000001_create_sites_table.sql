-- Create Sites table for multi-site support
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT,
  country TEXT,
  timezone TEXT DEFAULT 'UTC',
  default_language TEXT DEFAULT 'en',
  currency_code TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add site_id to all main tables
ALTER TABLE public.uns_nodes ADD COLUMN site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;
ALTER TABLE public.aas ADD COLUMN site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;
ALTER TABLE public.rds_designations ADD COLUMN site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;

-- Create indexes for site filtering
CREATE INDEX idx_uns_nodes_site_id ON public.uns_nodes(site_id);
CREATE INDEX idx_aas_site_id ON public.aas(site_id);
CREATE INDEX idx_rds_designations_site_id ON public.rds_designations(site_id);
CREATE INDEX idx_sites_code ON public.sites(code);

-- Add trigger for sites updated_at
CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on sites table
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Sites policies
CREATE POLICY "Authenticated users can view sites" 
ON public.sites FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sites" 
ON public.sites FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sites" 
ON public.sites FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sites" 
ON public.sites FOR DELETE 
USING (auth.role() = 'authenticated');

