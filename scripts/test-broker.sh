#!/usr/bin/env bash
# Integration test for deploy/mosquitto/{mosquitto.conf,acl}.
# Starts a real Mosquitto 2.x with TLS client certificates and verifies the
# role permissions with real publish/subscribe round trips.
# Requires: mosquitto, mosquitto_pub, mosquitto_sub, openssl.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF_DIR="$ROOT/deploy/mosquitto"
WORK="$(mktemp -d)"
PORT="${PORT:-18883}"
INTERNAL_PORT="${INTERNAL_PORT:-11883}"
BASYX_PASSWORD="test-$RANDOM-$RANDOM"
trap 'kill ${BROKER_PID:-0} 2>/dev/null || true; [ "${FAIL:-0}" -gt 0 ] && tail -20 "$WORK/broker.log"; rm -rf "$WORK"' EXIT
mkdir -p "$WORK/certs" "$WORK/config" "$WORK/data"

# --- certificates --------------------------------------------------------
cd "$WORK/certs"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=test-ca" -keyout ca.key -out ca.crt 2>/dev/null
mkcert() { # $1 = CN, $2 = file prefix, $3 = extra extfile line
  openssl req -newkey rsa:2048 -nodes -subj "/CN=$1" -keyout "$2.key" -out "$2.csr" 2>/dev/null
  printf '%s\n' "${3:-basicConstraints=CA:FALSE}" > "$2.ext"
  openssl x509 -req -in "$2.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -days 1 -out "$2.crt" -extfile "$2.ext" 2>/dev/null
}
mkcert localhost server "subjectAltName=DNS:localhost,IP:127.0.0.1"
for u in edge-stans-hall3-line01 scada-primary track-and-trace uns-reader intruder; do mkcert "$u" "$u"; done
cd - >/dev/null

# --- broker config: the documented files, only paths/port rewritten -------
sed -e "s#/mosquitto/#$WORK/#g" -e "s#^listener 8883#listener $PORT 127.0.0.1#" \
  -e "s#^listener 1883#listener $INTERNAL_PORT 127.0.0.1#" \
  "$CONF_DIR/mosquitto.conf" > "$WORK/config/mosquitto.conf"
cp "$CONF_DIR/acl" "$WORK/config/acl"
mosquitto_passwd -b -c "$WORK/config/passwd" basyx "$BASYX_PASSWORD" 2>/dev/null
# Mosquitto started as root drops privileges to the 'mosquitto' user. Give it
# the files the way production should (owner mosquitto, not world-readable);
# newer Mosquitto versions refuse world-readable ACL/password files.
if id mosquitto >/dev/null 2>&1; then
  chmod 755 "$WORK"; chown -R mosquitto: "$WORK/config" "$WORK/certs" "$WORK/data"
  chmod 700 "$WORK/config" "$WORK/data"; chmod 600 "$WORK/config/acl" "$WORK/config/passwd" "$WORK/certs/"*.key
fi
mosquitto -c "$WORK/config/mosquitto.conf" > "$WORK/broker.log" 2>&1 &
BROKER_PID=$!
for _ in $(seq 50); do (echo > /dev/tcp/127.0.0.1/$INTERNAL_PORT) 2>/dev/null && break; sleep 0.1; done

# Guard: negative checks pass trivially if the broker is not working, so abort
# unless it is running and its log shows no configuration error.
if ! kill -0 "$BROKER_PID" 2>/dev/null || grep -q "Error:\|Warning:" "$WORK/broker.log"; then
  echo "Broker did not start cleanly:"; cat "$WORK/broker.log"; FAIL=1; exit 1
fi

tls() { echo --cafile "$WORK/certs/ca.crt" --cert "$WORK/certs/$1.crt" --key "$WORK/certs/$1.key" -h localhost -p "$PORT"; }
# internal listener: username/password (BaSyx)
internal() { echo -h 127.0.0.1 -p "$INTERNAL_PORT" -u "$1" -P "$2"; }
pub() {
  local u=$1; shift
  case "$u" in
    basyx) mosquitto_pub $(internal basyx "$BASYX_PASSWORD") -V mqttv5 -q 1 "$@" >/dev/null 2>&1 || true ;;
    basyx-wrongpw) mosquitto_pub $(internal basyx wrong) -V mqttv5 -q 1 "$@" >/dev/null 2>&1 || true ;;
    anonymous-internal) mosquitto_pub -h 127.0.0.1 -p "$INTERNAL_PORT" -V mqttv5 -q 1 "$@" >/dev/null 2>&1 || true ;;
    *) mosquitto_pub $(tls "$u") -V mqttv5 -q 1 "$@" >/dev/null 2>&1 || true ;;
  esac
}
# expect_msg <subscriber> <filter> <publisher> <topic> <expect yes|no> [extra pub args]
PASS=0; FAIL=0
check() {
  local desc=$1 sub=$2 filter=$3 publisher=$4 topic=$5 expect=$6; shift 6
  local out="$WORK/out.$RANDOM"
  mosquitto_sub $(tls "$sub") -V mqttv5 -q 1 -t "$filter" -C 1 -W 2 > "$out" 2>/dev/null &
  local spid=$!; sleep 0.4
  [ "$publisher" != "-" ] && pub "$publisher" -t "$topic" -m "msg" "$@"
  wait $spid 2>/dev/null || true
  local got=no; [ -s "$out" ] && got=yes
  if [ "$got" = "$expect" ]; then PASS=$((PASS+1)); echo "ok   - $desc";
  else FAIL=$((FAIL+1)); echo "FAIL - $desc (expected delivery=$expect, got=$got)"; fi
}

