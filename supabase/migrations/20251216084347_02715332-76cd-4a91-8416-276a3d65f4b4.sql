-- ================================================
-- Security Migration: Fix WARN-level security issues
-- ================================================

-- 1. INPUT VALIDATION: Add database-level constraints for data integrity
-- Note: Using triggers instead of CHECK constraints for better flexibility

-- Create validation trigger function for rds_designations
CREATE OR REPLACE FUNCTION public.validate_rds_designation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate object_class format (1-10 uppercase alphanumeric, starts with letter)
  IF NEW.object_class !~ '^[A-Z][A-Z0-9]{0,9}$' THEN
    RAISE EXCEPTION 'Invalid object_class format. Must be 1-10 uppercase alphanumeric characters starting with a letter.';
  END IF;
  
  -- Validate designation length
  IF length(NEW.designation) > 100 THEN
    RAISE EXCEPTION 'Designation must be 100 characters or less.';
  END IF;
  
  -- Validate description length
  IF length(NEW.description) > 500 THEN
    RAISE EXCEPTION 'Description must be 500 characters or less.';
  END IF;
  
  -- Validate aspect_code
  IF NEW.aspect_code NOT IN ('=', '-', '+') THEN
    RAISE EXCEPTION 'Invalid aspect_code. Must be =, -, or +.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for rds_designations validation
DROP TRIGGER IF EXISTS validate_rds_designation_trigger ON public.rds_designations;
CREATE TRIGGER validate_rds_designation_trigger
BEFORE INSERT OR UPDATE ON public.rds_designations
FOR EACH ROW
EXECUTE FUNCTION public.validate_rds_designation();

-- Create validation trigger function for aas
CREATE OR REPLACE FUNCTION public.validate_aas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate id_short length
  IF length(NEW.id_short) > 50 THEN
    RAISE EXCEPTION 'id_short must be 50 characters or less.';
  END IF;
  
  -- Validate asset_id length
  IF length(NEW.asset_id) > 100 THEN
    RAISE EXCEPTION 'asset_id must be 100 characters or less.';
  END IF;
  
  -- Validate description length
  IF length(NEW.description) > 500 THEN
    RAISE EXCEPTION 'Description must be 500 characters or less.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for aas validation
DROP TRIGGER IF EXISTS validate_aas_trigger ON public.aas;
CREATE TRIGGER validate_aas_trigger
BEFORE INSERT OR UPDATE ON public.aas
FOR EACH ROW
EXECUTE FUNCTION public.validate_aas();

-- Create validation trigger function for uns_nodes
CREATE OR REPLACE FUNCTION public.validate_uns_node()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate name length
  IF length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Name must be 100 characters or less.';
  END IF;
  
  -- Validate level is valid ISA-95 level
  IF NEW.level NOT IN ('Enterprise', 'Site', 'Area', 'Line', 'Cell') THEN
    RAISE EXCEPTION 'Invalid level. Must be Enterprise, Site, Area, Line, or Cell.';
  END IF;
  
  -- Validate description length if provided
  IF NEW.description IS NOT NULL AND length(NEW.description) > 500 THEN
    RAISE EXCEPTION 'Description must be 500 characters or less.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for uns_nodes validation
DROP TRIGGER IF EXISTS validate_uns_node_trigger ON public.uns_nodes;
CREATE TRIGGER validate_uns_node_trigger
BEFORE INSERT OR UPDATE ON public.uns_nodes
FOR EACH ROW
EXECUTE FUNCTION public.validate_uns_node();

-- 2. AUDIT LOG ACCESS: Check if audit_log table exists and restrict access
-- Only update if the table exists (it may have been created in a previous migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    -- Drop the overly permissive policy
    DROP POLICY IF EXISTS "Authenticated users can view audit_log" ON public.audit_log;
    
    -- Create admin-only policy using the existing user_site_access table
    DROP POLICY IF EXISTS "Only admins can view audit_log" ON public.audit_log;
    CREATE POLICY "Only admins can view audit_log" 
    ON public.audit_log FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.user_site_access
        WHERE user_id = auth.uid()
        AND role = 'admin'
      )
    );
  END IF;
END $$;

-- 3. FIX validate_entity_links: Add site-based access control
CREATE OR REPLACE FUNCTION public.validate_entity_links()
RETURNS TABLE (
  issue_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_sites UUID[];
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- If no authenticated user, return empty
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get user's accessible sites
  SELECT ARRAY_AGG(site_id) INTO user_sites
  FROM public.user_site_access
  WHERE user_id = current_user_id;
  
  -- If user has no site access, return empty
  IF user_sites IS NULL OR array_length(user_sites, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Find RDS designations with orphaned UNS links (filtered by user's sites)
  RETURN QUERY
  SELECT 
    'orphaned_uns_link'::TEXT,
    'RDS'::TEXT,
    r.id,
    format('RDS %s links to non-existent UNS node', r.designation)
  FROM rds_designations r
  WHERE r.linked_uns_node_id IS NOT NULL
    AND (r.site_id = ANY(user_sites) OR r.site_id IS NULL)
    AND NOT EXISTS (SELECT 1 FROM uns_nodes u WHERE u.id = r.linked_uns_node_id);

  -- Find AAS with orphaned UNS links (filtered by user's sites)
  RETURN QUERY
  SELECT 
    'orphaned_uns_link'::TEXT,
    'AAS'::TEXT,
    a.id,
    format('AAS %s links to non-existent UNS node', a.id_short)
  FROM aas a
  WHERE a.linked_uns_node_id IS NOT NULL
    AND (a.site_id = ANY(user_sites) OR a.site_id IS NULL)
    AND NOT EXISTS (SELECT 1 FROM uns_nodes u WHERE u.id = a.linked_uns_node_id);

  -- Find AAS with orphaned RDS links (filtered by user's sites)
  RETURN QUERY
  SELECT 
    'orphaned_rds_link'::TEXT,
    'AAS'::TEXT,
    a.id,
    format('AAS %s links to non-existent RDS', a.id_short)
  FROM aas a
  WHERE a.linked_rds_id IS NOT NULL
    AND (a.site_id = ANY(user_sites) OR a.site_id IS NULL)
    AND NOT EXISTS (SELECT 1 FROM rds_designations r WHERE r.id = a.linked_rds_id);

  -- Find RDS with orphaned AAS links (filtered by user's sites)
  RETURN QUERY
  SELECT 
    'orphaned_aas_link'::TEXT,
    'RDS'::TEXT,
    r.id,
    format('RDS %s links to non-existent AAS', r.designation)
  FROM rds_designations r
  WHERE r.linked_aas_id IS NOT NULL
    AND (r.site_id = ANY(user_sites) OR r.site_id IS NULL)
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
    AND (r.site_id = ANY(user_sites) OR r.site_id IS NULL)
    AND r.location_aspect IS NOT NULL
    AND u.metadata->>'rds_location' IS NOT NULL
    AND r.location_aspect != u.metadata->>'rds_location';
END;
$$;