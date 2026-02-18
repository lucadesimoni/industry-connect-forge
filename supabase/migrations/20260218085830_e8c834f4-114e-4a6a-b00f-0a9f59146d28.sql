
-- Fix RLS policies: Remove NULL site_id access from all tables
-- This closes the multi-tenant isolation gap

-- ── uns_nodes ──
DROP POLICY IF EXISTS "Users can view uns_nodes in their sites" ON public.uns_nodes;
DROP POLICY IF EXISTS "Users can insert uns_nodes in their sites" ON public.uns_nodes;
DROP POLICY IF EXISTS "Users can update uns_nodes in their sites" ON public.uns_nodes;
DROP POLICY IF EXISTS "Users can delete uns_nodes in their sites" ON public.uns_nodes;

CREATE POLICY "Users can view uns_nodes in their sites" ON public.uns_nodes FOR SELECT TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can insert uns_nodes in their sites" ON public.uns_nodes FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can update uns_nodes in their sites" ON public.uns_nodes FOR UPDATE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can delete uns_nodes in their sites" ON public.uns_nodes FOR DELETE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- ── aas ──
DROP POLICY IF EXISTS "Users can view aas in their sites" ON public.aas;
DROP POLICY IF EXISTS "Users can insert aas in their sites" ON public.aas;
DROP POLICY IF EXISTS "Users can update aas in their sites" ON public.aas;
DROP POLICY IF EXISTS "Users can delete aas in their sites" ON public.aas;

CREATE POLICY "Users can view aas in their sites" ON public.aas FOR SELECT TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can insert aas in their sites" ON public.aas FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can update aas in their sites" ON public.aas FOR UPDATE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can delete aas in their sites" ON public.aas FOR DELETE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- ── aas_submodels (via parent aas) ──
DROP POLICY IF EXISTS "Users can view aas_submodels via aas access" ON public.aas_submodels;
DROP POLICY IF EXISTS "Users can insert aas_submodels via aas access" ON public.aas_submodels;
DROP POLICY IF EXISTS "Users can update aas_submodels via aas access" ON public.aas_submodels;
DROP POLICY IF EXISTS "Users can delete aas_submodels via aas access" ON public.aas_submodels;

