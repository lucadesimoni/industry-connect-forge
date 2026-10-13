# ADR 0003: BaSyx and Mosquitto as an optional runtime stack next to the app

- Status: Accepted
- Date: 2026-10-13

## Context

The app models UNS topics and AAS and exports AAS v3 / AASX, but it did not
exchange data with an AAS server or broker. The app is a hosted web frontend
(Lovable) with Supabase. It cannot run containers or long-lived services, and a
browser cannot speak MQTT over TCP/TLS.

## Decision

1. **A separate Docker Compose stack** (`deploy/`) runs Mosquitto (the tested
   configuration) together with the Eclipse BaSyx AAS Environment, the AAS and
   Submodel registries, MongoDB and the AAS Web UI. All images are pinned to
   released versions (not `SNAPSHOT`).
2. **"Push to BaSyx" from the browser** uses the AAS API (IDTA-01002): POST, and
   on 409 PUT `/{collection}/{base64url(id)}`. Submodels and concept descriptions
   go before the shells. The endpoint is stored per browser, because BaSyx usually
   only runs inside the plant network.
3. **BaSyx publishes its repository events** to the broker through an internal,
   unpublished listener with username/password (user `basyx`). The ACL allows it
   only `aas-repository/#` and `sm-repository/#`. UNS consumers read them over TLS.

## Alternatives considered

- **Server-side push (Supabase Edge Function)**: rejected for now. A cloud
  function cannot reach an on-premises BaSyx without exposing it publicly.
- **BaSyx on TLS with client certificates for MQTT**: possible
  (`mqtt.protocol=ssl`), but it needs a Java keystore. The internal network plus
  a password is simpler and still isolated (the port is not published, which is tested).
- **In-memory BaSyx**: simpler, but loses data on restart. MongoDB was chosen.

## Consequences

- The BaSyx API has no authentication in this setup and must stay inside the
  trusted network. Securing it (BaSyx security feature or a reverse proxy with an
  IdP) is a follow-up.
- An HTTPS-hosted app needs BaSyx behind HTTPS (mixed content).
- Image updates are deliberate: bump the tags and run `npm run test:stack`.
