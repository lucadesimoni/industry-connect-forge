#!/usr/bin/env bash
# End-to-end test of the runtime stack (deploy/docker-compose.yml):
#   app export -> BaSyx AAS API -> MongoDB, registry sync, MQTT events -> broker (TLS, ACL),
#   CORS policy for the web app, AAS Web UI.
# Requires: docker (compose v2), node/npm deps installed, mosquitto_sub, curl, openssl.
# KEEP_STACK=1 leaves the stack running afterwards.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/deploy"
CREATED_SECRETS=0
if [ ! -e .env ]; then ./scripts/init-dev.sh; CREATED_SECRETS=1; fi
cleanup() {
  if [ "${FAIL:-1}" -ne 0 ]; then docker compose logs --tail 40 aas-env mosquitto || true; fi
  if [ -z "${KEEP_STACK:-}" ]; then
    docker compose down -v >/dev/null 2>&1 || true
    [ "$CREATED_SECRETS" = 1 ] && rm -rf secrets .env
  fi
}
trap cleanup EXIT
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "ok   - $1"; }
fail() { FAIL=$((FAIL+1)); echo "FAIL - $1"; }

docker compose up -d --quiet-pull
echo "# waiting for BaSyx AAS Environment ..."
timeout 300 bash -c 'until curl -sf http://localhost:8081/shells >/dev/null; do sleep 3; done' || { echo "BaSyx did not start"; exit 1; }

# subscribe to BaSyx repository events through the TLS listener as a read-only UNS consumer
C=secrets/clients
EVENTS=$(mktemp)
mosquitto_sub --cafile secrets/certs/ca.crt --cert $C/uns-reader.crt --key $C/uns-reader.key \
  -h localhost -p 8883 -t 'aas-repository/#' -t 'sm-repository/#' -v -W 90 > "$EVENTS" 2>/dev/null &
SUB=$!
sleep 1

RUN_ID="stack-$(date +%s)"
if (cd "$ROOT" && BASYX_URL=http://localhost:8081 TEST_RUN_ID=$RUN_ID npx vitest run src/lib/__tests__/basyx.integration.test.ts); then
  ok "app export accepted, idempotent and read back unchanged by BaSyx (vitest)"
else fail "BaSyx integration tests"; fi

sleep 3; kill $SUB 2>/dev/null || true; wait $SUB 2>/dev/null || true
grep -q '^aas-repository/[^ ]*/shells/created ' "$EVENTS" && ok "BaSyx published shell-created event to the broker (TLS, uns-reader)" || fail "no aas-repository/*/shells/created event"
grep -q '^sm-repository/[^ ]*/submodels/created ' "$EVENTS" && ok "BaSyx published submodel-created events" || fail "no sm-repository/*/submodels/created event"
echo "# event topics seen: $(grep -oE '^(aas|sm)-repository/[^ ]+' "$EVENTS" | sort -u | tr '\n' ' ')"

# registry integration: the shell descriptor is registered automatically
sleep 2
curl -sf http://localhost:8082/shell-descriptors | grep -q "urn:connect-forge:test:$RUN_ID:cnc-01" \
  && ok "shell descriptor registered in the AAS registry" || fail "shell descriptor missing in registry"

# CORS: the configured web app origin is allowed, a foreign origin is not
allow=$(curl -s -o /dev/null -D - -X OPTIONS http://localhost:8081/shells -H 'Origin: http://localhost:8080' \
  -H 'Access-Control-Request-Method: POST' | grep -i '^access-control-allow-origin' || true)
[ -n "$allow" ] && ok "CORS allows the configured app origin" || fail "CORS does not allow http://localhost:8080"
allow_put=$(curl -s -o /dev/null -D - -X OPTIONS "http://localhost:8081/shells/x" -H 'Origin: http://localhost:8080' \
  -H 'Access-Control-Request-Method: PUT' -H 'Access-Control-Request-Headers: content-type' | grep -i '^access-control-allow-methods' || true)
echo "$allow_put" | grep -qi 'PUT' && ok "CORS allows PUT with JSON body (repeat push)" || fail "CORS preflight for PUT not allowed ($allow_put)"
deny=$(curl -s -o /dev/null -D - -X OPTIONS http://localhost:8081/shells -H 'Origin: http://evil.example' \
  -H 'Access-Control-Request-Method: POST' | grep -i '^access-control-allow-origin' || true)
[ -z "$deny" ] && ok "CORS rejects a foreign origin" || fail "CORS allows a foreign origin ($deny)"

# internal broker listener is not published on the host
if (echo > /dev/tcp/127.0.0.1/1883) 2>/dev/null; then fail "port 1883 reachable from the host"; else ok "internal broker listener not published"; fi

curl -sf -o /dev/null http://localhost:3000 && ok "AAS Web UI serves" || fail "AAS Web UI not reachable"

echo "# passed: $PASS, failed: $FAIL"
[ "$FAIL" -eq 0 ]
