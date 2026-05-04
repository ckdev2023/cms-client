#!/usr/bin/env bash
#
# 备份：pg_dump 数据库 + 打包 storage 目录
# 默认保留最近 7 天，旧的自动删除。
#
# 建议加 cron：
#   0 3 * * * cd /opt/cms/release && bash scripts/backup.sh >> backup/cron.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$RELEASE_DIR/compose/docker-compose.prod.yml"
ENV_FILE="$RELEASE_DIR/.env"
BACKUP_DIR="$RELEASE_DIR/backup"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[backup] 缺少 .env"
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

TS="$(date +%Y%m%d-%H%M%S)"
DB_DUMP="$BACKUP_DIR/db-${TS}.sql.gz"
STORAGE_TAR="$BACKUP_DIR/storage-${TS}.tar.gz"

echo "[backup] 数据库 → ${DB_DUMP}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  sh -c "pg_dump -U \"\$POSTGRES_USER\" \"\$POSTGRES_DB\"" \
  | gzip > "$DB_DUMP"

if [[ ! -s "$DB_DUMP" ]]; then
  echo "[backup] 数据库备份为空，可能失败"
  exit 1
fi

# storage 用 host bind mount 在 release/data/storage，直接 tar
if [[ -d "$RELEASE_DIR/data/storage" ]]; then
  echo "[backup] 存储 → ${STORAGE_TAR}"
  tar -C "$RELEASE_DIR/data" -czf "$STORAGE_TAR" storage
else
  echo "[backup] 跳过 storage（目录不存在）"
fi

echo "[backup] 清理 ${RETENTION_DAYS} 天前的旧备份"
find "$BACKUP_DIR" -type f -name 'db-*.sql.gz'    -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'storage-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[backup] 完成。当前备份："
ls -lh "$BACKUP_DIR" | tail -n +2

echo ""
echo "[backup] 提示：测试期请把 backup/ 同步到一台异地机器或对象存储，"
echo "        例如：rclone copy backup/ remote:cms-backup --include 'db-*.sql.gz' --include 'storage-*.tar.gz'"
