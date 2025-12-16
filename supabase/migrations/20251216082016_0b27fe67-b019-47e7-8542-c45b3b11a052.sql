-- =============================================
-- SECURITY FIX: Site-Based Multi-Tenancy Implementation
-- Fixes: MISSING_RLS (no_user_isolation) and site_id_unused
-- =============================================

-- 1. Create sites table for multi-tenant support
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT,
  country TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  default_language TEXT NOT NULL DEFAULT 'en',
  currency_code TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create app_role enum for user roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'operator', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create user_site_access mapping table
CREATE TABLE IF NOT EXISTS public.user_site_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, site_id)
);

-- 4. Add site_id columns to main tables (if not exists)
ALTER TABLE public.uns_nodes ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE;
ALTER TABLE public.aas ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE;
ALTER TABLE public.rds_designations ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE;
ALTER TABLE public.entity_links ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE;
ALTER TABLE public.asset_location_history ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE;

-- 5. Enable RLS on new tables
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_site_access ENABLE ROW LEVEL SECURITY;

-- 6. Create security definer function to check site access
CREATE OR REPLACE FUNCTION public.user_has_site_access(_user_id UUID, _site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_site_access
    WHERE user_id = _user_id
      AND site_id = _site_id
  )
$$;

-- 7. Create function to get user's accessible site IDs
CREATE OR REPLACE FUNCTION public.get_user_site_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT site_id
  FROM public.user_site_access
  WHERE user_id = _user_id
$$;

-- 8. Create function to check if user has specific role at site
CREATE OR REPLACE FUNCTION public.user_has_site_role(_user_id UUID, _site_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_site_access
    WHERE user_id = _user_id
      AND site_id = _site_id
      AND role = _role
  )
$$;

-- 9. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view uns_nodes" ON public.uns_nodes;
DROP POLICY IF EXISTS "Authenticated users can insert uns_nodes" ON public.uns_nodes;
DROP POLICY IF EXISTS "Authenticated users can update uns_nodes" ON public.uns_nodes;
DROP POLICY IF EXISTS "Authenticated users can delete uns_nodes" ON public.uns_nodes;

DROP POLICY IF EXISTS "Authenticated users can view aas" ON public.aas;
DROP POLICY IF EXISTS "Authenticated users can insert aas" ON public.aas;
DROP POLICY IF EXISTS "Authenticated users can update aas" ON public.aas;
DROP POLICY IF EXISTS "Authenticated users can delete aas" ON public.aas;

DROP POLICY IF EXISTS "Authenticated users can view aas_submodels" ON public.aas_submodels;
DROP POLICY IF EXISTS "Authenticated users can insert aas_submodels" ON public.aas_submodels;
DROP POLICY IF EXISTS "Authenticated users can update aas_submodels" ON public.aas_submodels;
DROP POLICY IF EXISTS "Authenticated users can delete aas_submodels" ON public.aas_submodels;

DROP POLICY IF EXISTS "Authenticated users can view aas_properties" ON public.aas_properties;
DROP POLICY IF EXISTS "Authenticated users can insert aas_properties" ON public.aas_properties;
DROP POLICY IF EXISTS "Authenticated users can update aas_properties" ON public.aas_properties;
DROP POLICY IF EXISTS "Authenticated users can delete aas_properties" ON public.aas_properties;

DROP POLICY IF EXISTS "Authenticated users can view rds_designations" ON public.rds_designations;
DROP POLICY IF EXISTS "Authenticated users can insert rds_designations" ON public.rds_designations;
DROP POLICY IF EXISTS "Authenticated users can update rds_designations" ON public.rds_designations;
DROP POLICY IF EXISTS "Authenticated users can delete rds_designations" ON public.rds_designations;

DROP POLICY IF EXISTS "Authenticated users can view entity_links" ON public.entity_links;
DROP POLICY IF EXISTS "Authenticated users can insert entity_links" ON public.entity_links;
DROP POLICY IF EXISTS "Authenticated users can update entity_links" ON public.entity_links;
DROP POLICY IF EXISTS "Authenticated users can delete entity_links" ON public.entity_links;

DROP POLICY IF EXISTS "Authenticated users can view asset_location_history" ON public.asset_location_history;
DROP POLICY IF EXISTS "Authenticated users can insert asset_location_history" ON public.asset_location_history;
DROP POLICY IF EXISTS "Authenticated users can update asset_location_history" ON public.asset_location_history;
DROP POLICY IF EXISTS "Authenticated users can delete asset_location_history" ON public.asset_location_history;

-- 10. Create site-based RLS policies for sites table
CREATE POLICY "Users can view sites they have access to"
ON public.sites FOR SELECT
TO authenticated
USING (id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Admins can manage sites"
ON public.sites FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_site_access
    WHERE user_id = auth.uid()
      AND site_id = sites.id
      AND role = 'admin'
  )
);

-- 11. RLS policies for user_site_access
CREATE POLICY "Users can view their own site access"
ON public.user_site_access FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Site admins can manage site access"
ON public.user_site_access FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_site_access usa
    WHERE usa.user_id = auth.uid()
      AND usa.site_id = user_site_access.site_id
      AND usa.role = 'admin'
  )
);

