#!/usr/bin/env bash

set -euo pipefail

export DB_URL="${DB_URL:-postgres://cms:cms@localhost:5433/cms}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

check_local_redis() {
  node <<'EOF'
const net = require('node:net');

const socket = net.createConnection({ host: '127.0.0.1', port: 6379 });
socket.setTimeout(1000);
socket.on('connect', () => {
  socket.end();
  process.exit(0);
});
socket.on('timeout', () => {
  socket.destroy();
  process.exit(1);
});
socket.on('error', () => {
  process.exit(1);
});
EOF
}

echo "[local] starting postgres via docker compose"
docker compose up -d postgres

echo "[local] waiting for postgres"
until docker compose exec -T postgres pg_isready -U cms -d cms >/dev/null 2>&1; do
  sleep 2
done

echo "[local] starting redis via docker compose"
if docker compose up -d redis; then
  echo "[local] waiting for redis"
  until docker compose exec -T redis redis-cli ping >/dev/null 2>&1; do
    sleep 1
  done
elif check_local_redis; then
  echo "[local] redis port 6379 is already in use, reusing existing local redis"
else
  echo "[local] failed to start docker compose redis and no local redis is reachable on port 6379" >&2
  exit 1
fi

echo "[local] running migrations"
npm run server:db:migrate

echo "[local] bootstrapping local admin"
npm run server:db:init-local-admin

echo "[local] ready"