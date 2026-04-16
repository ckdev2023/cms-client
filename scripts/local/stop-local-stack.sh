#!/usr/bin/env bash

set -euo pipefail

echo "[local] stopping docker compose services"
docker compose down
