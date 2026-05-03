# 15. 集成测试稳定性现状（B-016）

> 生成阶段：B-016。来源：直读 `packages/server/tests/integration-pg/`、`docker-compose.integration.yml`、`packages/server/package.json` scripts。仅 server 工作空间存在集成测试。

## 1. 拓扑（High）

```
packages/server/
  docker-compose.integration.yml   (postgres:16-alpine, tmpfs, port 5499)
  tests/integration-pg/
    setup.ts                       (82 lines；getTestPool / migrateAndSeed / truncateAllBusinessTables)
    dtoSmoke.test.ts               (100 lines；对真 PG EXPLAIN 所有 DTO SELECT)
    dtoSmokeRegistry.ts            (DTO 入口 → 引用生产 SQL 常量)
    caseParties.bug177.pg.test.ts  (160 lines；migration 039 backfill 验证)
```

→ **仅 2 个集成测试文件**（dtoSmoke + bug177）。与 src 内 216 个 unit/spec test 比例为 **2 : 216 ≈ 0.9 %**。

## 2. PG 容器（High）

`docker-compose.integration.yml`（16 行）：
- `image: postgres:16-alpine`
- 用户：`cms_test` / `cms_test` / `cms_test`（用户名 / 密码 / db 同名）
- 端口映射：`5499:5432`（避开本地 5432 / 5432-默认 PG 冲突）
- **`tmpfs: /var/lib/postgresql/data`** → 数据放内存，每次容器销毁全清；no persistence by design
- healthcheck：`pg_isready` 每 2s × 15 次 retry（30s 容忍）

**评估**：tmpfs + 短 healthcheck + `--wait` 启动是**典型 ephemeral CI 风格**，不依赖外部 stateful 存储。

## 3. setup.ts 设施（High）

| export | 用途 |
|--------|------|
| `getTestPool()` | 单例 pg.Pool，max=3，idle=5s，statement_timeout=30s；连接串可被 `INTEGRATION_PG_URL` env 覆盖（默认 `postgres://cms_test:cms_test@localhost:5499/cms_test`）|
| `closeTestPool()` | 关池（`after` hook 用）|
| `migrateAndSeed()` | 复用生产 `runMigrationsLib`：ensureMigrationsTable + 跳过已应用 → applyMigration 循环；**无单独 seed 步骤**（"Seed" 仅是函数名，实际只跑 migration）|
| `truncateAllBusinessTables()` | `pg_tables where schemaname='public' and tablename<>'schema_migrations'` 全量 TRUNCATE CASCADE → 测试间隔离 |

→ **无 mock**，全跑生产 SQL；migration 链复用 `src/infra/db/runMigrationsLib`（保证集成测和生产路径一致）。

## 4. 两个测试文件的角色（High）

### 4.1 `dtoSmoke.test.ts`（100 行）
- **目的**：对真 PG 执行 `EXPLAIN (costs off) <生产 SELECT>`，验证所有 JOIN-style DTO SELECT 在当前 schema 下不漂移。
- **数据来源**：`dtoSmokeRegistry.ts` **import** 而非拷贝生产 SQL 常量（`CASE_COLS_PREFIXED` / `SUMMARY_JOINS` / `BILLING_PLAN_LIST_*` / `PAYMENT_RECORD_LIST_*` / `GD_DTO_*`）→ **改 service 即必须改测试**的同源约束。
- **dummy data**：`DUMMY_ORG = '00000000-...'`；`limit 1` → 不需要真数据，仅校验语法。
- **第二组**：`assertCriticalSchemaColumns` 在真 PG 验证关键列存在（防 drizzle 漂移）。
- **覆盖收录原则**（自身注释）：只放「含 JOIN 或跨表别名的 SELECT」；纯单表由 `assertCriticalSchemaColumns` 覆盖。

### 4.2 `caseParties.bug177.pg.test.ts`（160 行）
- **目的**：验证 migration 039 backfill 后，所有有 customer_id 的 case 都拥有至少一条 primary applicant case_parties 行。
- **结构**：`before(migrateAndSeed)` + `beforeEach(truncate)` + `after(closeTestPool)` + 业务 INSERT 模拟。
- **形态**：单次 backfill 验证用例（与 §B-004 §C "backfill 系列 034..042" 中 039 对应），属于一次性证明 migration 正确性的"锚定测试"。

