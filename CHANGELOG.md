# Changelog

## 2026-10-14 – Standards verification against primary sources

### Breaking / behavior changes
- **AAS idShort rule is stricter**: `^[a-zA-Z][a-zA-Z0-9_]+$` (max. 128): no hyphens, at least 2 characters. This is the rule valid in AAS v3.0 (our export format) *and* v3.1/v3.2 (source: aas-core-meta). Imports with other idShorts are rejected before anything is written, and the database enforces the rule for new writes (migration `20261014000000`).
- **Sparkplug payload preview**: DBIRTH now has `seq = 1` (after NBIRTH `seq = 0`) and DDATA `seq = 2`. DDATA metrics carry **only the alias**, no name (Sparkplug 3.0: required when aliases are used). Standalone submodel payloads use names without aliases. Callers can pass `{ seq, aliasBase }`; the signatures of `generateAASBirthPayload` / `generateAASDataPayload` changed.
- **IDTA templates upgraded** to the current published versions: Digital Nameplate 3.0 (IDTA 02006-3-0), Technical Data 2.0 (IDTA 02003-2-0), Handover Documentation 2.0 (IDTA 02004-2-0). Submodels created earlier keep their old semanticIds, so re-create them from the template if you need the new version.
- **Template structure**: templates now export the official element types (MultiLanguageProperty, SubmodelElementCollection/List, File) and container semanticIds. Items of a SubmodelElementList are exported without idShort (AASd-120).

### Fixed
- RDS class catalogue: class `N` restored. Its removal was based on an unverified assumption; the catalogue now documents its provenance and the known differences to IEC 81346-2:2019.
- MultiLanguageProperty without a value is exported without `value` instead of an empty list.
- Container semanticIds (collections, lists, entities) survive the import/export round trip.

### Verification added
- `idtaConformance.test.ts`: templates are compared element by element with the official IDTA template files (fixture extracted by `scripts/extract-idta-fixture.mjs`, source commit recorded in the fixture).
- `dbConstraints.test.ts`: runs the constraint migration on PostgreSQL (PGlite) and checks that it accepts or rejects exactly what the TypeScript validators accept or reject.
- `scripts/test-broker.sh`: real Mosquitto 2.0.18 with TLS client certificates and 16 ACL checks against `docs/broker/mosquitto/*`.
- GitHub Actions CI (`.github/workflows/ci.yml`): typecheck, lint, tests, build and the broker test on every push and pull request.
- Design decisions documented as ADRs (`docs/adr/`).

## 2026-10-13 – Standards alignment (commit 8b94070)

### Breaking / behavior changes
- **AAS shell id** in BaSyx/AASX exports is now `{globalAssetId}/aas` (previously identical to the globalAssetId). Systems that imported earlier exports will see new shell ids. Import still matches on `globalAssetId`.
- Sparkplug topics for AAS use `device_id = idShort` (previously the IRI, which produced invalid topics).
- RDS codes generated from UNS node names contain only `A–Z0–9`. Stored codes change after "Regenerate Topics".

See the commit message of `8b94070` for the full list of fixes.
