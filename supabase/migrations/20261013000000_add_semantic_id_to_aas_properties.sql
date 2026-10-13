-- IDTA-01001 (AAS Part 1): every SubmodelElement may carry a semanticId
-- (e.g. ECLASS IRDI 0173-1#02-AAO677#002). Persist it so templates and
-- AASX/BaSyx imports round-trip without losing semantics.
ALTER TABLE public.aas_properties
  ADD COLUMN IF NOT EXISTS semantic_id TEXT;