## 5. 与 guard 链的关系（High）

`packages/server/package.json` `guard` 顺序：
```
lint → typecheck → arch:check → db:migrations:check → db:drizzle:check
→ lock:check → secrets:check → test → test:integration-pg:ci
```
- 集成测在 guard **最末**位置，跑 unit 后再跑。
- `test:integration-pg:ci` = `up && test; EXIT=$?; down; exit $EXIT` → 容器**每次起停**；guard 全过执行一次完整 docker 生命周期。
- 启动成本：`docker compose up -d --wait` + 30s healthcheck 容忍 → 实际首跑 5–15s（取决于本地镜像缓存）。

## 6. 稳定性评估（Medium-High）

**优势**：
- ① 同源约束（生产 SQL 常量直 import）防止 schema 漂移悄无声息。
- ② tmpfs 容器全 ephemeral，无磁盘脏数据残留。
- ③ `truncateAllBusinessTables` `beforeEach` 提供完整隔离。
- ④ migration 链与生产同源（runMigrationsLib），不会遗漏新 migration。
- ⑤ 端口 5499 避免常见冲突。
- ⑥ healthcheck + `--wait` 防止竞态启动失败。

**风险 / 缺口**：
- ① **覆盖面窄**：仅 2 文件；relative to 216 unit + 22 业务表，**集成测/单元测比 < 1 %**；schema 触发器 / RLS / soft-delete / billing 共表（OQ-30）等业务集成路径无对应集成测。 → OQ-68
- ② **无 RLS 集成测**：`tenantDb` 的 GUC 设值与 RLS 政策从未在真 PG 端到端验证；§B-004 §B 中 RLS 6 波演进**只在 unit 层 mock**。 → OQ-69
- ③ **无并发 / 隔离级别测试**：单租户 max=3 池子串行测；多 org race-condition / serializable 失败重试无覆盖。
- ④ **bug177 是迄今唯一 backfill 验证**：§B-004 §C backfill 系列 034..042（9 个）中**仅 039 有集成测**；其它 8 个 backfill 无独立集成证明。 → OQ-70
- ⑤ **端口硬编码 5499**：CI 多并发可能冲突（无 dynamic port allocation）。
- ⑥ **`integration-pg:ci` 失败不会 dump logs**：仅 `exit $EXIT`；调试需手动 `up` + 单跑测试。

## 7. 与既有 OQ 交叉

- **OQ-26（Drizzle 缺 13 表）**：dtoSmoke 用 `assertCriticalSchemaColumns` 防漂移，但仅覆盖 schema.ts 中 22 张表；缺声明的 13 张业务表（feature_flags / timeline_logs / reminders 等）漂移可能不被该断言捕获 → 验证手段未确认。
- **OQ-46（cases.service complexity）**：cases 的核心 SQL（`CASE_COLS_PREFIXED + SUMMARY_JOINS`）已纳入 dtoSmoke，是当前最佳防护点。

## 8. 关键缺口（新 OQ）

- **OQ-68** 集成测覆盖面是否计划扩展？当前 2 文件 / 22 表，存在大量未覆盖业务集成路径（billing 共表 OQ-30、portal 双 guard OQ-25 等）。
- **OQ-69** RLS 集成测缺位：`tenantDb` GUC 设值 ↔ pg policy 的端到端测试在哪一层？（guard 链中无看到）。
- **OQ-70** 9 个 backfill migration 中仅 039 有集成测；其余 8 个的正确性如何被验证？（init 一次性 / 手工 / 单测）。

## 9. 置信度

| 项 | 置信度 |
|----|--------|
| 拓扑 / 容器配置 / setup 设施 / 两文件作用 | High（直读全部相关文件）|
| guard 链位置 / 启动成本量级 | High（直读 scripts）|
| 覆盖面 < 1 % 评估 | High（计数 2/216）|
| RLS / backfill / 并发缺口 | Medium（基于"未发现相关集成测"反推）|
