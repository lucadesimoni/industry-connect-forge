-- Server-side enforcement of the identifier syntax that the UI already validates
-- (src/lib/validation.ts, src/lib/hierarchyUtils.ts), so other clients cannot
-- write data that breaks AAS export or RDS parsing.
--
--  * idShort (IDTA-01001 AASd-002, rule valid in AAS v3.0 AND v3.1/v3.2):
--      ^[a-zA-Z][a-zA-Z0-9_]+$ , max. 128 characters
--    aas_properties.id_short additionally allows dotted paths for nested
--    elements (Collection.Property) and the internal structure-map row.
--  * RDS designation (IEC 81346-1 syntax): ^([=+-][A-Z0-9]+(\.[A-Z0-9]+)*)+$
--
-- Constraints are added NOT VALID: they are enforced for every INSERT/UPDATE
-- immediately, existing rows are checked separately (see VALIDATE below).

ALTER TABLE public.aas
  ADD CONSTRAINT aas_id_short_syntax
  CHECK (id_short ~ '^[a-zA-Z][a-zA-Z0-9_]+$' AND char_length(id_short) <= 128) NOT VALID;

ALTER TABLE public.aas_submodels
  ADD CONSTRAINT aas_submodels_id_short_syntax
  CHECK (id_short ~ '^[a-zA-Z][a-zA-Z0-9_]+$' AND char_length(id_short) <= 128) NOT VALID;

ALTER TABLE public.aas_properties
  ADD CONSTRAINT aas_properties_id_short_syntax
  CHECK (
    id_short = '_aasStructure'
    OR id_short ~ '^[a-zA-Z][a-zA-Z0-9_]{1,127}(\.[a-zA-Z][a-zA-Z0-9_]{1,127})*$'
  ) NOT VALID;

ALTER TABLE public.rds_designations
  ADD CONSTRAINT rds_designations_designation_syntax
  CHECK (designation ~ '^([=+-][A-Z0-9]+(\.[A-Z0-9]+)*)+$') NOT VALID;

-- After confirming that no existing row violates a constraint
-- (SELECT ... WHERE NOT (<condition>)), validate them:
--   ALTER TABLE public.aas              VALIDATE CONSTRAINT aas_id_short_syntax;
--   ALTER TABLE public.aas_submodels    VALIDATE CONSTRAINT aas_submodels_id_short_syntax;
--   ALTER TABLE public.aas_properties   VALIDATE CONSTRAINT aas_properties_id_short_syntax;
--   ALTER TABLE public.rds_designations VALIDATE CONSTRAINT rds_designations_designation_syntax;
