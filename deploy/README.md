# Runtime stack: UNS broker + Eclipse BaSyx

Optional companion to the Connect Forge web app. It runs **next to** the app
(on-premises / edge), not inside Lovable: the app is a hosted web frontend and
cannot run services. See [ADR 0003](../docs/adr/0003-basyx-mosquitto-runtime-stack.md).

| Service | Image (pinned) | Port | Purpose |
|---|---|---|---|
| `mosquitto` | `eclipse-mosquitto:2.0.18` | 8883 (TLS, client certs) | UNS / Sparkplug broker, config in `mosquitto/` |
| `aas-env` | `eclipsebasyx/aas-environment:2.0.0-milestone-15` | 8081 | AAS, Submodel and ConceptDescription repositories (AAS API, IDTA-01002) |
| `aas-registry` | `eclipsebasyx/aas-registry-log-mongodb:2.0.0-milestone-15` | 8082 | AAS registry (filled automatically by `aas-env`) |
| `sm-registry` | `eclipsebasyx/submodel-registry-log-mongodb:2.0.0-milestone-15` | 8083 | Submodel registry |
| `aas-web-ui` | `eclipsebasyx/aas-gui:v2-260924` | 3000 | BaSyx AAS Web UI |
| `mongo` | `mongo:8.0` | – | persistence for BaSyx |

## Start (development)

```sh
cd deploy
./scripts/init-dev.sh      # dev CA + certificates, broker password file, .env with random passwords
docker compose up -d
```

- BaSyx AAS API: http://localhost:8081/shells, Web UI: http://localhost:3000
- Broker: `mqtts://localhost:8883`, client certificates per role in `secrets/clients/`
  (`edge-stans-hall3-line01`, `scada-primary`, `track-and-trace`, `uns-reader`, `monitoring`), CA `secrets/certs/ca.crt`

Example consumer: all BaSyx repository events

```sh
mosquitto_sub --cafile secrets/certs/ca.crt --cert secrets/clients/uns-reader.crt --key secrets/clients/uns-reader.key \
  -h localhost -p 8883 -t 'aas-repository/#' -t 'sm-repository/#' -v
```

## Push AAS from the app

In the app: **AAS → Push to BaSyx** (all) or **Push** in the AAS detail view.
Enter the BaSyx URL (stored in this browser only) → *Test* → *Push*.

The request goes **directly from the browser**, so:

1. The browser must reach the BaSyx server (plant network / VPN).
2. BaSyx must allow the app's origin. Set it in `.env`:
   `BASYX_CORS_ALLOWED_ORIGINS=https://<your-app>.lovable.app,http://localhost:8080`
   and restart (`docker compose up -d`).
3. If the app is served via HTTPS, browsers block calls to `http://` BaSyx
   (mixed content). Put BaSyx behind a TLS reverse proxy (HTTPS) for that case.

Push is idempotent: existing shells/submodels with the same id are replaced (POST, on 409 PUT).

## Security notes

- `init-dev.sh` creates **development** secrets only. For production use your PKI,
  a secret store, and file ownership `mosquitto` (uid 1883) with mode 600 instead of
  world-readable files.
- The BaSyx HTTP API has **no authentication** in this setup (BaSyx security is a
  separate feature, see the BaSyxSecured example of the BaSyx project). Do not expose
  ports 8081–8083/3000 beyond the trusted network.
- The internal broker listener (1883, password) is not published on the host; only
  containers on the compose network reach it.

## Test

```sh
npm run test:stack   # from the repository root; starts, tests and removes the stack
```
