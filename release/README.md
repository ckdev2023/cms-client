# CMS 部署包（单客户测试期）

> 适用场景：**1 个客户、测试 / 试点阶段**，单台日本节点云主机上跑全套服务。
> 不适合：多租户上规模、要求多活高可用、合规要求 PITR 的场景——见末尾「升级路径」。

## 架构

```
┌──────────────────────────────────────────┐
│  云主机（Linux + Docker + docker compose）   │
│                                          │
│  ┌──────────┐    ┌─────┐    ┌─────────┐  │
│  │  caddy   │───▶│ api │───▶│postgres │  │
│  │ (web)    │    │     │    │         │  │
│  │ + admin  │    │     │ ┌─▶│ redis   │  │
│  │ static   │    └─────┘ │  └─────────┘  │
│  │ + HTTPS  │            │                │
│  └────┬─────┘    ┌────────┘                │
│       │          │                         │
│  443/80          │                         │
│       │     ┌────▼─────┐                   │
│  互联网│     │ worker   │                   │
│       ▼     │ (异步任务) │                   │
│  https://demo.x  └──────────┘             │
└──────────────────────────────────────────┘
```

- **5 个容器**：postgres / redis / api / worker / web(caddy+admin)
- **持久化**：postgres、redis、Caddy 证书用 docker named volume；上传文件用 host bind mount（`release/data/storage`，方便备份）
- **HTTPS**：Caddy 自动申请并续期 Let's Encrypt 证书，**前提是域名能解析到本机 + 80/443 端口对外开放**

## 前置条件

| 项 | 要求 |
|---|---|
| OS | Ubuntu 22.04 / Debian 12 / 其他能跑 Docker 的 Linux |
| CPU/内存 | 至少 2C4G（建议 2C8G，留余量给 PG） |
| 磁盘 | 至少 20G（含镜像、PG 数据、备份） |
| 网络 | 公网 IP，80/443 入站开放 |
| 域名 | 二级域名解析到本机 IP，例如 `demo.example.com` |
| 软件 | Docker Engine ≥ 24，docker compose plugin ≥ 2.20 |

如果客户走**内网/VPN/Tailscale**，可以不用域名，把 Caddyfile 改成 `:80` 监听 + 关掉 HTTPS。详见底部「无公网域名场景」。

## 第一次上线（5 步）

```bash
# 1. 把仓库 clone 到服务器
git clone <your-repo-url> /opt/cms
cd /opt/cms

# 2. 准备配置
cd release
cp .env.example .env

# 3. 用强随机值替换两个密码（务必用 hex，不能用 base64——会含 / + = 破坏 DB_URL）
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
sed -i "s|^AUTH_JWT_SECRET=.*|AUTH_JWT_SECRET=$(openssl rand -hex 32)|" .env

# 4. 编辑 .env，填剩余必填项
vi .env       # 至少填 DOMAIN / ACME_EMAIL / CORS_ORIGINS

# 5. 一键 bootstrap（会校验所有必填项，不齐会拒绝跑）
bash scripts/bootstrap.sh

# 6. 创建初始管理员（见下节）

# 7. 验证
curl https://demo.example.com/health/deps
# {"ok":true}
```

> **必填变量速查**：`DOMAIN`、`ACME_EMAIL`、`POSTGRES_PASSWORD`（hex）、`AUTH_JWT_SECRET`（hex，≥32 字符）、`CORS_ORIGINS`。
> `bootstrap.sh` 会逐项校验，缺/弱/含特殊字符都会立刻报错退出，不会留下半残状态。

### 创建初始管理员（重要）

仓库里 `packages/server/src/scripts/initLocalAdmin.ts` 是为 **本地开发** 用的，里面用的是固定弱密码，**生产/测试环境绝对不能直接跑**。

测试期推荐做法二选一：

**方法 A：跑脚本后立刻改密码**

```bash
cd release
docker compose -f compose/docker-compose.prod.yml --env-file .env exec api \
  node --import tsx src/scripts/initLocalAdmin.ts

# 然后立刻登录、进设置页改密码（强制）
```

**方法 B：直连 PG 手动 INSERT 强密码账户**

```bash
docker compose -f compose/docker-compose.prod.yml --env-file .env exec postgres \
  psql -U cms -d cms

# 在 psql 里参考 src/scripts/initLocalAdmin.ts 的 SQL 模式手动 INSERT
# 密码用强 bcrypt hash（在另一台机器上 node -e 'console.log(require("bcrypt").hashSync("xxx",10))'）
```

