-- Create location history table for tracking asset movements
CREATE TABLE public.asset_location_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('AAS', 'RDS')),
  entity_id UUID NOT NULL,
  previous_uns_node_id UUID REFERENCES public.uns_nodes(id) ON DELETE SET NULL,
  new_uns_node_id UUID REFERENCES public.uns_nodes(id) ON DELETE SET NULL,
  previous_location_aspect TEXT,
  new_location_aspect TEXT,
  previous_designation TEXT,
  new_designation TEXT,
  moved_by TEXT, -- could be user id or system
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_location_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations (matching existing pattern - should be tightened with auth later)
CREATE POLICY "Allow all operations on asset_location_history"
  ON public.asset_location_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_asset_location_history_entity ON public.asset_location_history(entity_type, entity_id);
CREATE INDEX idx_asset_location_history_created ON public.asset_location_history(created_at DESC);

-- Create function to validate entity links consistency
CREATE OR REPLACE FUNCTION public.validate_entity_links()
RETURNS TABLE (
  issue_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  description TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Find RDS designations with orphaned UNS links
  RETURN QUERY
  SELECT 
    'orphaned_uns_link'::TEXT,
    'RDS'::TEXT,
    r.id,
    format('RDS %s links to non-existent UNS node %s', r.designation, r.linked_uns_node_id)
  FROM rds_designations r
  WHERE r.linked_uns_node_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM uns_nodes u WHERE u.id = r.linked_uns_node_id);

  -- Find AAS with orphaned UNS links
  RETURN QUERY
  SELECT 
    'orphaned_uns_link'::TEXT,
    'AAS'::TEXT,
    a.id,
    format('AAS %s links to non-existent UNS node %s', a.id_short, a.linked_uns_node_id)
  FROM aas a
  WHERE a.linked_uns_node_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM uns_nodes u WHERE u.id = a.linked_uns_node_id);

  -- Find AAS with orphaned RDS links
  RETURN QUERY
  SELECT 
    'orphaned_rds_link'::TEXT,
    'AAS'::TEXT,
    a.id,
    format('AAS %s links to non-existent RDS %s', a.id_short, a.linked_rds_id)
  FROM aas a
  WHERE a.linked_rds_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM rds_designations r WHERE r.id = a.linked_rds_id);

  -- Find RDS with orphaned AAS links
  RETURN QUERY
  SELECT 
    'orphaned_aas_link'::TEXT,
    'RDS'::TEXT,
    r.id,
    format('RDS %s links to non-existent AAS %s', r.designation, r.linked_aas_id)
  FROM rds_designations r
  WHERE r.linked_aas_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM aas a WHERE a.id = r.linked_aas_id);

  -- Find location mismatches (RDS location doesn't match linked UNS hierarchy)
  RETURN QUERY
  SELECT 
    'location_mismatch'::TEXT,
    'RDS'::TEXT,
    r.id,
    format('RDS %s location aspect does not match UNS node hierarchy', r.designation)
  FROM rds_designations r
  JOIN uns_nodes u ON r.linked_uns_node_id = u.id
  WHERE r.is_instance = true
    AND r.location_aspect IS NOT NULL
    AND u.metadata->>'rds_location' IS NOT NULL
    AND r.location_aspect != u.metadata->>'rds_location';
END;
$$;