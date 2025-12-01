-- Fix Row Level Security Policies
-- Remove permissive policies and add proper authentication-based policies

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on uns_nodes" ON public.uns_nodes;
DROP POLICY IF EXISTS "Allow all operations on aas" ON public.aas;
DROP POLICY IF EXISTS "Allow all operations on aas_submodels" ON public.aas_submodels;
DROP POLICY IF EXISTS "Allow all operations on aas_properties" ON public.aas_properties;
DROP POLICY IF EXISTS "Allow all operations on rds_designations" ON public.rds_designations;
DROP POLICY IF EXISTS "Allow all operations on entity_links" ON public.entity_links;

-- Create secure policies requiring authentication
-- Note: These policies require authenticated users. Once user roles are implemented,
-- these can be refined further with role-based access control.

-- UNS Nodes policies
CREATE POLICY "Authenticated users can view uns_nodes" 
ON public.uns_nodes FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert uns_nodes" 
ON public.uns_nodes FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update uns_nodes" 
ON public.uns_nodes FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete uns_nodes" 
ON public.uns_nodes FOR DELETE 
USING (auth.role() = 'authenticated');

-- AAS policies
CREATE POLICY "Authenticated users can view aas" 
ON public.aas FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert aas" 
ON public.aas FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update aas" 
ON public.aas FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete aas" 
ON public.aas FOR DELETE 
USING (auth.role() = 'authenticated');

-- AAS Submodels policies
CREATE POLICY "Authenticated users can view aas_submodels" 
ON public.aas_submodels FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert aas_submodels" 
ON public.aas_submodels FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update aas_submodels" 
ON public.aas_submodels FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete aas_submodels" 
ON public.aas_submodels FOR DELETE 
USING (auth.role() = 'authenticated');

-- AAS Properties policies
CREATE POLICY "Authenticated users can view aas_properties" 
ON public.aas_properties FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert aas_properties" 
ON public.aas_properties FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update aas_properties" 
ON public.aas_properties FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete aas_properties" 
ON public.aas_properties FOR DELETE 
USING (auth.role() = 'authenticated');

-- RDS Designations policies
CREATE POLICY "Authenticated users can view rds_designations" 
ON public.rds_designations FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert rds_designations" 
ON public.rds_designations FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update rds_designations" 
ON public.rds_designations FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete rds_designations" 
ON public.rds_designations FOR DELETE 
USING (auth.role() = 'authenticated');

-- Entity Links policies
CREATE POLICY "Authenticated users can view entity_links" 
ON public.entity_links FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert entity_links" 
ON public.entity_links FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update entity_links" 
ON public.entity_links FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete entity_links" 
ON public.entity_links FOR DELETE 
USING (auth.role() = 'authenticated');

