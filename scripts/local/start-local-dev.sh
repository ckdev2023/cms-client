#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export DB_URL="${DB_URL:-postgres://cms:cms@localhost:5433/cms}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://127.0.0.1:5173,http://localhost:5173}"

SERVER_PID=""
ADMIN_PID=""
WORKER_PID=""

is_http_ready() {
  local url="$1"
  curl --silent --fail "$url" >/dev/null 2>&1
}

is_stable_http_ready() {
  local url="$1"
  local attempts="${2:-2}"
  local delay_seconds="${3:-1}"

  local index
  for ((index = 1; index <= attempts; index += 1)); do
    if ! is_http_ready "$url"; then
      return 1
    fi

    if (( index < attempts )); then
      sleep "$delay_seconds"
    fi
  done
}

wait_for_http_ready() {
  local url="$1"
  local attempts="${2:-30}"

  local index
  for ((index = 1; index <= attempts; index += 1)); do
    if is_http_ready "$url"; then
      return 0
    fi

    sleep 1
  done

  return 1
}

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM

  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$ADMIN_PID" ]] && kill -0 "$ADMIN_PID" >/dev/null 2>&1; then
    kill "$ADMIN_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$WORKER_PID" ]] && kill -0 "$WORKER_PID" >/dev/null 2>&1; then
    kill "$WORKER_PID" >/dev/null 2>&1 || true
  fi

  wait >/dev/null 2>&1 || true
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

bash "$ROOT_DIR/scripts/local/start-local-stack.sh"

SERVER_PORT="${PORT:-3300}"
SERVER_HEALTH_URL="http://127.0.0.1:${SERVER_PORT}/health"

if is_stable_http_ready "$SERVER_HEALTH_URL"; then
  echo "[local-dev] reusing existing local server on http://127.0.0.1:${SERVER_PORT}"
else
  echo "[local-dev] starting server on port ${SERVER_PORT}"
  (
    cd "$ROOT_DIR"
    PORT="$SERVER_PORT" npm run server:dev
  ) &
  SERVER_PID=$!

  if ! wait_for_http_ready "$SERVER_HEALTH_URL"; then
    echo "[local-dev] server failed to become healthy on http://127.0.0.1:${SERVER_PORT}" >&2
    exit 1
  fi
fi

echo "[local-dev] starting admin"
(
  cd "$ROOT_DIR"
  npm run admin:dev -- --host 127.0.0.1 --port 5173 --strictPort
) &
ADMIN_PID=$!

if ! wait_for_http_ready "http://127.0.0.1:5173"; then
  echo "[local-dev] admin failed to become reachable on http://127.0.0.1:5173" >&2
  exit 1
fi

echo "[local-dev] starting worker"
(
  cd "$ROOT_DIR"
  npm run worker:dev
) &
WORKER_PID=$!

echo "[local-dev] admin url: http://127.0.0.1:5173"
echo "[local-dev] press Ctrl+C to stop server/admin/worker dev processes"

if [[ -z "$SERVER_PID" && -z "$ADMIN_PID" && -z "$WORKER_PID" ]]; then
  echo "[local-dev] nothing to supervise"
  exit 0
fi

while true; do
  if [[ -n "$SERVER_PID" ]] && ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    wait "$SERVER_PID"
    break
  fi

  if [[ -n "$ADMIN_PID" ]] && ! kill -0 "$ADMIN_PID" >/dev/null 2>&1; then
    wait "$ADMIN_PID"
    break
  fi

  if [[ -n "$WORKER_PID" ]] && ! kill -0 "$WORKER_PID" >/dev/null 2>&1; then
    wait "$WORKER_PID"
    break
  fi

  sleep 1
done
