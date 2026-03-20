
-- Audit log table for tracking changes across AAS, UNS, and RDS entities
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'AAS', 'UNS', 'RDS', 'AAS_SUBMODEL', 'AAS_PROPERTY'
  entity_id uuid NOT NULL,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  changes jsonb DEFAULT '{}'::jsonb, -- old/new values for updates
  entity_snapshot jsonb DEFAULT '{}'::jsonb, -- snapshot at time of change
  performed_by uuid, -- auth.uid() at time of change
  site_id uuid REFERENCES public.sites(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_site ON public.audit_logs (site_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: users can view audit logs for their sites
CREATE POLICY "Users can view audit_logs in their sites"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (site_id IN (SELECT get_user_site_ids(auth.uid())));

-- RLS: system can insert (via triggers running as SECURITY DEFINER)
CREATE POLICY "System can insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT get_user_site_ids(auth.uid())));

-- Audit trigger function for AAS
CREATE OR REPLACE FUNCTION public.audit_aas_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _changes jsonb;
  _snapshot jsonb;
BEGIN
  _action := TG_OP;
  
  IF TG_OP = 'DELETE' THEN
    _snapshot := to_jsonb(OLD);
    _changes := jsonb_build_object('old', _snapshot);
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('AAS', OLD.id, _action, _changes, _snapshot, auth.uid(), OLD.site_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _snapshot := to_jsonb(NEW);
    _changes := jsonb_build_object('old', to_jsonb(OLD), 'new', _snapshot);
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('AAS', NEW.id, _action, _changes, _snapshot, auth.uid(), NEW.site_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    _snapshot := to_jsonb(NEW);
    _changes := jsonb_build_object('new', _snapshot);
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('AAS', NEW.id, _action, _changes, _snapshot, auth.uid(), NEW.site_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Audit trigger function for UNS nodes
CREATE OR REPLACE FUNCTION public.audit_uns_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _changes jsonb;
  _snapshot jsonb;
BEGIN
  _action := TG_OP;
  
  IF TG_OP = 'DELETE' THEN
    _snapshot := to_jsonb(OLD);
    _changes := jsonb_build_object('old', _snapshot);
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('UNS', OLD.id, _action, _changes, _snapshot, auth.uid(), OLD.site_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _snapshot := to_jsonb(NEW);
    _changes := jsonb_build_object('old', to_jsonb(OLD), 'new', _snapshot);
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('UNS', NEW.id, _action, _changes, _snapshot, auth.uid(), NEW.site_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    _snapshot := to_jsonb(NEW);
    _changes := jsonb_build_object('new', _snapshot);
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('UNS', NEW.id, _action, _changes, _snapshot, auth.uid(), NEW.site_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Audit trigger function for RDS designations
CREATE OR REPLACE FUNCTION public.audit_rds_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _changes jsonb;
  _snapshot jsonb;
BEGIN
  _action := TG_OP;
  
  IF TG_OP = 'DELETE' THEN
    _snapshot := to_jsonb(OLD);
    _changes := jsonb_build_object('old', _snapshot);
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('RDS', OLD.id, _action, _changes, _snapshot, auth.uid(), OLD.site_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _snapshot := to_jsonb(NEW);
    _changes := jsonb_build_object('old', to_jsonb(OLD), 'new', _snapshot);
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('RDS', NEW.id, _action, _changes, _snapshot, auth.uid(), NEW.site_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    _snapshot := to_jsonb(NEW);
    _changes := jsonb_build_object('new', _snapshot);
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('RDS', NEW.id, _action, _changes, _snapshot, auth.uid(), NEW.site_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Audit trigger for AAS submodels
CREATE OR REPLACE FUNCTION public.audit_aas_submodel_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _site_id uuid;
BEGIN
  -- Get site_id from parent AAS
  IF TG_OP = 'DELETE' THEN
    SELECT site_id INTO _site_id FROM public.aas WHERE id = OLD.aas_id;
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('AAS_SUBMODEL', OLD.id, 'DELETE', jsonb_build_object('old', to_jsonb(OLD), 'aas_id', OLD.aas_id), to_jsonb(OLD), auth.uid(), _site_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT site_id INTO _site_id FROM public.aas WHERE id = NEW.aas_id;
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('AAS_SUBMODEL', NEW.id, 'UPDATE', jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW), 'aas_id', NEW.aas_id), to_jsonb(NEW), auth.uid(), _site_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    SELECT site_id INTO _site_id FROM public.aas WHERE id = NEW.aas_id;
    INSERT INTO public.audit_logs (entity_type, entity_id, action, changes, entity_snapshot, performed_by, site_id)
    VALUES ('AAS_SUBMODEL', NEW.id, 'INSERT', jsonb_build_object('new', to_jsonb(NEW), 'aas_id', NEW.aas_id), to_jsonb(NEW), auth.uid(), _site_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers
CREATE TRIGGER audit_aas_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.aas
  FOR EACH ROW EXECUTE FUNCTION public.audit_aas_changes();

CREATE TRIGGER audit_uns_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.uns_nodes
  FOR EACH ROW EXECUTE FUNCTION public.audit_uns_changes();

CREATE TRIGGER audit_rds_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.rds_designations
  FOR EACH ROW EXECUTE FUNCTION public.audit_rds_changes();

CREATE TRIGGER audit_aas_submodel_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.aas_submodels
  FOR EACH ROW EXECUTE FUNCTION public.audit_aas_submodel_changes();
