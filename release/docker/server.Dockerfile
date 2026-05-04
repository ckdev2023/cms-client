# syntax=docker/dockerfile:1.7
#
# CMS Server 镜像（NestJS API + Worker + 迁移脚本，三合一）
#
# 同一镜像通过不同 CMD 复用：
#   - api      : node --import tsx src/main.ts
#   - worker   : node --import tsx src/worker.ts
#   - migrate  : node --import tsx src/infra/db/runMigrations.ts migrate
#
# 为什么不跑 dist：
#   仓库内 src 的相对 import 未带 `.js` 后缀，tsc 编译后的
#   dist 在 native Node ESM 下会 ERR_MODULE_NOT_FOUND（实测）。
#   测试期用 tsx 直跑 ts 与 dev 行为一致，等 src 修好再切回 node dist。
#
# Build context: 仓库根（compose 已配置）。

ARG NODE_VERSION=20-alpine

# ---------- Stage 1: 安装依赖（含 devDependencies，因为需要 tsx） ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# 复制 lock 与所有 workspace 的 package.json
# npm workspaces 在 install 阶段需要看到全部 workspace manifest
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/package.json
COPY packages/admin/package.json ./packages/admin/package.json
COPY packages/mobile/package.json ./packages/mobile/package.json
COPY packages/prototype/package.json ./packages/prototype/package.json

# 仅安装 server workspace 需要的依赖（包含 dev，因为 tsx 在 devDependencies）
RUN npm ci --workspace=server --include-workspace-root --ignore-scripts \
 && npm cache clean --force

# ---------- Stage 2: 运行时 ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

RUN apk add --no-cache tini wget \
 && addgroup -S app && adduser -S app -G app \
 && mkdir -p /data/storage \
 && chown -R app:app /app /data

ENV NODE_ENV=production \
    PORT=3300 \
    STORAGE_LOCAL_DIR=/data/storage

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/packages/server/package.json ./packages/server/package.json

# 业务源码（仅 server，不带 admin/mobile/prototype）
COPY --chown=app:app packages/server/src ./packages/server/src
COPY --chown=app:app packages/server/tsconfig.json ./packages/server/tsconfig.json

USER app
WORKDIR /app/packages/server

EXPOSE 3300

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--import", "tsx", "src/main.ts"]
