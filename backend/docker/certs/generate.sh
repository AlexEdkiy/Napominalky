#!/usr/bin/env sh
# Generate a self-signed SSL certificate for local development.
# Run this script once before `docker compose up` if certs are missing.
#
# Usage: sh docker/certs/generate.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$SCRIPT_DIR/selfsigned.key" \
  -out    "$SCRIPT_DIR/selfsigned.crt" \
  -subj   "/C=RU/ST=Moscow/L=Moscow/O=Reminders Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Self-signed certificate generated in $SCRIPT_DIR"
echo "  selfsigned.crt"
echo "  selfsigned.key"
