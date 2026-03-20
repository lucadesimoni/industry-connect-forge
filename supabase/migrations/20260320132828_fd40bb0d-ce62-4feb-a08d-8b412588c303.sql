
DROP POLICY IF EXISTS "Users can view audit_logs in their sites" ON public.audit_logs;

CREATE POLICY "Admins can view audit_logs in their sites"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    site_id IN (SELECT get_user_site_ids(auth.uid()))
    AND public.user_has_site_role(auth.uid(), site_id, 'admin')
  );
