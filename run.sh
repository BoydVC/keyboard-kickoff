#!/usr/bin/env bash
# Keyboard Kickoff: ./run.sh [start|stop|status|build|test|shots|all]
#   start   build, then serve on http://127.0.0.1:4353/ (stdlib server.py)
#   test    build + smoke test (headless Chrome play test, ~2 min) -> tests/smoke-test.log
#   shots   regenerate screenshots (headless Chrome, ~8 min since it types at kid speed)
set -euo pipefail
cd "$(dirname "$0")"
PORT=4353; PIDF=.server.pid
status() { if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then echo "running: http://127.0.0.1:$PORT/ (pid $(cat "$PIDF"))"; else echo "not running"; return 1; fi; }
start() { python3 build.py; if status >/dev/null 2>&1; then status; return; fi
  setsid nohup python3 server.py > .server.log 2>&1 < /dev/null & echo $! > "$PIDF"; sleep 0.7; status
  echo "offline copy: $(pwd)/dist/keyboard-kickoff.html (open directly, no server needed)"; }
stop() { [ -f "$PIDF" ] && kill "$(cat "$PIDF")" 2>/dev/null || true; rm -f "$PIDF"; echo stopped; }
case "${1:-start}" in
  start) start;; stop) stop;; status) status;; build) python3 build.py;;
  test) python3 tests/smoke_test.py;;
  shots) python3 build.py && node --experimental-websocket tests/shots.mjs;;
  all) python3 build.py && node --experimental-websocket tests/shots.mjs && python3 tests/smoke_test.py && start;;
  *) echo "usage: $0 start|stop|status|build|test|shots|all"; exit 2;;
esac
