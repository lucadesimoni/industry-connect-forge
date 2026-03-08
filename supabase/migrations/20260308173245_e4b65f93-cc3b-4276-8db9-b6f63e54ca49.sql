
-- Fix infinite recursion in user_site_access RLS policy
-- The "Site admins can manage site access" policy references user_site_access within itself

DROP POLICY IF EXISTS "Site admins can manage site access" ON public.user_site_access;

-- Replace with policy that uses the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Site admins can manage site access"
  ON public.user_site_access
  FOR ALL
  TO authenticated
  USING (public.user_has_site_role(auth.uid(), user_site_access.site_id, 'admin'))
  WITH CHECK (public.user_has_site_role(auth.uid(), user_site_access.site_id, 'admin'));
