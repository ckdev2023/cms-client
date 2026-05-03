# 00 — Repo Survey (v1, incremental)

> 目标：第一版渐进式仓库画像。仅观察事实，不下实施结论。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。
> 凡 **[L]** 必须在 `06-open-questions.md` 或 `backlog.md` 中跟进。

## 1. 顶层结构

- 仓库根：`/Users/ck/workplace/cms-client` **[H]**
- npm workspaces：`packages/*` **[H]**（`package.json` workspaces）
- 顶层目录：
  - `packages/`：`admin/`、`mobile/`、`server/`、`prototype/` **[H]**
  - `docs/`：业务规范、流程文档（`gyoseishoshi_saas_md/`、`事务所流程/`） **[H]**
  - `design/`：原型/视觉资产（`airbnb`、`apple`、`gyosei-os-admin`） **[M]**
  - `roles/`：角色/职责文档（5 个一级目录） **[M]**
  - `scripts/`：本地启动、batch exit matrix、AI preflight **[M]**
  - 根级 `docker-compose.yml`、`commitlint.config.cjs`、`AGENTS.md`、`skills-lock.json` **[H]**

## 2. 工作区（packages）

| Package         | 名字            | 类型              | 主要技术栈                                       | 备注 |
|-----------------|-----------------|-------------------|--------------------------------------------------|------|
| `packages/admin`    | `@cms/admin` | Web 前台（事务所后台） | Vue 3 + Vite + Pinia + vue-router + vue-i18n + Arco Design | **[H]** |
| `packages/mobile`   | `mobile`     | 移动端（客户/申请人侧） | React Native + Expo + Tamagui + zustand + React Navigation | **[H]** |
| `packages/server`   | `server`     | 后端 API + Worker     | NestJS 11 + Drizzle ORM + Postgres + Redis + tsx | **[H]** |
| `packages/prototype`| n/a          | 静态高保真原型        | HTML/CSS/JS（仅原型，非生产代码）                | **[M]** 仅扫描目录得出 |

### 2.1 admin（Vue Web）

- 入口 `src/main.ts`：挂载 Pinia / router / i18n / ArcoVue **[H]**
- 关键目录：`auth/`、`router/`、`store/`、`shell/`、`shared/`、`views/`、`i18n/`、`styles/` **[H]**
- `views/` 按业务域分子目录：`auth`、`billing`、`cases`、`conversations`、`customers`、`dashboard`、`documents`、`leads`、`settings`、`tasks` **[H]**
- `shared/` 分 `api/` `model/` `ui/`；`shell/` 提供 `AppShell/SideNav/TopBar/GlobalSearchPalette/nav-config` **[H]**
- 测试：vitest + jsdom + @vue/test-utils；测试文件 359 个 **[H]**
- 门禁：`check:deps`（dependency-cruiser）、`typecheck`（vue-tsc）、`lint`、`test --coverage`、`build`、`jsdoc:lang:check` **[H]**

### 2.2 mobile（Expo + RN）

- 入口 `App.tsx` → `src/app/App.tsx` **[H]**
- 严格分层目录：`app/`、`features/`、`domain/`、`data/`、`infra/`、`shared/` **[H]**
- `features/`：`auth`、`case`、`documents`、`home`、`inbox`、`profile`，每个含 `model/` + `ui/` **[H]**
- `domain/`：纯 TS 实体与 Repository 接口（`auth/billing/case/documents/home/inbox/profile/reminder`） **[H]**
- `data/`：Repository 实现 + Api（HTTP）；`infra/`：`http/log/storage` **[H]**
- 应用容器：`app/container/AppContainer.ts` + `createAppContainer.ts` + `AppContainerContext.tsx` **[H]**
- 测试：jest + jest-expo + @testing-library/react-native；测试文件 5 个 **[H]**（量级远小于 admin/server）
- 门禁：`lint`、`typecheck`、`arch:check`（depcruise）、`feature:check`（自定义脚本）、`lock:check`、`secrets:check`、`test` **[H]**

