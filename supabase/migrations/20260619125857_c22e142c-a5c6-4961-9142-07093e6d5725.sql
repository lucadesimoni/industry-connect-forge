
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_rds_designation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_aas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_uns_node() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_tracked_asset() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_asset_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_asset_context_binding() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_rds_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_aas_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_uns_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_aas_submodel_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_site_access() FROM PUBLIC, anon, authenticated;

-- Site access helpers: restrict to authenticated only (no anon RPC access)
REVOKE EXECUTE ON FUNCTION public.get_user_site_ids(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_site_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_site_role(uuid, uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_entity_links() FROM PUBLIC, anon;
