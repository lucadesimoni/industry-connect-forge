# Changelog

## 2026-10-14 – BaSyx secured, constraints validated

### Security
- `basyx-proxy` (nginx 1.30.5) is now the only network entry to the AAS API: HTTPS (TLS 1.2/1.3) and login (HTTP Basic, SHA-512 crypt). BaSyx, the registries and the Web UI are bound to `127.0.0.1`. An HTTPS-hosted app can now call BaSyx without mixed-content blocking.
- "Push to BaSyx": new username/password fields. The password stays in memory only. The default URL is `https://localhost:8443`.

### Database
- Migration `20261015000000` validates the 4 syntax constraints for existing rows (0 violations checked beforehand). PGlite tests show it succeeds on clean data, and fails without changing anything on an invalid old row.

### Verification
- `test-stack.sh` now has 15 checks:
  - without login → 401, wrong password → 401, valid login → 200;
  - the TLS certificate is verified;
  - CORS preflight without login allows the `Authorization` header;
  - services are bound to localhost only;
  - push through the proxy with login.
  Counter-checks: without `auth_basic` exactly the two 401 checks fail; a port published to the network is reported.
- Unit tests use the RFC 7617 test vectors for the login header.

## 2026-10-13 – Runtime stack: Eclipse BaSyx + Mosquitto

### Added
- `deploy/`: Docker Compose stack with Mosquitto (tested configuration), the Eclipse BaSyx AAS Environment, the AAS and Submodel registries, MongoDB and the AAS Web UI. All images pinned. `init-dev.sh` creates development certificates and secrets (ADR 0003).
- **Push to BaSyx** in the app (all AAS, or a single AAS from the detail view): AAS API (IDTA-01002), idempotent (POST, then PUT on 409), with a per-element result list and a connection test.
- Broker: internal listener (password) for BaSyx repository events. ACL role `basyx` limited to `aas-repository/#` and `sm-repository/#`; read access for `uns-reader`.

### Changed
- The Mosquitto configuration moved from `docs/broker/mosquitto/` to `deploy/mosquitto/`. It is the single source for the documentation, the tests and the stack.

### Verification
- `scripts/test-stack.sh` (CI job *Runtime stack*) runs against real BaSyx and Mosquitto. It checks:
  - push and idempotent re-push, and read-back with unchanged semantics through the app's own parser;
  - registry entry;
  - BaSyx MQTT events at the broker over TLS;
  - CORS: app origin allowed, foreign origin rejected, PUT preflight;
  - internal listener not published;
  - Web UI reachable.
  It was counter-checked: without the ACL role `basyx`, the two event checks fail.
- `test-broker.sh` has 23 checks, including the BaSyx role, wrong password, anonymous client and fake events.
- `basyxClient.test.ts`: the identifier encoding is checked against the test vector from the BaSyx source code.

## 2026-10-13 – Fixes after the first "Regenerate Topics" on production data

### Fixed
- **Sparkplug roles**: Cells were given a node topic (`NDATA/{…-Cell}`) with the Cell name inside the edge node id, and Enterprise nodes got the placeholder edge id `node`. Now Lines publish `NDATA` as edge nodes, Cells publish `DDATA/{line edge}/{cell}` as devices, and Enterprise, Site and Area get no Sparkplug topic (ADR 0001).
- **Location codes**:
  - The location RDS (aspect `+`) linked to a node is now the source of truth for its `rds_location`. Regenerate and edit keep it, so the UNS metadata matches the RDS designations again (e.g. `+PIL.STANS.HALL3.LN01` instead of `+PILATUSA.STANSFAC.ASSEMBLY.ASSEMBLY`).
  - Codes derived from names are no longer truncated to 8 characters. Truncation made "Assembly Hall 3" and "Assembly Line 01" collide as `ASSEMBLY`, and "CNC Line 01" and "CNC Line 02" as `CNCLINE0`.
  - Regenerate reports location code clashes instead of writing them silently.
  - Creating a location node whose code is already used by another location is blocked. Before, the location RDS was silently not created.

### Verification
- `unsRegenerate.test.ts` replays Regenerate on the real hierarchy and location RDS. With the old behavior restored, 4 of its tests fail.

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