### 2.3 server（NestJS）

- 入口 `src/main.ts`、worker `src/worker.ts`，根模块 `src/app.module.ts` **[H]**
- `modules/` 三大类：
  - `core/`（管理后台域）：29 个一级子目录，含 `auth`、`cases`、`customers`、`billing`、`documents-*`、`tasks`、`reminders`、`tenancy`、`search`、`timeline` 等 **[H]**
  - `portal/`（C 端 / 申请人侧）：`app-users`、`auth`、`conversations`、`intake`、`leads`、`messages`、`user-documents`、`model/` **[H]**
  - `feature-flags/`、`templates/`、`custom/tenant-a/` **[H]**
- 基础设施 `src/infra/`：`db`（drizzle + 79 个 SQL migration）、`redis`、`storage`、`queue`、`notification`、`translation`、`utils` **[H]**
- 数据库：单 schema 入口 `src/infra/db/drizzle/schema.ts`（1244 行） **[H]**
- 配置：`src/config/env.ts`（loadEnv） **[H]**
- 测试：node `--test` runner（不是 jest/vitest）+ tsx；测试文件 216 个；集成测试在 `tests/integration-pg/` 下用真实 PG（compose） **[H]**
- 门禁：lint / typecheck / `arch:check` / `db:migrations:check` / `db:drizzle:check` / `lock:check` / `secrets:check` / `test` / `test:integration-pg:ci` **[H]**

### 2.4 prototype

- `packages/prototype/admin/` 下按业务域分目录：`billing/case/customers/dashboard/documents/leads-message/settings/tasks/shared` **[H]**
- 仅是静态原型，与生产代码不直接耦合 **[M]**（未确认实际 import 关系）

## 3. 共享基础设施

- 根级脚本：
  - `npm run guard` = `mobile:guard && admin:guard && server:guard` **[H]**
  - `npm run fix` = `mobile:fix && admin:fix && server:fix` **[H]**
  - `local:dev/up/down`、`local:init-admin`、`server:db:*` **[H]**
- 三个 workspace 各自有独立 `.dependency-cruiser.{js,cjs}` 架构守门 **[H]**
- 根级 husky + lint-staged + commitlint **[H]**
- 单一锁文件：仓库根 `package-lock.json`；mobile 还存在自身 `package-lock.json`（潜在冲突，见 risk hotspots） **[M]**
- TypeScript 版本不一致：admin 使用 `~6.0.2`，mobile/server 使用 `~5.9.2` **[H]**

## 4. 文档与知识库

- 业务规范入口：`docs/gyoseishoshi_saas_md/` 含 `P0/`、`P1/`、`_raw/`、`_output/` **[H]**
- 流程权威文档：`docs/事务所流程/`（在留资格、经营管理签流程） **[H]**
- 设计资产：`design/airbnb/`、`design/apple/`、`design/gyosei-os-admin/` **[M]**

## 5. 量级速览（用于风险评估）

- 源文件计数（非 node_modules / dist / coverage）：
  - server：423 个 ts 文件（含 216 测试） **[H]**
  - admin：744 个 ts/vue 文件（含 359 测试） **[H]**
  - mobile：85 个 ts/tsx 文件（含 5 测试） **[H]**
- 三端比例显示 admin 与 server 已在 P1 阶段大量产出，mobile 仍处早期 **[M]**

## 6. 还未确认 / 后续展开（→ open-questions / backlog）

- prototype 与 admin 之间是否有 import 引用关系 **[L]**
- `roles/` 目录是否参与构建/工具链或仅是文档 **[L]**
- mobile 是否存在多个锁文件冲突的实际影响 **[L]**
- admin TS 版本（~6.0.2）是否为有意选择 **[L]**
- `custom/tenant-a` 的多租户定制策略与边界 **[L]**
