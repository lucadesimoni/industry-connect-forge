# ADR 0002: Literal `enterprise/` root for Track & Trace and location topics

- Status: Accepted (existing convention; revisit before production)
- Date: 2026-10-14

## Context

UNS state topics start with the real enterprise name
(`Pilatus/Stans/Hall-3/Line_01/...`). The Track & Trace design
(`.lovable/plan.md`) defines asset, location and context topics under a literal
`enterprise/` root (`enterprise/assets/{id}`, `enterprise/locations/...`,
`enterprise/contexts/...`). The UNS location projection
(`generateLocationTopic`) uses the same literal root so that both meet.
As a result, the broker carries **two roots**.

## Decision

Keep the literal `enterprise/` root for now, because it is the documented
contract of the existing Track & Trace feature. Both generators share it and
tests cover it (`hierarchyUtils.test.ts`: location assets filter matches a
tracked asset topic).

## Alternatives

1. **Use the enterprise name** (`Pilatus/_assets/...`, `Pilatus/_locations/...`):
   one root and multi-enterprise capable, but it breaks existing subscribers of
   the Track & Trace topics.
2. **Configurable root** (per site or tenant setting): the most flexible option,
   but it needs a settings model.

## Consequences

- ACLs need separate rules for `enterprise/#` and `{Enterprise}/#` (see
  `deploy/mosquitto/acl`).
- A broker shared by several enterprises cannot separate their Track & Trace
  data by topic. If that becomes a requirement, switch to alternative 1 or 2
  with a migration period that publishes to both roots.