> 长期看应该补一个 `src/scripts/initProdAdmin.ts`，从环境变量读密码。这是 src 改动，不在本部署包范围内。

## 日常运维

### 升级（拉新代码 → 重建 → 滚动重启）

```bash
cd /opt/cms/release
bash scripts/deploy.sh
```

`deploy.sh` 会：

1. 自动跑一次 `backup.sh`（保险）
2. `git pull --ff-only`
3. 重新 build `api` 和 `web` 镜像
4. 跑 `migrate`（迁移失败会中断，不会拉坏现有服务）
5. `--force-recreate` 重启 `api / worker / web`（短暂不可用 ~5s）

### 备份（每天）

```bash
bash scripts/backup.sh
```

加 cron（强烈建议）：

```cron
0 3 * * * cd /opt/cms/release && bash scripts/backup.sh >> backup/cron.log 2>&1
```

`backup.sh` 默认保留 7 天，旧的自动删除。

**测试期最重要的一步**：把 `release/backup/` 同步到**另一台机器**或对象存储。最便宜的方案：

```bash
# 装 rclone，配 R2/OSS/S3 一次
rclone copy release/backup remote:cms-backup \
  --include 'db-*.sql.gz' --include 'storage-*.tar.gz'
```

加到同一个 cron 后面。

### 恢复（演练一次！）

```bash
# 1. 找到要恢复的备份
ls release/backup/

# 2. 停服务
cd release
docker compose -f compose/docker-compose.prod.yml --env-file .env stop api worker

# 3. 数据库恢复（会清掉现有数据）
docker compose -f compose/docker-compose.prod.yml --env-file .env exec -T postgres \
  sh -c 'dropdb -U cms cms && createdb -U cms cms'

gunzip -c backup/db-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose -f compose/docker-compose.prod.yml --env-file .env exec -T postgres \
  psql -U cms -d cms

# 4. 存储恢复（如果备份了）
rm -rf data/storage
tar -C data -xzf backup/storage-YYYYMMDD-HHMMSS.tar.gz

# 5. 重启
docker compose -f compose/docker-compose.prod.yml --env-file .env start api worker
```

> **测试期至少做一次恢复演练**，确认备份是好的、流程跑通。

### 看队列堆积（worker 是否跟得上）

```bash
docker compose -f compose/docker-compose.prod.yml --env-file .env exec redis \
  redis-cli LLEN reminder_jobs
docker compose -f compose/docker-compose.prod.yml --env-file .env exec redis \
  redis-cli LLEN notification_jobs
```

## 日志

### 默认采集

所有 6 个容器（postgres / redis / api / worker / web / migrate）的 stdout/stderr 由 docker `json-file` driver 落盘，**单容器最多保留 5 个 100MB 文件 = 500MB**，超过自动滚动。日志路径在宿主机 `/var/lib/docker/containers/<container-id>/<container-id>-json.log`。

应用日志特点：

| 服务 | 内容 | 格式 |
|---|---|---|
| `api` | NestJS 路由注册、HTTP 请求异常、模块 boot | 文本（含 ANSI 颜色） |
| `worker` | 队列 claim/run/retry/fail、handler stderr | 文本 |
| `web` | Caddy access log（**JSON**） + Caddy 自身日志 | JSON |
| `postgres` / `redis` | 数据库 server log | 文本 |

> Caddy access log 已自动跳过 `/health`、`/health/*` 路径（外部探活每 15s 一条会刷屏，过滤后只剩真实业务请求）。

### 日常查询：`scripts/logs.sh`

```bash
cd release
bash scripts/logs.sh                  # 实时跟所有服务（最近 100 行起跑）
bash scripts/logs.sh api              # 只跟 api
bash scripts/logs.sh worker           # 只跟 worker
bash scripts/logs.sh tail api 500     # api 最近 500 行
bash scripts/logs.sh since api 30m    # api 最近 30 分钟（支持 m/h/d）
bash scripts/logs.sh errors           # 全部服务最近 1 小时的 error/warn/exception
bash scripts/logs.sh access           # caddy access log（JSON，可接 jq）
bash scripts/logs.sh size             # 各 service 当前日志占用磁盘
bash scripts/logs.sh truncate         # 紧急：清空 api/worker/web 日志（慎用）
```

常用 jq 配方：

