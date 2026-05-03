# 04 — Risk Hotspots (v1, incremental)

> 仅基于第一轮粗扫的客观信号（行数、跨包共享性、扇入广度）标注潜在风险。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。
> 任何 **[L]** 项目都已对应进入 `06-open-questions.md` / `backlog.md`。

## A. 超大文件（按行数客观信号）

| 文件 | 行数 | 类型 | 风险点 | Confidence |
|------|------|------|--------|------------|
| `packages/server/src/modules/core/cases/cases.service.ts` | 3456 | 后端核心域服务 | 单一服务承担过多职责的可能性极高；任何修改都影响案件全生命周期 | **[H]** 行数客观；耦合度待 backlog 量化 **[M]** |
| `packages/server/src/modules/core/cases/cases.service.test.ts` | 3936 | 测试 | 测试文件超大，难以定位失败、维护成本高 | **[H]** |
| `packages/admin/src/views/cases/fixtures-detail.ts` | 2780 | 前端 fixtures | 测试夹具集中，破坏一个 fixture 可能引发大面积测试连锁失败 | **[H]** |
| `packages/server/src/modules/core/document-items/documentItems.service.test.ts` | 1616 | 测试 | 同上，集中度高 | **[H]** |
| `packages/admin/src/views/cases/types-detail.ts` | 1500 | 前端类型 | 类型集中文件，跨文件大量引用风险 | **[H]** |
| `packages/server/src/infra/db/drizzle/schema.ts` | 1244 | DB schema | 单文件承载所有表 schema；任何 migration 不一致都体现在这里 | **[H]** |
| `packages/server/src/modules/core/cases/cases.regression-p1-reminder-closeout.test.ts` | 1043 | 回归测试 | 大型回归测试，失败定位成本高 | **[H]** |
| `packages/server/src/modules/core/submission-packages/submissionPackages.service.ts` | 931 | 后端域服务 | 接近 1k 行的服务，需要审视是否需要拆分 | **[M]** |
| `packages/admin/src/i18n/messages/cases/{en-US,ja-JP,zh-CN}.ts` | 832–874 | i18n 文案 | cases 文案体量极大，跨语言一致性维护成本高 | **[H]** |

> 仓库 AGENTS.md / project-rules 明确写到「单文件不得超过 500 行」。
> 上表中标号 **[H]** 的均明显违反此约束 → backlog 拆分项。

## B. 共享 / 跨模块基础设施（高扇入候选）

> 「高扇入」尚未通过依赖图量化（待 backlog 用 dependency-cruiser 输出验证）。

- **server**
  - `packages/server/src/app.module.ts` —— 集中注册所有 Controller/Service/Provider，是依赖装配的"中央广播"。 **[H]**（角色明确）
  - `packages/server/src/infra/db/drizzle/schema.ts` —— 单一 schema 入口。 **[H]**
  - `packages/server/src/modules/core/auth/{auth.guard,auth.service,permissions.service,requestContext.interceptor}` —— 全局守卫与请求上下文，所有 controller 路径都过这里。 **[H]**
  - `packages/server/src/modules/core/tenancy/{tenantDb,requestContext}` —— 多租户数据访问的关键基础。 **[H]**
  - `packages/server/src/infra/db/migrations/`（79 个 SQL 文件） —— migration 演进密集，是高变更频率区。 **[H]**
- **admin**
  - `packages/admin/src/shell/{AppShell,SideNav,TopBar,nav-config}` —— 全应用导航壳，影响所有页面。 **[H]**
  - `packages/admin/src/router/{index,authGuard}` —— 路由与认证守门。 **[H]**
  - `packages/admin/src/shared/api/repositoryRuntime.ts` —— 仓储运行时，是所有 feature 接入数据层的桥。 **[H]**（已存在专门的 architecture-guard 测试）
  - `packages/admin/src/i18n/index.ts` + `messages/` —— 多语言聚合，跨页面共享。 **[H]**
- **mobile**
  - `packages/mobile/src/app/container/{AppContainer,createAppContainer,AppContainerContext}` —— 全应用 DI 容器。 **[H]**
  - `packages/mobile/src/infra/http/HttpClient.ts` —— 唯一 HTTP 客户端。 **[H]**
  - `packages/mobile/src/shared/ui/index.tsx` —— Tamagui 封装出口；按规则 feature 不能直接依赖 `@tamagui/*`，全部经此。 **[H]**