-- 12. Create site-based RLS policies for uns_nodes
CREATE POLICY "Users can view uns_nodes in their sites"
ON public.uns_nodes FOR SELECT
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can insert uns_nodes in their sites"
ON public.uns_nodes FOR INSERT
TO authenticated
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can update uns_nodes in their sites"
ON public.uns_nodes FOR UPDATE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())))
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can delete uns_nodes in their sites"
ON public.uns_nodes FOR DELETE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- 13. Create site-based RLS policies for aas
CREATE POLICY "Users can view aas in their sites"
ON public.aas FOR SELECT
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can insert aas in their sites"
ON public.aas FOR INSERT
TO authenticated
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can update aas in their sites"
ON public.aas FOR UPDATE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())))
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can delete aas in their sites"
ON public.aas FOR DELETE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- 14. RLS policies for aas_submodels (via parent aas)
CREATE POLICY "Users can view aas_submodels via aas access"
ON public.aas_submodels FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.aas
    WHERE aas.id = aas_submodels.aas_id
      AND (aas.site_id IS NULL OR aas.site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  )
);

CREATE POLICY "Users can insert aas_submodels via aas access"
ON public.aas_submodels FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.aas
    WHERE aas.id = aas_submodels.aas_id
      AND (aas.site_id IS NULL OR aas.site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  )
);

CREATE POLICY "Users can update aas_submodels via aas access"
ON public.aas_submodels FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.aas
    WHERE aas.id = aas_submodels.aas_id
      AND (aas.site_id IS NULL OR aas.site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  )
);

CREATE POLICY "Users can delete aas_submodels via aas access"
ON public.aas_submodels FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.aas
    WHERE aas.id = aas_submodels.aas_id
      AND (aas.site_id IS NULL OR aas.site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  )
);

-- 15. RLS policies for aas_properties (via parent submodel -> aas)
CREATE POLICY "Users can view aas_properties via aas access"
ON public.aas_properties FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.aas_submodels sm
    JOIN public.aas ON aas.id = sm.aas_id
    WHERE sm.id = aas_properties.submodel_id
      AND (aas.site_id IS NULL OR aas.site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  )
);

CREATE POLICY "Users can insert aas_properties via aas access"
ON public.aas_properties FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.aas_submodels sm
    JOIN public.aas ON aas.id = sm.aas_id
    WHERE sm.id = aas_properties.submodel_id
      AND (aas.site_id IS NULL OR aas.site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  )
);

CREATE POLICY "Users can update aas_properties via aas access"
ON public.aas_properties FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.aas_submodels sm
    JOIN public.aas ON aas.id = sm.aas_id
    WHERE sm.id = aas_properties.submodel_id
      AND (aas.site_id IS NULL OR aas.site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  )
);

CREATE POLICY "Users can delete aas_properties via aas access"
ON public.aas_properties FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.aas_submodels sm
    JOIN public.aas ON aas.id = sm.aas_id
    WHERE sm.id = aas_properties.submodel_id
      AND (aas.site_id IS NULL OR aas.site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  )
);

-- 16. Create site-based RLS policies for rds_designations
CREATE POLICY "Users can view rds_designations in their sites"
ON public.rds_designations FOR SELECT
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can insert rds_designations in their sites"
ON public.rds_designations FOR INSERT
TO authenticated
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can update rds_designations in their sites"
ON public.rds_designations FOR UPDATE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())))
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can delete rds_designations in their sites"
ON public.rds_designations FOR DELETE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- 17. Create site-based RLS policies for entity_links
CREATE POLICY "Users can view entity_links in their sites"
ON public.entity_links FOR SELECT
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can insert entity_links in their sites"
ON public.entity_links FOR INSERT
TO authenticated
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can update entity_links in their sites"
ON public.entity_links FOR UPDATE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())))
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can delete entity_links in their sites"
ON public.entity_links FOR DELETE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- 18. Create site-based RLS policies for asset_location_history
CREATE POLICY "Users can view asset_location_history in their sites"
ON public.asset_location_history FOR SELECT
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can insert asset_location_history in their sites"
ON public.asset_location_history FOR INSERT
TO authenticated
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can update asset_location_history in their sites"
ON public.asset_location_history FOR UPDATE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())))
WITH CHECK (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

CREATE POLICY "Users can delete asset_location_history in their sites"
ON public.asset_location_history FOR DELETE
TO authenticated
USING (site_id IS NULL OR site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- 19. Create trigger for updated_at on sites
CREATE TRIGGER update_sites_updated_at
BEFORE UPDATE ON public.sites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 20. Create default Pilatus site and grant access to existing users
INSERT INTO public.sites (id, code, name, region, country, timezone)
VALUES ('00000000-0000-0000-0000-000000000001', 'PIL', 'Pilatus Stans', 'Central Switzerland', 'Switzerland', 'Europe/Zurich')
ON CONFLICT (code) DO NOTHING;

-- 21. Update existing data to belong to default site
UPDATE public.uns_nodes SET site_id = '00000000-0000-0000-0000-000000000001' WHERE site_id IS NULL;
UPDATE public.aas SET site_id = '00000000-0000-0000-0000-000000000001' WHERE site_id IS NULL;
UPDATE public.rds_designations SET site_id = '00000000-0000-0000-0000-000000000001' WHERE site_id IS NULL;
UPDATE public.entity_links SET site_id = '00000000-0000-0000-0000-000000000001' WHERE site_id IS NULL;
UPDATE public.asset_location_history SET site_id = '00000000-0000-0000-0000-000000000001' WHERE site_id IS NULL;

-- 22. Create function to auto-assign new users to default site
CREATE OR REPLACE FUNCTION public.handle_new_user_site_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_site_access (user_id, site_id, role)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', 'operator')
  ON CONFLICT (user_id, site_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 23. Create trigger to auto-assign new users
DROP TRIGGER IF EXISTS on_auth_user_created_site_access ON auth.users;
CREATE TRIGGER on_auth_user_created_site_access
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_site_access();

-- 24. Grant existing users access to default site
INSERT INTO public.user_site_access (user_id, site_id, role)
SELECT id, '00000000-0000-0000-0000-000000000001', 'operator'
FROM auth.users
ON CONFLICT (user_id, site_id) DO NOTHING;