```bash
# 4xx / 5xx 请求
bash scripts/logs.sh access | jq 'select(.status >= 400) | {ts, status, uri, ip: .request.remote_ip}'

# 慢请求（>500ms）
bash scripts/logs.sh access | jq 'select(.duration > 0.5) | {uri, duration, status}'

# 看某个 IP 的所有请求
bash scripts/logs.sh access | jq 'select(.request.remote_ip == "1.2.3.4")'
```

### 按天归档：`scripts/log-export.sh`

docker 的 `max-size` 只是**滚动**，不是归档；老的日志被覆盖前，建议每天导出一份压缩备份。

```bash
bash scripts/log-export.sh            # 默认导出过去 24h 的所有服务日志
bash scripts/log-export.sh 7d         # 一次性补抓过去 7 天
```

输出：`release/backup/logs/<service>-<timestamp>.log.gz`，默认保留 30 天，超过自动清理（可改 `LOG_RETENTION_DAYS`）。

加 cron（强烈建议）：

```cron
0 4 * * * cd /opt/cms/release && bash scripts/log-export.sh >> backup/logs/cron.log 2>&1
```

### 进阶：Loki + Grafana（可选 overlay）

如果 `docker compose logs + grep` 已经不够用——比如想要 Web UI 搜索、跨服务关联、按标签过滤、画请求量曲线——启用 logs overlay：

```bash
cd release

# 1. 在 .env 里设强密码
echo 'GRAFANA_ADMIN_PASSWORD=<24+位随机强密码>' >> .env

# 2. 用两个 compose 文件叠加启动
docker compose \
  -f compose/docker-compose.prod.yml \
  -f compose/docker-compose.logs.yml \
  --env-file .env up -d

# 3. 访问 Grafana（默认只监听 127.0.0.1，需 SSH tunnel）
ssh -L 3000:127.0.0.1:3000 user@your-server
# 浏览器开 http://localhost:3000，admin / 你刚才设的密码
```

启用后会多 3 个容器：

- **Loki** — 日志存储后端，本地 filesystem，保留 30 天
- **Promtail** — 通过 docker socket 自动发现并采集所有容器日志，转换 `cms.role` label 为 Loki 标签
- **Grafana** — Web UI，已自动配好 Loki datasource

资源开销 ~300-500MB 内存。Grafana 默认**只监听 `127.0.0.1:3000`**，不暴露公网。要远程访问推荐 SSH tunnel 或 Tailscale，**不要**直接把 ports 改成 `0.0.0.0:3000`。

Grafana 里查询示例（Explore → Loki）：

```logql
# 看 api 最近的所有日志
{role="api"}

# 看 worker 中所有 ERROR
{role="worker"} |= "ERROR"

# 看 caddy 4xx/5xx 访问
{role="web"} | json | status >= 400

# 看任何服务里包含某个 case ID 的日志
{project="release"} |= "case-uuid-xxxxx"
```

关闭 overlay：

```bash
docker compose -f compose/docker-compose.prod.yml -f compose/docker-compose.logs.yml \
  --env-file .env down loki promtail grafana
# 主服务（postgres/redis/api/worker/web）不受影响
```

### 日志中可能含 PII —— 注意事项

- 测试期客户的真实数据可能出现在日志里（请求 body、错误 stack、SQL 参数）
- `release/backup/logs/` 目录 `chmod 700`，只允许部署用户读
- 如果归档同步到对象存储，**必须开服务端加密**
- 客户提出"删除我的数据"时，**不要忘记**清掉日志归档里的相关条目（grep 出来的行）
- 日本个保法层面：日志保留时长写到《利用规约》里，超过期限要可证明已删除

## 安全与合规（测试期最低门槛）

- [ ] **HTTPS** 走 Caddy 自动签，不要回退 HTTP
- [ ] `.env` 文件 `chmod 600`，**绝对不提交 git**（已在 `.gitignore`）
- [ ] `POSTGRES_PASSWORD` 至少 24 位强密码
- [ ] 服务器 SSH **禁用密码登录**，只允许 key
- [ ] 80/443 之外的端口（5432/6379）**不要**对外暴露——本 compose 已经只用 `expose:` 不用 `ports:`
- [ ] `NODE_ENV=production` 已固定；**不要**设 `AUTH_ALLOW_INSECURE_HEADERS`，否则 server 拒绝启动（`packages/server/src/main.ts:35`）
- [ ] 客户测试数据若涉及个人情报，节点必须放**日本境内**（合规 + 体感延迟）
- [ ] 备份**异地**保存
- [ ] 配一个**外部探活**（UptimeRobot / Better Stack 免费版），监控 `https://你的域名/health/deps`，挂了 1 分钟内告警