## C. 架构边界违规风险（结构性 hot zones）

- mobile 的强分层（feature → domain/shared，不允许触及 data/infra/tamagui）由 `scripts/checkFeatureBoundaries.cjs` + dependency-cruiser 双门把守。任何 features 内部新增依赖都要警惕。 **[H]**
- admin 没有 feature/data/domain 强分层（`views/*` 内部混合 model/component），架构约束的实际执行路径与 mobile 不同；这是潜在异质性风险。 **[M]**（来源：目录形态对比 + AGENTS.md 中以 mobile 描述为主）
- server `custom/tenant-a/` 表示存在租户级定制路径，需明确它能否反向依赖 core，否则会侵蚀基础。 **[L]** → open question

## D. 测试体系结构风险

- 三个 workspace 使用三种不同的测试 runner（vitest / jest / node:test），结果格式与 CI 聚合成本高。 **[H]**
- mobile 测试数量极少（5）相对源文件数（85），覆盖率信号弱。 **[H]**
- server 集成测试依赖真实 docker-compose Postgres，本地与 CI 上的稳定性风险存在；并且 `guard` 默认会跑 `test:integration-pg:ci`，使整体 guard 时间和外部依赖耦合度变高。 **[M]**
- 存在大量 `*.bug<NNN>.test.ts`、`*.focused.test.ts`、`*.regression-*.test.ts` 命名约定，但没有统一索引文档；新人/Agent 难以判断 test ownership。 **[M]**

## E. 工具链 / 锁文件风险

- 仓库根存在 `package-lock.json`，且 `packages/mobile/package-lock.json` 也存在 → 与 AGENTS.md 「`package-lock.json` 唯一锁文件」存在表面冲突。 **[M]**（事实存在；是否影响实际安装路径需验证）
- TS 版本不一致：admin `~6.0.2`，mobile/server `~5.9.2`。**[H]** 事实，**[L]** 风险量化。

## F. 文档/规范"权威源"分散风险

- 业务规范在 `docs/gyoseishoshi_saas_md/`；流程在 `docs/事务所流程/`；P0/P1 batch exit matrix 散布在 admin `scripts/` 和 `views/cases/*.md`。**[M]** 事实。代码改动究竟以哪份为权威——需在 backlog 中确认。 **[L]**

## 汇总（拆分优先级建议线索，非实施计划）

按"客观大小 + 共享性"两轴的高风险候选：
1. `cases.service.ts`（3.5k 行 + 中央域） **[H]**
2. `drizzle/schema.ts`（1.2k 行 + 全局 schema） **[H]**
3. `app.module.ts`（中央装配，但行数可控） **[H]**
4. admin `views/cases/{fixtures-detail,types-detail,constants}.ts`（fixtures/类型/常量过度集中） **[H]**
5. `i18n/messages/cases/*` 三语对齐（每个 800+ 行） **[H]**

> 上述仅作为后续分析对象，**不构成实施计划**。所有量化（扇入、循环依赖、闭包大小）将在 backlog 中通过工具产出。

---

## G. B-002 量化补充：dependency-cruiser 实测扇入

> 数据来源：`.agent/analysis/03-dependency-graph.md`（B-002）。原始 JSON 在 `/tmp` 中，未入仓。

| Workspace | 模块数 | 循环依赖边 | 规则违例 | Top fan-in |
|-----------|--------|-----------|----------|------------|
| server | 432 | 0 | 0 | cases.service(45) / auth.decorators(43) / tenantDb(43) / cases.types(27) / timeline.service(24) / cases.template-bmv(23) / permissions.service(19) **[H]** |
| admin | 752 | 0 | 0 | （详见 03 §2） |
| mobile | 86 | 0 | 0 | （详见 03 §3） |

**关键事实**：循环依赖与规则违例均为 0；高扇入即"碰一动百"中心节点。 **[H]**

新增高风险 hub（在 §B 之外补充）：
- `packages/server/src/modules/core/auth/auth.decorators.ts` —— 43 入度，几乎所有 controller 引入。 **[H]**
- `packages/server/src/modules/core/tenancy/tenantDb.ts` —— 43 入度，多租户数据基座。 **[H]**
- `packages/server/src/modules/core/timeline/timeline.service.ts` —— 24 入度，几乎所有写域调用。 **[H]**
- `packages/server/src/modules/core/cases/cases.types.ts` / `cases.template-bmv.ts` —— 27 / 23 入度，cases 域类型 + BMV 模板枢纽。 **[H]**

