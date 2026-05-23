#!/bin/bash
# Double-click this file to start the Uplift local web server.
# Open http://localhost:8081 in your browser, or use the LAN IP shown below
# on your phone (must be on the same Wi-Fi).

cd "$(dirname "$0")"

PORT=8081

# Print the LAN IP (helpful for testing on Shepherd's phone)
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "================================================"
echo "  UPLIFT local server"
echo "  Desktop:  http://localhost:${PORT}"
if [ -n "$LAN_IP" ]; then
  echo "  Phone:    http://${LAN_IP}:${PORT}"
else
  echo "  (couldn't detect LAN IP — connect Wi-Fi and rerun)"
fi
echo "  Press Ctrl+C in this window to stop."
echo "================================================"

python3 -m http.server ${PORT}