E=edge-stans-hall3-line01
SP=spBv1.0/Pilatus

# anonymous / no client certificate must be refused
if mosquitto_pub --cafile "$WORK/certs/ca.crt" -h localhost -p "$PORT" -t x -m y >/dev/null 2>&1; then
  FAIL=$((FAIL+1)); echo "FAIL - connection without client certificate accepted"
else PASS=$((PASS+1)); echo "ok   - connection without client certificate refused"; fi

check "edge publishes DDATA for its own device"            uns-reader "$SP/#" $E "$SP/DDATA/Stans-Hall-3-Line_01/CNC_5" yes
check "edge publishes NBIRTH for its own edge node"        uns-reader "$SP/#" $E "$SP/NBIRTH/Stans-Hall-3-Line_01" yes
check "edge cannot impersonate another edge node"          uns-reader "$SP/#" $E "$SP/DDATA/Stans-Hall-3-Line_02/CNC_9" no
check "edge cannot publish into another group"             uns-reader "spBv1.0/#" $E "spBv1.0/Other/NDATA/Stans-Hall-3-Line_01" no
check "edge publishes UNS state of its own line"           uns-reader "Pilatus/#" $E "Pilatus/Stans/Hall-3/Line_01/CNC_5" yes
check "edge cannot publish UNS state of another line"      uns-reader "Pilatus/#" $E "Pilatus/Stans/Hall-3/Line_02/X" no
check "edge receives commands for its own edge node"       $E "$SP/NCMD/Stans-Hall-3-Line_01" scada-primary "$SP/NCMD/Stans-Hall-3-Line_01" yes
check "edge cannot read commands of another edge node"     $E "$SP/NCMD/Stans-Hall-3-Line_02" scada-primary "$SP/NCMD/Stans-Hall-3-Line_02" no
check "edge cannot send commands"                          uns-reader "$SP/#" $E "$SP/NCMD/Stans-Hall-3-Line_02" no
check "track-and-trace publishes asset location"           uns-reader "enterprise/#" track-and-trace "enterprise/locations/Stans/Hall-3/Line_01/assets/box-1" yes
check "read-only consumer cannot publish"                  scada-primary "$SP/#" uns-reader "$SP/NDATA/Stans-Hall-3-Line_01" no
check "unknown client (valid cert, no ACL) cannot publish" uns-reader "Pilatus/#" intruder "Pilatus/Stans/Hall-3/Line_01/X" no
check "unknown client cannot read"                         intruder "Pilatus/#" $E "Pilatus/Stans/Hall-3/Line_01/Y" no

# BaSyx (internal listener, password) publishes only its repository events
check "basyx publishes AAS repository events"              uns-reader "aas-repository/#" basyx "aas-repository/aas-repo/shells/created" yes
check "basyx publishes submodel repository events"         uns-reader "sm-repository/#" basyx "sm-repository/sm-repo/submodels/created" yes
check "basyx cannot publish into the UNS"                  uns-reader "Pilatus/#" basyx "Pilatus/Stans/X" no
check "basyx cannot publish Sparkplug"                     uns-reader "spBv1.0/#" basyx "spBv1.0/Pilatus/NDATA/Stans-Hall-3-Line_01" no
check "wrong password on internal listener is refused"     uns-reader "aas-repository/#" basyx-wrongpw "aas-repository/x/shells/created" no
check "anonymous on internal listener is refused"          uns-reader "aas-repository/#" anonymous-internal "aas-repository/x/shells/created" no
check "edge node cannot fake BaSyx events"                 uns-reader "aas-repository/#" $E "aas-repository/x/shells/created" no

# Sparkplug host STATE: retained, QoS 1, JSON {online,timestamp}; edge nodes read it later
pub scada-primary -t spBv1.0/STATE/scada-primary -r -m "{\"online\":true,\"timestamp\":$(date +%s)000}"
check "edge reads retained primary host STATE"              $E "spBv1.0/STATE/+" - - yes

# NDEATH as MQTT Will (QoS 1, not retained) is delivered when the edge node dies
OUT="$WORK/ndeath"
mosquitto_sub $(tls uns-reader) -t "$SP/NDEATH/#" -C 1 -W 5 > "$OUT" 2>/dev/null & RPID=$!
sleep 0.4
mosquitto_sub $(tls $E) -t "$SP/NCMD/Stans-Hall-3-Line_01" --will-topic "$SP/NDEATH/Stans-Hall-3-Line_01" \
  --will-payload "bdSeq=0" --will-qos 1 -k 5 >/dev/null 2>&1 & EPID=$!
sleep 0.6; kill -9 $EPID 2>/dev/null || true
wait $RPID 2>/dev/null || true
if [ -s "$OUT" ]; then PASS=$((PASS+1)); echo "ok   - NDEATH will message delivered after edge node loss";
else FAIL=$((FAIL+1)); echo "FAIL - NDEATH will message not delivered"; fi

echo "# broker: $(mosquitto -h 2>&1 | head -1)"
echo "# passed: $PASS, failed: $FAIL"
[ "$FAIL" -eq 0 ]
