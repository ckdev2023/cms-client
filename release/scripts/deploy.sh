#!/usr/bin/env bash
#
# 增量升级：拉代码 → 重建镜像 → 跑迁移 → 滚动重启 api/worker/web
#
# 用法：
#   cd release
#   bash scripts/deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$RELEASE_DIR/.." && pwd)"
COMPOSE_FILE="$RELEASE_DIR/compose/docker-compose.prod.yml"
ENV_FILE="$RELEASE_DIR/.env"

cd "$RELEASE_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[deploy] 缺少 .env，先跑 bootstrap.sh"
  exit 1
fi

# 升级前先做一次自动备份（rotate by backup.sh 自身）
echo "[deploy] 先备份一次（保险）"
bash "$SCRIPT_DIR/backup.sh"

echo "[deploy] 拉取最新代码"
git -C "$REPO_DIR" pull --ff-only

echo "[deploy] 构建 api/web 镜像"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build api web

echo "[deploy] 跑数据库迁移"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate

echo "[deploy] 重启 api / worker / web（短暂中断 ~5s）"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate api worker web

echo "[deploy] 等待健康检查"
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps api \
       | grep -q "(healthy)"; then
    echo "[deploy] api 已健康"
    break
  fi
  sleep 2
done

echo "[deploy] 当前服务状态："
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "[deploy] 完成。如发现问题，可回滚："
echo "  git -C $REPO_DIR reset --hard <上一个 commit>"
echo "  bash scripts/deploy.sh"
echo "  数据如已变化，请用 backup/ 下最近的备份恢复（见 README）。"