## H. B-004 量化补充：schema.ts vs migrations 缺口

> 数据来源：`.agent/analysis/07-schema-migration-matrix.md`（B-004）。

- **Drizzle schema.ts 仅声明 22 张表**；migrations 中存在 **~28 张业务表 + 1 系统表**。
- 至少 **13 张业务表** 通过 raw SQL via `tenantDb` 访问，未受 Drizzle 类型保护：
  - 横切：`timeline_logs` / `reminders` / `feature_flags` / `jobs`
  - 模板：`template_versions` / `template_releases`
  - portal：`app_users` / `leads` / `conversations` / `messages` / `user_documents` / `intake_forms`
  - 业务：`tasks` / `billing_records` / `payment_records` / `lead_followups` / `lead_logs`
- 风险：列变更检测、类型对齐、单测 mock 复杂度（cases.service.ts 3.5k 行的成因之一）。 **[H]**

## I. B-001 cases.service.ts 簇风险

> 数据来源：`.agent/analysis/02-cases-service-anatomy.md`（B-001）。

- 12 个功能簇集中在单文件：CRUD / Stage Transitions / BMV Logic / Billing Integration / Documents / Reminders / Templates / Read Models / RBAC / Validation / Submission / Misc。 **[H]**
- 任一簇被修改都会触发 `cases.regression-*.test.ts` 系列回归（最大 1043 行）连锁运行。 **[H]**
- 与 §A 的"3456 行"客观信号呼应：行数本身即是风险信号，B-001 已给出可拆分的语义边界候选。 **[M]**（拆分策略未做）

## J. B-003 装配集中度

> 数据来源：`.agent/analysis/05-server-module-grouping.md`（B-003）。

- 单 root `AppModule`，40 controller + ~37 service 全部平铺；`app.module.ts` fan-out=89（依赖图最大）。 **[H]**
- 双鉴权体系（`AuthGuard` 全局 + `AppUserAuthGuard` 局部）通过 `@Public()` + `@UseGuards()` 在每个 portal 端点逐方法配置 → 路由层重构需要双侧对账。 **[H]**
- core 与 portal 的路径名空间重叠（`auth` / `leads` / `conversations` / `messages`），portal 镜像由 `admin/...` 前缀的 admin controller 承担 → 命名约定脆弱。 **[M]**

## K. B-005 量化补充：admin 架构边界异质性

> 数据来源：`.agent/analysis/08-admin-architecture.md`（B-005）。

- **dep-cruiser 规则 7/11 处于休眠**：features/domain/data/infra 四个目录在 admin 不存在；强分层规则不发挥作用。 **[H]**
- **实活规则只有 3 条**：`no-circular` / `shared-no-local-outside-shared` / `billing-no-cases`。**[H]**
- **双层架构守门**：dep-cruiser（图结构）+ vitest 静态扫描（运行时契约 + import 边界）；`billing-no-cases` 在两处均断言（双门冗余 → OQ-32）。 **[H]**
- **跨 view 直接 import 4 处**（customers/tasks/dashboard → cases；leads → conversations）；cases 是事实上的"shared hub"。 **[H]**
- **shared/model 已成事实领域层**：`useOrgSettings` / `useGroupOptions` 等 hook 跨 feature 共享业务规则，但缺 mobile `domain/` 那种与 RN/网络隔离的硬约束。 **[H]**
- **route↔nav↔i18n 三方契约**仅由 `settingsIntegration.test.ts` 覆盖单 nav item（settings）；其它 nav item 等价覆盖待确认 → OQ-34。 **[M]**

## L. B-006 量化补充：mobile 守门规则

> 数据来源：`.agent/analysis/09-mobile-architecture-rules.md`（B-006）。

