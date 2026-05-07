#!/usr/bin/env bash
#
# 第一次上线：构建镜像 → 启动数据库 → 跑迁移 → 启动全部服务
#
# 用法：
#   cd release
#   bash scripts/bootstrap.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$RELEASE_DIR/compose/docker-compose.prod.yml"
ENV_FILE="$RELEASE_DIR/.env"

cd "$RELEASE_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[bootstrap] 缺少 .env，请先："
  echo "  cp .env.example .env && vi .env"
  exit 1
fi

# 校验关键变量
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
: "${DOMAIN:?DOMAIN 必填}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD 必填}"
: "${AUTH_JWT_SECRET:?AUTH_JWT_SECRET 必填，server 在 production 下硬要求；用 openssl rand -hex 32 生成}"
: "${CORS_ORIGINS:?CORS_ORIGINS 必填}"

if [[ "$POSTGRES_PASSWORD" == "CHANGE_ME_TO_A_STRONG_PASSWORD" ]]; then
  echo "[bootstrap] POSTGRES_PASSWORD 还是默认值，请改成强密码后再跑。"
  echo "  生成命令：openssl rand -hex 24"
  exit 1
fi

# DB_URL 用密码拼接，必须是 URL-safe（不含 / + = @ ? # 等）
if [[ "$POSTGRES_PASSWORD" =~ [\/\+\=\@\?\#\&] ]]; then
  echo "[bootstrap] POSTGRES_PASSWORD 含 URL 特殊字符（/ + = @ ? # &），会破坏 DB_URL 解析。"
  echo "  请重新生成：openssl rand -hex 24"
  exit 1
fi

if [[ "$AUTH_JWT_SECRET" == "CHANGE_ME_TO_A_STRONG_64HEX_SECRET" ]]; then
  echo "[bootstrap] AUTH_JWT_SECRET 还是默认值，请改成强随机串。"
  echo "  生成命令：openssl rand -hex 32"
  exit 1
fi

if [[ "${#AUTH_JWT_SECRET}" -lt 32 ]]; then
  echo "[bootstrap] AUTH_JWT_SECRET 长度 ${#AUTH_JWT_SECRET} < 32 字符，server 会拒绝启动。"
  echo "  生成命令：openssl rand -hex 32"
  exit 1
fi

mkdir -p data/storage backup

echo "[bootstrap] 构建镜像（首次较慢，~3-5 分钟）"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "[bootstrap] 启动 postgres / redis"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis

echo "[bootstrap] 等待数据库就绪..."
until docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        pg_isready -U "${POSTGRES_USER:-cms}" -d "${POSTGRES_DB:-cms}" >/dev/null 2>&1; do
  sleep 2
done

echo "[bootstrap] 执行数据库迁移"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate

echo "[bootstrap] 启动 api / worker / web"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api worker web

echo ""
echo "[bootstrap] 完成。"
echo ""
echo "  访问地址 : https://${DOMAIN}"
echo "  健康检查 : https://${DOMAIN}/health/deps"
echo ""
echo "[bootstrap] 下一步：创建初始管理员账号。"
echo ""
echo "  在 .env 中设置以下环境变量后运行 initLocalAdmin.ts："
echo ""
echo "    ADMIN_INIT_EMAIL=you@example.com"
echo "    ADMIN_INIT_PASSWORD=<强密码>"
echo ""
echo "  然后执行："
echo "    docker compose -f compose/docker-compose.prod.yml --env-file .env exec api \\"
echo "      node --import tsx src/scripts/initLocalAdmin.ts"
echo ""
echo "  更多选项（org、角色等）及应急 SQL 路径请参阅 release/ADMIN-USERS.md。"
echo ""
echo "[bootstrap] 强烈建议立刻：bash scripts/backup.sh 跑一次备份并验证可恢复。"
