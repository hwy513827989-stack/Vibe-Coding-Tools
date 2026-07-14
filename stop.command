#!/bin/bash
# Double-click this file to stop the Job Tracker server.
PORT=3210

PID=$(lsof -ti:$PORT -sTCP:LISTEN)
if [ -n "$PID" ]; then
  kill $PID
  echo "Job Tracker server stopped."
else
  echo "Job Tracker server was not running."
fi

echo ""
echo "You can close this window."
