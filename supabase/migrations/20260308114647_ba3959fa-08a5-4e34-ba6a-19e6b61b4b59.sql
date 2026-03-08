CREATE OR REPLACE TRIGGER on_auth_user_created_site_access
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_site_access();