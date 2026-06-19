
-- 1. custom_submodel_templates: restrict to authenticated role
DROP POLICY IF EXISTS "Users can view custom templates in their sites" ON public.custom_submodel_templates;
DROP POLICY IF EXISTS "Users can insert custom templates in their sites" ON public.custom_submodel_templates;
DROP POLICY IF EXISTS "Users can update their own custom templates" ON public.custom_submodel_templates;
DROP POLICY IF EXISTS "Users can delete their own custom templates" ON public.custom_submodel_templates;

CREATE POLICY "Users can view custom templates in their sites"
  ON public.custom_submodel_templates FOR SELECT TO authenticated
  USING (site_id IN (SELECT get_user_site_ids(auth.uid())));

CREATE POLICY "Users can insert custom templates in their sites"
  ON public.custom_submodel_templates FOR INSERT TO authenticated
  WITH CHECK (site_id IN (SELECT get_user_site_ids(auth.uid())) AND created_by = auth.uid());

CREATE POLICY "Users can update their own custom templates"
  ON public.custom_submodel_templates FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND site_id IN (SELECT get_user_site_ids(auth.uid())))
  WITH CHECK (created_by = auth.uid() AND site_id IN (SELECT get_user_site_ids(auth.uid())));

CREATE POLICY "Users can delete their own custom templates"
  ON public.custom_submodel_templates FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND site_id IN (SELECT get_user_site_ids(auth.uid())));

-- 2. user_site_access: split admin policy. Admins can manage non-admin roles only;
-- granting admin role must be done via service_role (server-side).
DROP POLICY IF EXISTS "Site admins can manage site access" ON public.user_site_access;

CREATE POLICY "Site admins can insert non-admin access"
  ON public.user_site_access FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_site_role(auth.uid(), site_id, 'admin'::app_role)
    AND role <> 'admin'::app_role
  );

CREATE POLICY "Site admins can update non-admin access"
  ON public.user_site_access FOR UPDATE TO authenticated
  USING (
    public.user_has_site_role(auth.uid(), site_id, 'admin'::app_role)
    AND role <> 'admin'::app_role
  )
  WITH CHECK (
    public.user_has_site_role(auth.uid(), site_id, 'admin'::app_role)
    AND role <> 'admin'::app_role
  );

CREATE POLICY "Site admins can delete non-admin access"
  ON public.user_site_access FOR DELETE TO authenticated
  USING (
    public.user_has_site_role(auth.uid(), site_id, 'admin'::app_role)
    AND role <> 'admin'::app_role
  );

CREATE POLICY "Site admins can view all access in their sites"
  ON public.user_site_access FOR SELECT TO authenticated
  USING (public.user_has_site_role(auth.uid(), site_id, 'admin'::app_role));
