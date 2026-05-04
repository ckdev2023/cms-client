# syntax=docker/dockerfile:1.7
#
# CMS Admin Web 镜像（Vue 3 静态资源 + Caddy 反代）
#
# 构成：
#   1) builder 阶段：vite build 出 packages/admin/dist
#   2) runtime  阶段：caddy:2-alpine 托管 dist + 反代 /api → api:3300
#                     + 自动 HTTPS（Let's Encrypt）
#
# Build context: 仓库根。

ARG NODE_VERSION=20-alpine
ARG CADDY_VERSION=2-alpine

# ---------- Stage 1: 构建 admin 静态资源 ----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/package.json
COPY packages/admin/package.json ./packages/admin/package.json
COPY packages/mobile/package.json ./packages/mobile/package.json
COPY packages/prototype/package.json ./packages/prototype/package.json

RUN npm ci --workspace=@cms/admin --include-workspace-root --ignore-scripts

COPY packages/admin ./packages/admin

RUN npm --workspace @cms/admin run build

# ---------- Stage 2: Caddy 托管 + 反代 ----------
FROM caddy:${CADDY_VERSION} AS runtime

COPY --from=builder /app/packages/admin/dist /srv
COPY release/caddy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

# Caddy 默认 ENTRYPOINT/CMD 已经合适，无需覆盖
