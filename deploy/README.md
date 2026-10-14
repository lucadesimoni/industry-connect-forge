# Runtime stack: UNS broker + Eclipse BaSyx

Optional companion to the Connect Forge web app. It runs **next to** the app
(on-premises / edge), not inside Lovable: the app is a hosted web frontend and
cannot run services. See [ADR 0003](../docs/adr/0003-basyx-mosquitto-runtime-stack.md).

| Service | Image (pinned) | Port | Purpose |
|---|---|---|---|
| `mosquitto` | `eclipse-mosquitto:2.0.18` | 8883 (TLS, client certs) | UNS / Sparkplug broker, config in `mosquitto/` |
| `basyx-proxy` | `nginx:1.30.5-alpine` | **8443 (HTTPS + login)** | the only network entry to the AAS API, config in `proxy/` |
| `aas-env` | `eclipsebasyx/aas-environment:2.0.0-milestone-15` | 127.0.0.1:8081 | AAS, Submodel and ConceptDescription repositories (AAS API, IDTA-01002) |
| `aas-registry` | `eclipsebasyx/aas-registry-log-mongodb:2.0.0-milestone-15` | 127.0.0.1:8082 | AAS registry (filled automatically by `aas-env`) |
| `sm-registry` | `eclipsebasyx/submodel-registry-log-mongodb:2.0.0-milestone-15` | 127.0.0.1:8083 | Submodel registry |
| `aas-web-ui` | `eclipsebasyx/aas-gui:v2-260924` | 127.0.0.1:3000 | BaSyx AAS Web UI (local administration) |

Ports bound to `127.0.0.1` are reachable only on the Docker host itself.
| `mongo` | `mongo:8.0` | – | persistence for BaSyx |

## Start (development)

```sh
cd deploy
./scripts/init-dev.sh      # dev CA + certificates, broker password file, .env with random passwords
docker compose up -d
```

- AAS API for the network: **https://<host>:8443** (login `BASYX_API_USER` / `BASYX_API_PASSWORD` from `.env`)
- On the host only: BaSyx http://localhost:8081/shells, Web UI http://localhost:3000
- Broker: `mqtts://localhost:8883`, client certificates per role in `secrets/clients/`
  (`edge-stans-hall3-line01`, `scada-primary`, `track-and-trace`, `uns-reader`, `monitoring`), CA `secrets/certs/ca.crt`

Example consumer: all BaSyx repository events

```sh
mosquitto_sub --cafile secrets/certs/ca.crt --cert secrets/clients/uns-reader.crt --key secrets/clients/uns-reader.key \
  -h localhost -p 8883 -t 'aas-repository/#' -t 'sm-repository/#' -v
```

## Push AAS from the app

In the app: **AAS → Push to BaSyx** (all) or **Push** in the AAS detail view.
Enter the proxy URL `https://<host>:8443`, the username and password → *Test* → *Push*.
URL and username are remembered in the browser, the password is not.

The request goes **directly from the browser**, so:

1. The browser must reach the proxy (plant network / VPN).
2. BaSyx must allow the app's origin. Set it in `.env`:
   `BASYX_CORS_ALLOWED_ORIGINS=https://<your-app>.lovable.app,http://localhost:8080`
   and restart (`docker compose up -d`).
3. The browser must trust the proxy certificate. With the dev setup, import
   `secrets/certs/ca.crt` as a trusted CA on the client (or use a certificate from your PKI
   whose name matches the host; the dev certificate is issued for `localhost`).
   Because the proxy speaks HTTPS, an HTTPS-hosted app (lovable.app) can call it without
   mixed-content blocking.

Push is idempotent: existing shells/submodels with the same id are replaced (POST, on 409 PUT).

## Security notes

- `init-dev.sh` creates **development** secrets only. For production use your PKI,
  a secret store, and file ownership `mosquitto` (uid 1883) with mode 600 instead of
  world-readable files.
- Network access to the AAS API goes only through `basyx-proxy`: HTTPS (TLS 1.2/1.3) and
  HTTP Basic login (SHA-512 crypt hash in `secrets/proxy/htpasswd`). CORS preflights are
  answered without login, as browsers send them without credentials. One shared account;
  for per-user accounts and roles use the BaSyx security feature (Keycloak, see the
  BaSyxSecured example of the BaSyx project) – a possible next step.
- BaSyx, the registries and the Web UI listen on `127.0.0.1` only; the registries and the
  Web UI have no login and are meant for local administration.
- The internal broker listener (1883, password) is not published on the host; only
  containers on the compose network reach it.

## Test

```sh
npm run test:stack   # from the repository root; starts, tests and removes the stack
```
