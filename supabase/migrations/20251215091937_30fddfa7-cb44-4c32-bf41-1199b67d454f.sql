-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on aas" ON public.aas;
DROP POLICY IF EXISTS "Allow all operations on aas_submodels" ON public.aas_submodels;
DROP POLICY IF EXISTS "Allow all operations on aas_properties" ON public.aas_properties;
DROP POLICY IF EXISTS "Allow all operations on uns_nodes" ON public.uns_nodes;
DROP POLICY IF EXISTS "Allow all operations on rds_designations" ON public.rds_designations;
DROP POLICY IF EXISTS "Allow all operations on entity_links" ON public.entity_links;
DROP POLICY IF EXISTS "Allow all operations on asset_location_history" ON public.asset_location_history;

-- Create proper authentication-based policies for aas table
CREATE POLICY "Authenticated users can view aas"
ON public.aas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert aas"
ON public.aas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update aas"
ON public.aas FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete aas"
ON public.aas FOR DELETE
TO authenticated
USING (true);

-- Create proper authentication-based policies for aas_submodels table
CREATE POLICY "Authenticated users can view aas_submodels"
ON public.aas_submodels FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert aas_submodels"
ON public.aas_submodels FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update aas_submodels"
ON public.aas_submodels FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete aas_submodels"
ON public.aas_submodels FOR DELETE
TO authenticated
USING (true);

-- Create proper authentication-based policies for aas_properties table
CREATE POLICY "Authenticated users can view aas_properties"
ON public.aas_properties FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert aas_properties"
ON public.aas_properties FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update aas_properties"
ON public.aas_properties FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete aas_properties"
ON public.aas_properties FOR DELETE
TO authenticated
USING (true);

-- Create proper authentication-based policies for uns_nodes table
CREATE POLICY "Authenticated users can view uns_nodes"
ON public.uns_nodes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert uns_nodes"
ON public.uns_nodes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update uns_nodes"
ON public.uns_nodes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete uns_nodes"
ON public.uns_nodes FOR DELETE
TO authenticated
USING (true);

-- Create proper authentication-based policies for rds_designations table
CREATE POLICY "Authenticated users can view rds_designations"
ON public.rds_designations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert rds_designations"
ON public.rds_designations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update rds_designations"
ON public.rds_designations FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rds_designations"
ON public.rds_designations FOR DELETE
TO authenticated
USING (true);

-- Create proper authentication-based policies for entity_links table
CREATE POLICY "Authenticated users can view entity_links"
ON public.entity_links FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert entity_links"
ON public.entity_links FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update entity_links"
ON public.entity_links FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete entity_links"
ON public.entity_links FOR DELETE
TO authenticated
USING (true);

-- Create proper authentication-based policies for asset_location_history table
CREATE POLICY "Authenticated users can view asset_location_history"
ON public.asset_location_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert asset_location_history"
ON public.asset_location_history FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update asset_location_history"
ON public.asset_location_history FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete asset_location_history"
ON public.asset_location_history FOR DELETE
TO authenticated
USING (true);