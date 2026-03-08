
-- Validation trigger for tracked_assets
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
  IF NEW.asset_type NOT IN ('container', 'pallet', 'carrier') THEN
    RAISE EXCEPTION 'Invalid asset_type. Must be container, pallet, or carrier.';
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

CREATE TRIGGER validate_tracked_asset_trigger
  BEFORE INSERT OR UPDATE ON public.tracked_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tracked_asset();

-- Validation trigger for asset_events
CREATE OR REPLACE FUNCTION public.validate_asset_event()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.event_type NOT IN ('locationChanged', 'qualityViolation', 'contextBound', 'contextUnbound', 'stateChanged', 'created') THEN
    RAISE EXCEPTION 'Invalid event_type. Must be locationChanged, qualityViolation, contextBound, contextUnbound, stateChanged, or created.';
  END IF;
  IF NEW.from_location IS NOT NULL AND length(NEW.from_location) > 200 THEN
    RAISE EXCEPTION 'from_location must be 200 characters or less.';
  END IF;
  IF NEW.to_location IS NOT NULL AND length(NEW.to_location) > 200 THEN
    RAISE EXCEPTION 'to_location must be 200 characters or less.';
  END IF;
  IF NEW.reason IS NOT NULL AND length(NEW.reason) > 500 THEN
    RAISE EXCEPTION 'reason must be 500 characters or less.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_asset_event_trigger
  BEFORE INSERT OR UPDATE ON public.asset_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_asset_event();

-- Validation trigger for asset_context_bindings
CREATE OR REPLACE FUNCTION public.validate_asset_context_binding()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.context_type NOT IN ('order', 'workorder', 'shipment') THEN
    RAISE EXCEPTION 'Invalid context_type. Must be order, workorder, or shipment.';
  END IF;
  IF length(NEW.context_id) > 100 THEN
    RAISE EXCEPTION 'context_id must be 100 characters or less.';
  END IF;
  IF NEW.context_id !~ '^[a-zA-Z0-9:/_.\-]+$' THEN
    RAISE EXCEPTION 'context_id contains invalid characters.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_asset_context_binding_trigger
  BEFORE INSERT OR UPDATE ON public.asset_context_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_asset_context_binding();
