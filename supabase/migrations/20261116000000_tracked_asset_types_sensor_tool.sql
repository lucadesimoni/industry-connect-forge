-- Movable assets in the UNS: allow mobile sensors and tools as tracked assets
-- (in addition to containers, pallets and carriers). Only the asset_type rule
-- changes; all other checks are unchanged. Existing rows stay valid.
CREATE OR REPLACE FUNCTION public.validate_tracked_asset()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.asset_id) > 200 THEN
    RAISE EXCEPTION 'asset_id must be 200 characters or less.';
  END IF;
  IF NEW.asset_id !~ '^[a-zA-Z0-9:/_.\-]+$' THEN
    RAISE EXCEPTION 'asset_id contains invalid characters. Use alphanumeric, colons, slashes, underscores, dots, or hyphens.';
  END IF;
  IF NEW.asset_type NOT IN ('container', 'pallet', 'carrier', 'sensor', 'tool') THEN
    RAISE EXCEPTION 'Invalid asset_type. Must be container, pallet, carrier, sensor, or tool.';
  END IF;
  IF length(NEW.description) > 500 THEN
    RAISE EXCEPTION 'Description must be 500 characters or less.';
  END IF;
  IF NEW.current_location_path IS NOT NULL AND length(NEW.current_location_path) > 200 THEN
    RAISE EXCEPTION 'current_location_path must be 200 characters or less.';
  END IF;
  IF NEW.current_state NOT IN ('in_transit', 'at_rest', 'in_use', 'maintenance') THEN
    RAISE EXCEPTION 'Invalid current_state. Must be in_transit, at_rest, in_use, or maintenance.';
  END IF;
  IF NEW.current_quality_state NOT IN ('ok', 'warning', 'blocked') THEN
    RAISE EXCEPTION 'Invalid current_quality_state. Must be ok, warning, or blocked.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_tracked_asset() FROM PUBLIC, anon, authenticated;