- **dep-cruiser 10 条规则全部"活"**（vs admin 仅 3 条活），含独有的 `shared-no-npm`（仅 `shared/ui` 可 npm）。 **[H]**
- **`checkFeatureBoundaries.cjs`** 用 TS AST 扫描 `features/**` 的 `import`/`export from`，禁止跨 feature 直接 import；豁免条件 = `@features/<name>/public` 或解析后落入 `features/<X>/public/`。 **[H]**
- **公共出口未启用**：6 个 feature 全部缺 `public/` 目录，跨 feature 协作必须走 `@shared`/`@domain`。 **[H]**
- **完整 guard 链**：lint → typecheck → arch:check → feature:check → lock:check → secrets:check → test（mobile 是三 workspace 中守门最严的）。 **[H]**
- **billing / reminder 是"无 feature/data 落地"的 domain-only 实体**（domain 8 - features 6 = 2），归属隐性、文档化缺失 → OQ-36。 **[M]**

## M. B-007 量化补充：core/portal 鉴权拓扑

> 数据来源：`.agent/analysis/10-core-vs-portal.md`（B-007）。

- core 31 controller 全部使用 `@RequireRoles`（staff 85 / viewer 46 / manager 23 共 154 处）。 **[H]**
- portal 7 controller 中 6 个完全靠"`@Public + @UseGuards(AppUserAuthGuard)`"双装饰器；**仅 `portal/leads`** 同时混用 admin 路径（`@RequireRoles("staff")` 的 assign/convert）。 **[H]**
- `AppUserAuthGuard.canActivate` 在 `req.requestContext` 已存在时短路返回 true → admin JWT 可"穿透"portal 端点 → 形成 `GET /leads` 这类双语义入口（admin 与 app-user 共享同 URL，行为分流）。 **[H] 风险**
- portal **没有独立 NestModule**，所有 controller/service/guard 与 core 平铺在 `AppModule`；新增 portal 端点漏写装饰器对会被静默放行 → OQ-39 / OQ-41。 **[H]**

## N. B-008 量化补充：templates ↔ cases 耦合

> 数据来源：`.agent/analysis/02-cases-service-anatomy.md` 附录 A（B-008）。

- **端口宿主错位**：`TEMPLATES_RESOLVER` Symbol + `TemplatesResolver` 接口在 `cases.service.ts:135-153` 导出；submission-packages 仅为拿令牌而 import cases.service.ts（3457 行）→ 把整个 cases 服务文件拉入图依赖 → OQ-42 / OQ-43。 **[M]**
- **kind 字面量散布**：`{"case_type", "document_checklist", "state_flow"}` 共 5 处调用点未集中为 const enum；新增 kind 需 templates / cases / submission-packages 三处协调 → OQ-44。 **[M]**
- **重复实现**：`isReviewRequired` 在 `cases.service.ts:3038` 与 `submissionPackages.service.ts:804` 各有一份，逻辑一致；任一改动需双侧同步 → OQ-46。 **[H] 风险**
- **config 弱类型**：resolver 返回 `Record<string, unknown>`；`resolveChecklistItems` 同时读 `config.items` 与 `config.requirementBlueprint`（兜底链）→ 历史 schema 迁移痕迹未收敛 → OQ-45。 **[M]**
- **mode 决策面**：`legacy` / `template-not-used` / `template-used` 三态在 4 个 cluster（CRUD checklist / Stage Transitions / Validation / Review）共享；任何 mode 判定改动跨 cluster 起效。 **[H]**
- **方向单向**：templates 模块未 import cases；cases / submission-packages 经端口反向依赖 templates。 **[H]**

## O. B-009 量化补充：i18n 跨语言契约

> 数据来源：`.agent/analysis/11-i18n-contract.md`（B-009）。

- **覆盖率不齐**：admin 12 个 message group 中仅 5 个有 `i18n-contract.test.ts`（billing/customers/conversations/leads/settings）；7 个 group 无键平价测试 → OQ-49。 **[H]**
- **mobile 完全缺 i18n**：`packages/mobile/src` 下无 i18n 设施；portal 客户端语言策略未确认 → OQ-47。 **[M]**
- **server → admin 无系统化 code-to-key 对账**：服务端写"稳定 i18n code"（如 `case_fee`、错误码），admin adapter 映射 → i18n key 仅由点状 BUG-fix 测试（如 BUG-186 `resolveMilestoneI18nKey`）守护；缺 N:1 全表对账 → OQ-53。 **[H] 风险**
- **必需键白名单手写**：5 个测试中 const KEYS 数组手写约 153 个键；与 messages 字典之间无单一真相源；新增 key 不进入白名单。 **[M]**
- **测试 helper 重复**：`collectLeafKeys` × 5、`resolveKey` × 4，未抽取共享 helper → 漂移风险。 **[M]**
- **占位符一致性未守护**：契约仅断 truthy / typeof string；`{count}` / `{0}` 等 ICU 占位符跨语言不强制一致 → OQ-54。 **[M]**
- **文案级回归仅守 "Group"**：`/\bGroup\b/` 正则单点回归；其他英文残留无类似守护 → OQ-52。 **[M]**

