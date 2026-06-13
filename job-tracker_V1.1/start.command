#!/bin/bash
# Double-click this file to start the Job Tracker server and open it in your browser.
cd "$(dirname "$0")"

PORT=3210

# If the server isn't already running, start it in the background.
if ! lsof -i:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Starting Job Tracker server..."
  nohup node server.js > server.log 2>&1 &
  sleep 1
else
  echo "Job Tracker server is already running."
fi

open "http://localhost:$PORT"

echo ""
echo "Job Tracker is running at http://localhost:$PORT"
echo "You can close this window — the server keeps running in the background."
echo "To stop it later, double-click stop.command."
