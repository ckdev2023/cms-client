#!/usr/bin/env bash
#
# 日志查询封装
#
# 用法：
#   bash scripts/logs.sh                       # 实时跟所有服务（含 caddy access log）
#   bash scripts/logs.sh api                   # 只看 api
#   bash scripts/logs.sh worker                # 只看 worker
#   bash scripts/logs.sh tail api 200          # 看 api 最近 200 行
#   bash scripts/logs.sh since api 30m         # 看 api 最近 30 分钟
#   bash scripts/logs.sh since api 2h          # 最近 2 小时
#   bash scripts/logs.sh errors                # 全部服务最近 1 小时的 error/warn
#   bash scripts/logs.sh access                # caddy 访问日志（json，过滤 4xx/5xx）
#   bash scripts/logs.sh size                  # 看每个 service 当前日志占用磁盘
#   bash scripts/logs.sh truncate              # 紧急：清空所有 service 的日志（强删，慎用）
#
# 提示：caddy access log 是 json，可以接 jq：
#   bash scripts/logs.sh access | jq 'select(.status >= 400)'

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$RELEASE_DIR/compose/docker-compose.prod.yml"
ENV_FILE="$RELEASE_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[logs] 缺少 .env"
  exit 1
fi

DC=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

cmd="${1:-follow}"

case "$cmd" in
  follow|"")
    "${DC[@]}" logs -f --tail 100
    ;;

  api|worker|web|postgres|redis|migrate)
    "${DC[@]}" logs -f --tail 100 "$cmd"
    ;;

  tail)
    svc="${2:?usage: logs.sh tail <service> [lines]}"
    lines="${3:-200}"
    "${DC[@]}" logs --tail "$lines" "$svc"
    ;;

  since)
    svc="${2:?usage: logs.sh since <service> <duration>, e.g. 30m | 2h | 1d}"
    dur="${3:?usage: logs.sh since <service> <duration>}"
    "${DC[@]}" logs --since "$dur" "$svc"
    ;;

  errors)
    dur="${2:-1h}"
    echo "[logs] 全部服务最近 $dur 内的 error/warn/exception"
    "${DC[@]}" logs --since "$dur" 2>&1 \
      | grep --color=always -iE 'error|warn|exception|fatal|panic|fail' \
      || echo "[logs] 没有匹配项"
    ;;

  access)
    # caddy access log（json）。过滤健康检查（已在 Caddyfile log_skip，无需 grep）
    "${DC[@]}" logs --tail 500 web 2>&1 \
      | grep -E '"level":"info".*"msg":"handled request"' \
      || "${DC[@]}" logs --tail 500 web
    ;;

  size)
    echo "[logs] 各 service 日志文件大小（host 上 docker 默认路径）"
    for svc in postgres redis api worker web; do
      cid=$("${DC[@]}" ps -q "$svc" 2>/dev/null || true)
      if [[ -z "$cid" ]]; then
        printf "  %-10s  (not running)\n" "$svc"
        continue
      fi
      log_path=$(docker inspect --format='{{.LogPath}}' "$cid" 2>/dev/null || echo "")
      if [[ -z "$log_path" ]] || [[ ! -e "$log_path" ]]; then
        printf "  %-10s  (no log file)\n" "$svc"
        continue
      fi
      # log_path 在宿主机 root 权限路径，可能需要 sudo
      sz=$(sudo -n du -sh "$log_path" 2>/dev/null | awk '{print $1}' \
           || du -sh "$log_path" 2>/dev/null | awk '{print $1}' \
           || echo "?")
      printf "  %-10s  %-10s  %s\n" "$svc" "$sz" "$log_path"
    done
    ;;

  truncate)
    echo "[logs] 警告：将清空 api / worker / web 的容器日志（postgres/redis 不动）"
    read -rp "确认请输入 yes: " confirm
    if [[ "$confirm" != "yes" ]]; then
      echo "[logs] 已取消"
      exit 0
    fi
    for svc in api worker web; do
      cid=$("${DC[@]}" ps -q "$svc" 2>/dev/null || true)
      [[ -z "$cid" ]] && continue
      log_path=$(docker inspect --format='{{.LogPath}}' "$cid" 2>/dev/null || echo "")
      [[ -z "$log_path" ]] && continue
      sudo truncate -s 0 "$log_path" && echo "  cleared: $svc"
    done
    ;;

  *)
    echo "未知命令: $cmd"
    sed -n '3,20p' "$0"
    exit 1
    ;;
esac
