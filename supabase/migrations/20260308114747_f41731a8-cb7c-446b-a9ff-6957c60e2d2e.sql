CREATE TABLE public.custom_submodel_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  id_short TEXT NOT NULL,
  semantic_id TEXT NOT NULL,
  description TEXT NOT NULL,
  standard TEXT NOT NULL DEFAULT 'Custom',
  properties JSONB NOT NULL DEFAULT '[]'::jsonb,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_submodel_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom templates in their sites"
  ON public.custom_submodel_templates FOR SELECT
  USING (site_id IN (SELECT get_user_site_ids(auth.uid())));

CREATE POLICY "Users can insert custom templates in their sites"
  ON public.custom_submodel_templates FOR INSERT
  WITH CHECK (site_id IN (SELECT get_user_site_ids(auth.uid())));

CREATE POLICY "Users can update their own custom templates"
  ON public.custom_submodel_templates FOR UPDATE
  USING (created_by = auth.uid() AND site_id IN (SELECT get_user_site_ids(auth.uid())));

CREATE POLICY "Users can delete their own custom templates"
  ON public.custom_submodel_templates FOR DELETE
  USING (created_by = auth.uid() AND site_id IN (SELECT get_user_site_ids(auth.uid())));

CREATE TRIGGER update_custom_submodel_templates_updated_at
  BEFORE UPDATE ON public.custom_submodel_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();