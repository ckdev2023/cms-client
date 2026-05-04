#!/usr/bin/env bash
#
# 日志按天归档：把昨天的日志从 docker 抓出来，gzip 压缩后写到 backup/logs/
# 适合每天凌晨跑一次，配合 docker json-file 的 max-size 限制，老的日志被滚走前先归档下来。
#
# 用法：
#   bash scripts/log-export.sh                # 导出昨天（默认）
#   bash scripts/log-export.sh 24h            # 导出过去 24 小时
#   bash scripts/log-export.sh 7d             # 导出过去 7 天（一次性补抓）
#
# cron 示例（每天 04:00 跑）：
#   0 4 * * * cd /opt/cms/release && bash scripts/log-export.sh >> backup/logs/cron.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$RELEASE_DIR/compose/docker-compose.prod.yml"
ENV_FILE="$RELEASE_DIR/.env"
LOGS_DIR="$RELEASE_DIR/backup/logs"
RETENTION_DAYS="${LOG_RETENTION_DAYS:-30}"

mkdir -p "$LOGS_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[log-export] 缺少 .env"
  exit 1
fi

DC=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

# 时间窗口：默认昨天（24h 前 → 现在），也可命令行覆盖
SINCE="${1:-24h}"
TS="$(date +%Y%m%d-%H%M%S)"

services=(api worker web postgres redis)

echo "[log-export] window=$SINCE → ${LOGS_DIR}/"

for svc in "${services[@]}"; do
  out="${LOGS_DIR}/${svc}-${TS}.log.gz"
  # --no-color 防止 ANSI 颜色码污染归档
  if "${DC[@]}" logs --no-color --since "$SINCE" "$svc" 2>&1 | gzip > "$out"; then
    sz=$(du -h "$out" | awk '{print $1}')
    echo "  ${svc}: ${sz}  ${out}"
  else
    echo "  ${svc}: 导出失败"
    rm -f "$out"
  fi
done

echo "[log-export] 清理 ${RETENTION_DAYS} 天前的归档"
find "$LOGS_DIR" -type f -name '*.log.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[log-export] 完成。最近归档："
ls -lh "$LOGS_DIR" | tail -n +2 | tail -20