CREATE POLICY "Users can view aas_submodels via aas access" ON public.aas_submodels FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM aas WHERE aas.id = aas_submodels.aas_id AND aas.site_id IN (SELECT public.get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can insert aas_submodels via aas access" ON public.aas_submodels FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM aas WHERE aas.id = aas_submodels.aas_id AND aas.site_id IN (SELECT public.get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can update aas_submodels via aas access" ON public.aas_submodels FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM aas WHERE aas.id = aas_submodels.aas_id AND aas.site_id IN (SELECT public.get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can delete aas_submodels via aas access" ON public.aas_submodels FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM aas WHERE aas.id = aas_submodels.aas_id AND aas.site_id IN (SELECT public.get_user_site_ids(auth.uid()))));

-- ── aas_properties (via parent aas) ──
DROP POLICY IF EXISTS "Users can view aas_properties via aas access" ON public.aas_properties;
DROP POLICY IF EXISTS "Users can insert aas_properties via aas access" ON public.aas_properties;
DROP POLICY IF EXISTS "Users can update aas_properties via aas access" ON public.aas_properties;
DROP POLICY IF EXISTS "Users can delete aas_properties via aas access" ON public.aas_properties;

CREATE POLICY "Users can view aas_properties via aas access" ON public.aas_properties FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM aas_submodels sm JOIN aas ON aas.id = sm.aas_id WHERE sm.id = aas_properties.submodel_id AND aas.site_id IN (SELECT public.get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can insert aas_properties via aas access" ON public.aas_properties FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM aas_submodels sm JOIN aas ON aas.id = sm.aas_id WHERE sm.id = aas_properties.submodel_id AND aas.site_id IN (SELECT public.get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can update aas_properties via aas access" ON public.aas_properties FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM aas_submodels sm JOIN aas ON aas.id = sm.aas_id WHERE sm.id = aas_properties.submodel_id AND aas.site_id IN (SELECT public.get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can delete aas_properties via aas access" ON public.aas_properties FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM aas_submodels sm JOIN aas ON aas.id = sm.aas_id WHERE sm.id = aas_properties.submodel_id AND aas.site_id IN (SELECT public.get_user_site_ids(auth.uid()))));

-- ── rds_designations ──
DROP POLICY IF EXISTS "Users can view rds_designations in their sites" ON public.rds_designations;
DROP POLICY IF EXISTS "Users can insert rds_designations in their sites" ON public.rds_designations;
DROP POLICY IF EXISTS "Users can update rds_designations in their sites" ON public.rds_designations;
DROP POLICY IF EXISTS "Users can delete rds_designations in their sites" ON public.rds_designations;

CREATE POLICY "Users can view rds_designations in their sites" ON public.rds_designations FOR SELECT TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can insert rds_designations in their sites" ON public.rds_designations FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can update rds_designations in their sites" ON public.rds_designations FOR UPDATE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can delete rds_designations in their sites" ON public.rds_designations FOR DELETE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- ── entity_links ──
DROP POLICY IF EXISTS "Users can view entity_links in their sites" ON public.entity_links;
DROP POLICY IF EXISTS "Users can insert entity_links in their sites" ON public.entity_links;
DROP POLICY IF EXISTS "Users can update entity_links in their sites" ON public.entity_links;
DROP POLICY IF EXISTS "Users can delete entity_links in their sites" ON public.entity_links;

CREATE POLICY "Users can view entity_links in their sites" ON public.entity_links FOR SELECT TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can insert entity_links in their sites" ON public.entity_links FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can update entity_links in their sites" ON public.entity_links FOR UPDATE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can delete entity_links in their sites" ON public.entity_links FOR DELETE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- ── asset_location_history ──
DROP POLICY IF EXISTS "Users can view asset_location_history in their sites" ON public.asset_location_history;
DROP POLICY IF EXISTS "Users can insert asset_location_history in their sites" ON public.asset_location_history;
DROP POLICY IF EXISTS "Users can update asset_location_history in their sites" ON public.asset_location_history;
DROP POLICY IF EXISTS "Users can delete asset_location_history in their sites" ON public.asset_location_history;

CREATE POLICY "Users can view asset_location_history in their sites" ON public.asset_location_history FOR SELECT TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can insert asset_location_history in their sites" ON public.asset_location_history FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can update asset_location_history in their sites" ON public.asset_location_history FOR UPDATE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can delete asset_location_history in their sites" ON public.asset_location_history FOR DELETE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- ── tracked_assets ──
DROP POLICY IF EXISTS "Users can view tracked_assets in their sites" ON public.tracked_assets;
DROP POLICY IF EXISTS "Users can insert tracked_assets in their sites" ON public.tracked_assets;
DROP POLICY IF EXISTS "Users can update tracked_assets in their sites" ON public.tracked_assets;
DROP POLICY IF EXISTS "Users can delete tracked_assets in their sites" ON public.tracked_assets;

CREATE POLICY "Users can view tracked_assets in their sites" ON public.tracked_assets FOR SELECT TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can insert tracked_assets in their sites" ON public.tracked_assets FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can update tracked_assets in their sites" ON public.tracked_assets FOR UPDATE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can delete tracked_assets in their sites" ON public.tracked_assets FOR DELETE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- ── asset_events ──
DROP POLICY IF EXISTS "Users can view asset_events in their sites" ON public.asset_events;
DROP POLICY IF EXISTS "Users can insert asset_events in their sites" ON public.asset_events;
DROP POLICY IF EXISTS "Users can update asset_events in their sites" ON public.asset_events;
DROP POLICY IF EXISTS "Users can delete asset_events in their sites" ON public.asset_events;

CREATE POLICY "Users can view asset_events in their sites" ON public.asset_events FOR SELECT TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can insert asset_events in their sites" ON public.asset_events FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can update asset_events in their sites" ON public.asset_events FOR UPDATE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can delete asset_events in their sites" ON public.asset_events FOR DELETE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- ── asset_context_bindings ──
DROP POLICY IF EXISTS "Users can view asset_context_bindings in their sites" ON public.asset_context_bindings;
DROP POLICY IF EXISTS "Users can insert asset_context_bindings in their sites" ON public.asset_context_bindings;
DROP POLICY IF EXISTS "Users can update asset_context_bindings in their sites" ON public.asset_context_bindings;
DROP POLICY IF EXISTS "Users can delete asset_context_bindings in their sites" ON public.asset_context_bindings;

CREATE POLICY "Users can view asset_context_bindings in their sites" ON public.asset_context_bindings FOR SELECT TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can insert asset_context_bindings in their sites" ON public.asset_context_bindings FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can update asset_context_bindings in their sites" ON public.asset_context_bindings FOR UPDATE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())))
  WITH CHECK (site_id IN (SELECT public.get_user_site_ids(auth.uid())));
CREATE POLICY "Users can delete asset_context_bindings in their sites" ON public.asset_context_bindings FOR DELETE TO authenticated
  USING (site_id IN (SELECT public.get_user_site_ids(auth.uid())));

-- Also update the validate_entity_links function to remove NULL site_id fallback
CREATE OR REPLACE FUNCTION public.validate_entity_links()
 RETURNS TABLE(issue_type text, entity_type text, entity_id uuid, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_sites UUID[];
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RETURN; END IF;

  SELECT ARRAY_AGG(site_id) INTO user_sites
  FROM public.user_site_access WHERE user_id = current_user_id;

  IF user_sites IS NULL OR array_length(user_sites, 1) IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 'orphaned_uns_link'::TEXT, 'RDS'::TEXT, r.id,
    format('RDS %s links to non-existent UNS node', r.designation)
  FROM rds_designations r
  WHERE r.linked_uns_node_id IS NOT NULL
    AND r.site_id = ANY(user_sites)
    AND NOT EXISTS (SELECT 1 FROM uns_nodes u WHERE u.id = r.linked_uns_node_id);

  RETURN QUERY
  SELECT 'orphaned_uns_link'::TEXT, 'AAS'::TEXT, a.id,
    format('AAS %s links to non-existent UNS node', a.id_short)
  FROM aas a
  WHERE a.linked_uns_node_id IS NOT NULL
    AND a.site_id = ANY(user_sites)
    AND NOT EXISTS (SELECT 1 FROM uns_nodes u WHERE u.id = a.linked_uns_node_id);

  RETURN QUERY
  SELECT 'orphaned_rds_link'::TEXT, 'AAS'::TEXT, a.id,
    format('AAS %s links to non-existent RDS', a.id_short)
  FROM aas a
  WHERE a.linked_rds_id IS NOT NULL
    AND a.site_id = ANY(user_sites)
    AND NOT EXISTS (SELECT 1 FROM rds_designations r WHERE r.id = a.linked_rds_id);

  RETURN QUERY
  SELECT 'orphaned_aas_link'::TEXT, 'RDS'::TEXT, r.id,
    format('RDS %s links to non-existent AAS', r.designation)
  FROM rds_designations r
  WHERE r.linked_aas_id IS NOT NULL
    AND r.site_id = ANY(user_sites)
    AND NOT EXISTS (SELECT 1 FROM aas a WHERE a.id = r.linked_aas_id);

  RETURN QUERY
  SELECT 'location_mismatch'::TEXT, 'RDS'::TEXT, r.id,
    format('RDS %s location aspect does not match UNS node hierarchy', r.designation)
  FROM rds_designations r
  JOIN uns_nodes u ON r.linked_uns_node_id = u.id
  WHERE r.is_instance = true
    AND r.site_id = ANY(user_sites)
    AND r.location_aspect IS NOT NULL
    AND u.metadata->>'rds_location' IS NOT NULL
    AND r.location_aspect != u.metadata->>'rds_location';
END;
$function$;
