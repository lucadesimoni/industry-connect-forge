-- Create Audit Logging System
-- Tracks all changes to critical tables for compliance and security

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_ip INET;
  current_user_agent TEXT;
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  -- Get IP address from request headers (if available)
  -- Note: This requires pg_net extension or similar for full IP tracking
  -- For now, we'll capture what we can from the session
  
  -- Get user agent from request (if available)
  -- Note: This also requires additional setup for full tracking
  
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      table_name, 
      record_id, 
      user_id, 
      action, 
      old_values
    )
    VALUES (
      TG_TABLE_NAME, 
      OLD.id, 
      current_user_id, 
      'DELETE', 
      row_to_json(OLD)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      table_name, 
      record_id, 
      user_id, 
      action, 
      old_values, 
      new_values
    )
    VALUES (
      TG_TABLE_NAME, 
      NEW.id, 
      current_user_id, 
      'UPDATE', 
      row_to_json(OLD), 
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      table_name, 
      record_id, 
      user_id, 
      action, 
      new_values
    )
    VALUES (
      TG_TABLE_NAME, 
      NEW.id, 
      current_user_id, 
      'INSERT', 
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create audit triggers for all critical tables
CREATE TRIGGER audit_uns_nodes
  AFTER INSERT OR UPDATE OR DELETE ON public.uns_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_aas
  AFTER INSERT OR UPDATE OR DELETE ON public.aas
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_aas_submodels
  AFTER INSERT OR UPDATE OR DELETE ON public.aas_submodels
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_aas_properties
  AFTER INSERT OR UPDATE OR DELETE ON public.aas_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_rds_designations
  AFTER INSERT OR UPDATE OR DELETE ON public.rds_designations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_entity_links
  AFTER INSERT OR UPDATE OR DELETE ON public.entity_links
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_sites
  AFTER INSERT OR UPDATE OR DELETE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

-- Enable RLS on audit_log table
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies - only authenticated users can view audit logs
-- In production, you may want to restrict this further to admins only
CREATE POLICY "Authenticated users can view audit_log" 
ON public.audit_log FOR SELECT 
USING (auth.role() = 'authenticated');

-- Prevent direct inserts/updates/deletes to audit_log (only triggers should write)
CREATE POLICY "No direct modifications to audit_log" 
ON public.audit_log FOR ALL 
USING (false) 
WITH CHECK (false);