## P. B-010 量化补充：测试 ownership / 命名规范

> 数据来源：`.agent/analysis/12-test-taxonomy.md`（B-010）。

- **runner 异构**：admin Vitest（366）/ server node:test（216）/ mobile Jest（15）→ 0 跨包共享 runner；shared 测试 helper 不可直接复用 → OQ-57。 **[M]**
- **cases 测试簇集中**：admin cases 簇 175 文件占 47.8 %（views/cases/{model,components,view 根}）；server `modules/core/cases` 68 文件占 31.5 %；与 §B-002 服务端 3456 行巨型 service 同向。 **[H]**
- **bug 命名跨包仅 2 项重叠**（bug159、bug200，于 49 admin / 14 server 中）→ 未观察到统一 bug 登记 → OQ-55；含义无法机械判定（"未在另一包补测"≠"无需补测"）。 **[M]**
- **TEST-OWNERSHIP.md 仅 cases 模块存在**（118 行 / 11 个 frozen 锚点 / ~38 行矩阵）；customers/billing/documents/leads/conversations 无同类治理 → OQ-56。 **[M]**
- **mobile 无 i18n / contract / focused / regression / bug 命名**：0 文件 → 与 admin/server 测试规范脱节，覆盖以 viewModel 单测为主 → OQ-57。 **[H]**
- **测试侧无 boundary/invariant/ownership 命名族**：仅 2 个 admin 文件（`architecture-guard` + `crossModuleGates`）做层间运行时自检；边界守护主要靠 build-time depcruise/arch:check → OQ-58。 **[M]**
- **server P1 守护批次孤岛**：11 个 `*.regression-p1-*`（cases）服务端独有；admin 缺对应 P1 命名族 → OQ-59 同步性未确认。 **[M]**
- **focused 命名密集在 cases**：admin 50 focused 中 43 在 cases 簇（86 %）；server 53 focused 中 32 在 cases（60 %）→ 与 cases 复杂度热点重合，反向印证修复频率。 **[H] 信号**

## Q. B-011 附录：500 行违例总览（非测试源文件）

> 数据来源：`find packages/{admin,server,mobile}/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.vue" \) -not -name "*.test.*" | xargs wc -l | awk '$1>500'`。AGENTS.md 规则上限 500 行。

**admin（13 文件违例）**：

| 行数 | 文件 | 性质 |
|----:|------|------|
| 2780 | `views/cases/fixtures-detail.ts` | 假数据 / fixture（非业务逻辑）|
| 1500 | `views/cases/types-detail.ts` | 类型定义 |
| 984 / 982 / 941 | `i18n/messages/cases/{en-US,ja-JP,zh-CN}.ts` | i18n 字典（与 §11 i18n 量化一致）|
| 848 | `views/cases/CaseDetailView.vue` | **页面组件 → 违反"组件不堆业务"规则**（OQ-60）|
| 648 | `views/documents/model/DocumentRepositoryTypes.ts` | 类型 |
| 577 | `views/cases/components/CaseOverviewTab.vue` | **组件 → 同 OQ-60** |
| 552 | `views/cases/model/CaseRepository.ts` | model 层（合法但接近热点）|
| 544 | `views/cases/constants.ts` | 常量 |
| 515 | `views/cases/types.ts` | 类型 |
| 512 | `views/cases/components/CaseMessagesTab.vue` | **组件 → 同 OQ-60** |
| 510 | `views/cases/model/CaseAdapterDetailContracts.ts` | adapter 契约类型 |

→ 13 文件中 **3 个 .vue 组件**（CaseDetailView 848 / CaseOverviewTab 577 / CaseMessagesTab 512）超过 500 行，**违反 AGENTS.md "页面/组件不堆业务"** 规则的字面阈值；其余 10 个为 cases 簇的 fixture/type/i18n/constant/adapter（结构性数据非逻辑）。

**server（5 文件违例）**：

