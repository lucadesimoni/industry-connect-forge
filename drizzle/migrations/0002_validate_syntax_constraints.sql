-- Validate the syntax constraints added NOT VALID in 20261014000000 for the
-- rows that existed before. Checked on 2026-10-14: 0 existing rows violate any
-- of them. VALIDATE only reads; it fails (and changes nothing) if a violating
-- row exists, so this migration cannot corrupt data.
ALTER TABLE public.aas              VALIDATE CONSTRAINT aas_id_short_syntax;
ALTER TABLE public.aas_submodels    VALIDATE CONSTRAINT aas_submodels_id_short_syntax;
ALTER TABLE public.aas_properties   VALIDATE CONSTRAINT aas_properties_id_short_syntax;
ALTER TABLE public.rds_designations VALIDATE CONSTRAINT rds_designations_designation_syntax;
