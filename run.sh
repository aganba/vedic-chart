#!/bin/sh
# Serve on all interfaces so phones/tablets on the same Wi-Fi can connect.
# Plain http by default. Uses https if certs/ exists (created with mkcert);
# browsers only share device location over https or on localhost.
cd "$(dirname "$0")"
IP=$(ipconfig getifaddr en0 2>/dev/null)
HOST="$(scutil --get LocalHostName 2>/dev/null).local"

if [ -f certs/cert.pem ] && [ -f certs/key.pem ]; then
  echo "Open https://localhost:8443 on this Mac, or from other devices:"
  echo "  https://$HOST:8443${IP:+   or   https://$IP:8443}"
  exec .venv/bin/python -m app.serve 8443 certs/cert.pem certs/key.pem
else
  echo "Open http://localhost:8000 on this Mac, or from other devices:"
  echo "  http://$HOST:8000${IP:+   or   http://$IP:8000}"
  exec .venv/bin/python -m app.serve 8000
fi
