#!/usr/bin/env bash
# Create DEVELOPMENT secrets for the stack: a throw-away CA, broker server
# certificate, client certificates per ACL role, the Mosquitto password file and
# deploy/.env with random passwords. For production use your PKI and a secret store.
set -euo pipefail
cd "$(dirname "$0")/.."
SECRETS=secrets
if [ -e "$SECRETS" ] || [ -e .env ]; then
  echo "secrets/ or .env already exist - remove them first to regenerate." >&2; exit 1
fi
umask 077
mkdir -p "$SECRETS/certs" "$SECRETS/mosquitto" "$SECRETS/clients"
rand() { openssl rand -hex 16; }
MONGO_PASSWORD=$(rand); MQTT_BASYX_PASSWORD=$(rand)

cat > .env <<ENV
MONGO_USER=basyx
MONGO_PASSWORD=$MONGO_PASSWORD
MQTT_BASYX_PASSWORD=$MQTT_BASYX_PASSWORD
# Origin(s) of the Connect Forge web app allowed to call BaSyx from the browser (comma separated)
BASYX_CORS_ALLOWED_ORIGINS=http://localhost:8080
BASYX_EXTERNAL_URL=http://localhost:8081
ENV

cd "$SECRETS/certs"
openssl req -x509 -newkey rsa:2048 -nodes -days 825 -subj "/CN=connect-forge-dev-ca" -keyout ca.key -out ca.crt 2>/dev/null
sign() { # $1 CN, $2 out prefix, $3 extfile content
  openssl req -newkey rsa:2048 -nodes -subj "/CN=$1" -keyout "$2.key" -out "$2.csr" 2>/dev/null
  printf '%s\n' "$3" > "$2.ext"
  openssl x509 -req -in "$2.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -days 825 -out "$2.crt" -extfile "$2.ext" 2>/dev/null
  rm -f "$2.csr" "$2.ext"
}
sign localhost server "subjectAltName=DNS:localhost,DNS:mosquitto,IP:127.0.0.1"
cd ../clients
for role in edge-stans-hall3-line01 scada-primary track-and-trace uns-reader monitoring; do
  (cd ../certs && sign "$role" "../clients/$role" "basicConstraints=CA:FALSE")
done
cd ../..

# Mosquitto password file (internal listener, user "basyx"), hashed by mosquitto_passwd
if command -v mosquitto_passwd >/dev/null; then
  mosquitto_passwd -b -c "$SECRETS/mosquitto/passwd" basyx "$MQTT_BASYX_PASSWORD"
else
  # run as the calling user so the file is owned by it (chmod below must work)
  docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/$SECRETS/mosquitto:/out" eclipse-mosquitto:2.0.18 \
    mosquitto_passwd -b -c /out/passwd basyx "$MQTT_BASYX_PASSWORD"
fi
# The broker container runs as user "mosquitto" (uid 1883) and must read the
# mounted files. Dev setup: make exactly those readable; CA key and client keys
# stay private (600). In production, chown the files to uid 1883 instead.
chmod 755 "$SECRETS" "$SECRETS/certs" "$SECRETS/mosquitto"
chmod 644 "$SECRETS/certs/ca.crt" "$SECRETS/certs/server.crt" "$SECRETS/certs/server.key" "$SECRETS/mosquitto/passwd"
echo "Created deploy/.env and deploy/secrets/ (dev only). Client certificates: deploy/secrets/clients/"