## 无公网域名场景（客户内网/VPN/Tailscale）

如果客户只通过 VPN 或 Tailscale 访问：

1. `.env` 里 `DOMAIN` 留空，改 `HTTP_PORT=80`、不要映射 443
2. 改 `release/caddy/Caddyfile`，把 `{$DOMAIN} {` 换成 `:80 {`，并删掉 HSTS header
3. `CORS_ORIGINS` 写成 `http://内网IP` 或 Tailscale magic DNS
4. 其余流程不变

最干净的方案是装 Tailscale 在服务器上，让客户的电脑也加入 Tailnet，**完全不暴露公网**。

## 验证清单（上线后第一天）

- [ ] `curl https://你的域名/health` → `{"ok":true}`
- [ ] `curl https://你的域名/health/deps` → `{"ok":true}`（PG/Redis 都通）
- [ ] 浏览器打开域名能看到 admin 登录页
- [ ] 用初始管理员登录，能创建一条测试案件
- [ ] 在案件里挂一条提醒（reminder），15 分钟内 worker 会处理（看 `docker compose ... logs worker`）
- [ ] 跑 `bash scripts/backup.sh`，得到 db / storage 两个文件
- [ ] 演练一次恢复（在另一台机器或新建数据库上）
- [ ] 跑 `bash scripts/logs.sh access`，看到自己刚才的请求
- [ ] 跑 `bash scripts/log-export.sh`，得到 `backup/logs/<service>-<ts>.log.gz`
- [ ] cron 配好（备份 + 日志归档），外部探活配好

## 已知限制 / 待办

- **生产用 tsx 直跑 ts 而非 node 跑 dist**：因为 `src` 里相对 import 没带 `.js` 后缀，`npm run server:build` 出来的 dist 用 native node ESM 跑会 `ERR_MODULE_NOT_FOUND`（实测）。后续若 src 修复，把 `release/docker/server.Dockerfile` 末尾的 `CMD` 改回 `["node","dist/main.js"]` 即可。
- **没有 systemd unit**：用 `docker compose` 自带 `restart: unless-stopped`，宿主机重启后 docker daemon 会拉起容器。
- **没有蓝绿/灰度**：`deploy.sh` 用 `--force-recreate` 直接重启，会有 ~5s 不可用。测试期可接受。
- **没有 CI**：本地 `git push` + 服务器 `bash scripts/deploy.sh` 即可。如要 CI 化，加一个 GitHub Actions 调用 SSH 远程跑 `deploy.sh`。

## 升级路径（什么时候该改架构）

| 触发条件 | 升级动作 |
|---|---|
| 第 2~3 个客户 | PG 切到云托管（带 PITR），改 `.env` 的 `DB_URL` 即可 |
| 客户开始上传大量文件（>10G） | `STORAGE_PROVIDER=s3` + 配置 R2/OSS，把 `data/storage` 迁过去 |
| 出现"半夜挂了没人知道" | 加 UptimeRobot + 告警机器人 |
| 升级想要零停机 | Caddy 上配双 upstream + `lb_policy round_robin` 蓝绿 |
| 5+ 客户、性能开始紧 | worker 拆出单独机器，API 加副本（compose `deploy.replicas` 或换 swarm/k8s） |
| 监管要求审计/PITR | PG 切托管，开启 wal_level=logical + 审计扩展 |

## 文件结构

```
release/
├── README.md                       # 本文档
├── .env.example                    # 环境变量模板
├── .gitignore                      # 排除 .env / data / backup
├── docker/
│   ├── server.Dockerfile           # api/worker/migrate 共用镜像
│   └── admin.Dockerfile            # admin 静态资源 + caddy
├── compose/
│   ├── docker-compose.prod.yml     # 主部署
│   └── docker-compose.logs.yml     # 可选 overlay：Loki + Promtail + Grafana
├── caddy/
│   └── Caddyfile                   # 自动 HTTPS + /api 反代 + SPA fallback + access log
├── observability/                  # 可选 overlay 的配置
│   ├── loki/loki-config.yaml
│   ├── promtail/promtail-config.yaml
│   └── grafana/datasources.yaml
└── scripts/
    ├── bootstrap.sh                # 第一次上线
    ├── deploy.sh                   # 后续升级
    ├── backup.sh                   # pg_dump + storage tar
    ├── logs.sh                     # 日常日志查询
    └── log-export.sh               # 按天归档日志到 backup/logs/
```