| 行数 | 文件 |
|----:|------|
| 3456 | `modules/core/cases/cases.service.ts`（B-001 / B-002 主热点）|
| 1244 | `infra/db/drizzle/schema.ts`（22 张表声明，结构性）|
| 931 | `modules/core/submission-packages/submissionPackages.service.ts`（与 cases 簇耦合，§B-008）|
| 667 | `modules/core/residence-periods/residencePeriods.service.ts` |
| 516 | `modules/templates/templates.service.ts`（templates port-adapter 实现端，§B-008）|

**mobile（0 文件违例）**：所有 src 下源文件 ≤ 500 行；分层规则严格执行成功。

**结构观察**：
- admin 违例集中在 `views/cases/`（13 中 11 个）+ documents（1）→ cases 簇是双侧（admin/server）热点。
- server 违例 5 个文件中 4 个是业务 service；schema.ts 是结构性单点。
- mobile 完全干净，是三包中唯一无大文件的工作空间。

## Q. B-014/B-015/B-016 量化补充

### Q.1 知识库治理（B-014）

| 维度 | 量化 | Confidence |
|------|------|------------|
| 业务权威根 | `docs/gyoseishoshi_saas_md/`（P0 12 文件 + P1 4 文件 + 06-页面规格 11 模块 + _raw inbox + _output 35 段） | **[H]** |
| Augment 规则镜像 | `.augment/.cursor/.trae/rules/core-operating-rule.mdc` 三处副本 | **[H]** |
| 流程主索引双源 | `docs/事务所流程/事务所流程.master.json` ⇄ `04-核心流程与状态流转.md`（OQ-64） | **[H]** |
| P0 → P1 入口 | P0 主索引未交叉链回 P1（OQ-63） | **[M]** |
| Compile 节奏 | _output 约 35 段，无 weekly lint 时间戳（OQ-62） | **[M]** |

### Q.2 Feature flags 横切面（B-015）

| 维度 | 量化 | Confidence |
|------|------|------------|
| 生产消费者 controller | **1**（customers.controller.ts `assertBmvEnabled`） | **[H]** |
| flag key 实际使用 | **1**（`"bmv"`） | **[H]** |
| admin / mobile 引用 | **0** / **0** | **[H]** |
| Drizzle 声明 | **缺**（与 OQ-26 一致） | **[H]** |
| Port-Adapter 抽象 | **无**（vs templates 模块 `TEMPLATES_RESOLVER` Symbol） | **[H]** |
| RLS 覆盖 | **未在 B-004 矩阵中列出**（OQ-65 → High 风险） | **[M]** |

### Q.3 集成测试稳定性（B-016）

| 维度 | 量化 | Confidence |
|------|------|------------|
| 集成测试文件数 | **2**（dtoSmoke + bug177） | **[H]** |
| 单测文件数 | **216** | **[H]** |
| 集成 / 单测比 | **0.93 %** | **[H]** |
| 容器形态 | postgres:16-alpine + tmpfs + 端口 5499 + healthcheck | **[H]** |
| RLS 端到端测试 | **无**（OQ-69 → High 风险） | **[H]** |
| backfill 集成验证 | **9 backfill 中 1 个有验证**（039）→ 8 个无 | **[H]** |
| guard 位置 | 链尾（unit 后），ci 每次起停 docker | **[H]** |

### Q.4 跨 §B 高优先级闭环

- **§A（cases.service 3456 行）+ §F（cases 簇 vs §K admin views/cases 11 大文件）+ §P（admin 86 % bug ID 集中 cases）**：cases 域是仓库**结构性瓶颈**——服务/类型/fixture/测试/i18n 全部超大。
- **§G（Drizzle 缺 13 表）+ Q.2（feature_flags 是其中之一）+ Q.3（无 RLS 集成测试）**：多租户隔离正确性依赖纯应用层 GUC + 部分 RLS policy + Drizzle 部分声明 → 任一调用绕道即跨 org 风险。
- **§B（依赖图扇入 top-3 = `core/auth/auth.decorators` / `tenancy/requestContext` / `feature-flags`）+ Q.2**：`feature-flags` 高扇入的实际语义被本轮证伪——它只在 1 个 controller 被消费，扇入的 18 处中 16 处是测试 / 自身路由 → 扇入数字与"耦合面"不等价，需结合"production consumer count"二次过滤。
