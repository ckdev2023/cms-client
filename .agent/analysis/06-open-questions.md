# 06 — Open Questions (v1, incremental)

> 收纳一切第一轮扫描中"事实未确认 / 仅有信号"的问题。
> 每条至少包含：问题 / 信号来源 / 当前推测（如有）/ 验证手段。
> 任何 Low confidence 的结论都必须在这里有对应入口。

## OQ-01 prototype 与生产代码是否存在 import 关系（B-013 已验证）
- 信号：`packages/prototype/admin/` 仅含静态原型目录结构。
- **B-013 验证结果**（High）：admin/server/mobile `src/` 内**仅 1 处**引用，且为注释——`packages/admin/src/styles/theme.css:5` 注释行 `Source: packages/prototype/admin/shared/styles/tokens.css`，无任何 TS import / `from "@prototype` / `from "../../prototype` / 资源 require。
- 结论：**生产代码与 prototype 之间无运行时 import**；prototype 仅为静态参考来源（admin theme.css 是手抄而非引入）。 **High**
- 残留疑问：`packages/prototype/package.json` 是否在 npm workspaces 注册（影响 `npm install` 副作用）—未验证。

## OQ-02 `roles/` 目录的运行时 / 工具链作用
- 信号：根目录有 `roles/01-产品与业务` 等 5 个目录与 `README.md`。
- 推测：仅为人员/角色文档，不进入构建。 **Low**
- 验证：grep 是否被 `vite.config.ts` / `tsconfig*.json` / `eslint.config*` / `dependency-cruiser` 之一引用。

## OQ-03 锁文件冲突的实际影响（B-012 部分验证）
- 信号：根 `package-lock.json` 存在；`packages/mobile/package-lock.json` 也存在；**两个锁文件均被 git 追踪**（`git ls-files` 双命中）。
- **B-012 验证**（High）：
  - `packages/mobile/package.json` 的 `lock:check` 脚本仅扫描**根目录**是否存在 yarn.lock/pnpm-lock.yaml/bun.lockb，**不扫描 mobile 子目录自身**——即 `mobile/package-lock.json` 绕过门禁，未被检测为违规。
  - `AGENTS.md` 第 8 行规则"仅使用 npm（保持 `package-lock.json` 为唯一锁文件）"按字面读，**当前 mobile 子锁文件状态违反此规则**。
  - 文件大小 331721 B（与根锁分离），mtime 2024-04-07，疑为 mobile package 早期独立初始化时残留。
- 结论：**mobile 子锁是真实的规则违规且被 git 追踪**；npm workspaces 安装行为以根锁为准（验证手段：`npm ls --workspaces` / 比较两锁的 `packages/mobile/...` 段是否漂移），但由于 mobile 子锁仍可能在直接进入 `packages/mobile` 后被 `npm install` 再生成或参考（取决于 npm 版本），构成漂移风险。 **High 风险**
- 残留疑问：是否在 .gitignore 添加 `packages/mobile/package-lock.json`？是否扩展所有 lock:check 脚本以扫描子目录？由用户决定。

## OQ-04 admin TypeScript 版本（~6.0.2）选择（B-012 部分验证）
- 信号：`packages/admin/package.json` `typescript ~6.0.2`；`packages/server` `~5.9.2`；`packages/mobile` `~5.9.2`；根 `package.json` 无 typescript 字段。
- **B-012 验证**（High 事实，Low 因果）：admin 唯一使用 TS 6 的工作空间；与 server/mobile 不一致。
- 推测：admin 用 Vue 生态（vue-tsc / Vite / Vitest）较激进；server 用 NestJS + node:test，mobile 用 Expo + Jest，工具链对 TS 6 升级动力较弱。 **Medium**
- 影响：跨包 import / 跨包共享类型时 TS 6 与 TS 5.9 的语法/语义差异（如 `using` 声明、stage-3 decorators 严格度）可能导致**单边类型校验通过 / 另一边失败**——目前无跨包共享 TS 类型源（admin/server 各自维护 DTO），暂未触发。
- 残留疑问：是否计划统一三包 TS 版本？三包共享类型源（如 `@cms/shared-types`）何时引入？由用户决定。

## OQ-05 `custom/tenant-a` 的边界
- 信号：`packages/server/src/modules/custom/tenant-a/` 存在。
- 推测：tenant-specific 扩展点；是否允许反向依赖 core 不明。 **Low**
- 验证：读取该目录内的 controller/service 与 dependency-cruiser 规则。

## OQ-06 admin 是否实际遵循 feature 分层
- 信号：AGENTS.md 描述 feature/domain/data/infra 分层主要描述对象是 mobile；admin 实际使用 `views/<feature>/{model,components,fixtures,...}` 形态。
- 推测：admin 走 "views + model/repository runtime" 的弱分层方案。 **Medium**
- 验证：阅读 `packages/admin/.dependency-cruiser.js` 规则集 + `repositoryRuntime.architecture-guard.test.ts` 实际断言。

## OQ-07 server `core` vs `portal` 的真实分界
- 信号：`core/` 与 `portal/` 各自有独立 `auth`、`conversations`、`leads`、`messages`，目录命名重叠。
- 推测：core 是事务所/管理后台；portal 是申请人/C 端 app；两者复用 schema 但对外 API 不同。 **Medium**
- 验证：阅读两边 controller `@Controller(...)` 路径前缀与 guard。

## OQ-08 `templates` 模块的角色
- 信号：`packages/server/src/modules/templates/templates.service.ts` 516 行；`app.module.ts` 中有 `TEMPLATES_RESOLVER` 别名指向 `TemplatesService`，被 `CasesService` 注入。
- 推测：模板（如文档模板、案件模板）解析能力，是 cases 的关键依赖。 **Medium**
- 验证：阅读 `templates.service.ts` 与其在 cases.service.ts 中的使用点。

## OQ-09 测试 runner 三套并存的成因
- 信号：admin=vitest、mobile=jest+jest-expo、server=node:test。
- 推测：技术栈历史 + Expo 体系强约束 jest。 **Medium**
- 验证：CHANGELOG/历史 commit；当前不必统一。

## OQ-10 `scripts/batch-exit-matrix.sh` 的角色
- 信号：根脚本 + admin `scripts/p0-batch-exit-matrix.sh`、`p1-batch-exit-matrix.sh`、`lead-conv-bmv-smoke.sh`。
- 推测：批量执行 exit-matrix 测试集（"门禁矩阵"）。 **Medium**
- 验证：读脚本内容。

## OQ-11 i18n 三语完整性与"权威语言"
- 信号：admin/i18n/messages/cases/{en-US,ja-JP,zh-CN} 行数接近但不一致（874/872/832）。
- 推测：以 ja-JP 为主键、其他语言对齐；契约由 `i18n-contract.test.ts` 守护。 **Medium**
- 验证：阅读 `i18n-no-untranslated-group.test.ts` 与 cases 下的 `i18n-*.test.ts`。

## OQ-12 mobile 测试稀疏的成因
- 信号：85 源文件 vs 5 测试文件。
- 推测：mobile 仍处早期；domain/data 层测试存在但没有 ui/feature 层 widget test。 **Medium**
- 验证：跑覆盖率报告 `packages/mobile/coverage`（已存在 lcov 报告，可解析）。

## OQ-13 `docs/事务所流程/` 与 `docs/gyoseishoshi_saas_md/` 的权威关系
- 信号：两个目录都包含业务规范，主题部分重叠。
- 推测：`gyoseishoshi_saas_md/` 是项目内权威 P0/P1 文档；`事务所流程/` 是上游素材。 **Medium**
- 验证：阅读 `gyoseishoshi_saas_md/README.md` 顶部与 AGENTS.md 中的 "资料入口"。

## OQ-14 admin `dist/` 与 `coverage/` 是否应在仓库中
- 信号：`packages/admin/dist/`、`packages/admin/coverage/`、`packages/mobile/coverage/` 已纳入文件树。
- 推测：CI 产物或本地构建残留。 **Low**
- 验证：检查 `.gitignore` 是否覆盖；不在本次任务范围内修改。

## OQ-15 `feature-flags` 与 `tenant-a` / 业务 feature 的耦合面
- 信号：`feature-flags` 模块独立存在；`customers.bmv.d7-feature-flag.focused.test.ts` 显示 BMV/D7 等流程使用 feature flag 控制。
- 推测：FeatureFlags 是横切能力，被多个 service 直接注入。 **Medium**
- 验证：查找 `featureFlagsService` 在 service 层的所有引用。

## OQ-16 `scripts/ai/context7-preflight.mjs` 的语义
- 信号：根 `npm run ai:context7:preflight`。
- 推测：与 `core-operating-rule.mdc` 中提到的 Context7 集成相关。 **Medium**
- 验证：读脚本内容；不影响代码任务边界。

---

## 第二轮（B-001..B-004）新增 OQ

## OQ-17 `cases.service.ts` 12 个功能簇的真实边界
- 信号：B-001 已划分 12 簇（CRUD / Transitions / BMV / Billing / Documents / Reminders / Templates / Read Models / RBAC / Validation / Submission / Misc）。
- 推测：边界与 .ts 文件内的方法序号高度对齐，但同一簇内方法可能跨域调用。 **Medium**
- 验证：在 backlog 中 B-005 用 `madge` / 局部依赖图量化簇间方法调用矩阵。

## OQ-18 server / admin / mobile 中孤儿模块（11 / 4 / 16）的实际语义
- 信号：B-002 dependency-cruiser 输出 `orphans` 计数。
- 推测：server 11 个多为入口（main.ts / worker.ts / migrations runner）和测试 helper；mobile 16 偏多可能含未接入的 features。 **Low**
- 验证：导出 orphan 列表；逐一标注"入口 / 工具 / 待清理"。

## OQ-19 `worker.ts` 的装配清单
- 信号：03 文档 §1.2 显示 `worker.ts` fan-out=15，与 `app.module.ts` (89) 平行。
- 推测：worker 独立组装 4 个队列 handler（reminders/notifications/translations/exports）+ 必要的 service。 **Medium**
- 验证：阅读 `packages/server/src/worker.ts`；列出注入到 handler 的 service。

## OQ-20 `tenantDb.ts` 内部职责拆分
- 信号：fan-in=43，与 `cases.service.ts`、`auth.decorators` 同级；但行数尚未读取。
- 推测：包含 `createTenantDb` + `createTenantDrizzleRepository` + `assertBelongsToOrg` 至少三类能力。 **Medium**
- 验证：阅读源文件；与测试 `*tenantDb*.test.ts` 命中范围对照。

## OQ-21 `custom/tenant-a/*` 是否在 worker 或其他 module 中装配
- 信号：05 文档显示 `app.module.ts` 装配清单中无 `custom/*`；03 文档显示 dep-cruise 中未孤立报错。
- 推测：可能仅 worker 装配，或当前未启用。 **Low**
- 验证：grep `custom/tenant-a` 在所有 NestModule 中的 import；与 OQ-05 合并。

## OQ-22 `auth.decorators.ts` 43 fan-in 的成分
- 信号：03 §1.1 fan-in=43；文件本身只导出 `@Public()` / `@RequireRoles()` / `IS_PUBLIC_KEY` / `REQUIRED_ROLES_KEY`。
- 推测：每个 controller 都引入 `@RequireRoles` → 几乎覆盖所有 controller。 **High**
- 验证：用 grep `from "..*auth/auth.decorators"` 在 src 内统计。

## OQ-23 `timeline.service.ts` 24 fan-in 的写入语义
- 信号：03 §1.1 fan-in=24；几乎每个 `*.service.ts` 都注入它。
- 推测：是统一的 audit/事件流写点；写入 `timeline_logs`（未在 Drizzle schema.ts 中）。 **High**
- 验证：阅读 `timeline.service.ts`；列出 `writeTimelineEntry` 的调用方。

## OQ-24 `HealthController` 的路径前缀
- 信号：grep `@Controller(...)` 仅扫了 `modules/`，未命中 health；05 文档提及 health 在 `src/health` 下。
- 推测：路径前缀可能为 `/health` 或 `/api/health`。 **Low**
- 验证：直接 `view packages/server/src/health/health.controller.ts`。

## OQ-25 portal `@Public() + @UseGuards(AppUserAuthGuard)` 与 `RequestContextInterceptor` 的协作
- 信号：05 文档 §1 给出双 guard 共存模型；但 RequestContextInterceptor 解析 header 的逻辑未读。
- 推测：interceptor 优先填 `req.requestContext`；AppUserAuthGuard 看到已有 ctx 直接返回 true（与 guard 源码 `if (req.requestContext) return true;` 一致）。 **Medium**
- 验证：完整阅读 `RequestContextInterceptor`；确认 portal 请求实际是否完全跳过 DB 查询。

## OQ-26 13 张业务表未在 Drizzle schema.ts 中声明
- 信号：07 §3 列举：timeline_logs / reminders / feature_flags / template_{versions,releases} / jobs / app_users / leads / conversations / messages / user_documents / intake_forms / tasks / billing_records / payment_records / lead_followups / lead_logs。
- 推测：这些表通过 raw SQL via `tenantDb` 访问；后续是否要补全 Drizzle 声明属于策略决策，不属本期实施范围。 **High**（事实）/ **Low**（决策）
- 验证：grep `CREATE TABLE` 与 `pgTable("...")` 的差集已生成；策略由用户在后续阶段决定。

## OQ-27 `app_users` / `intake_forms` 是否启用 RLS
- 信号：07 §3 显示 008_portal_rls 仅覆盖 conversations/leads/messages/user_documents；app_users 与 intake_forms 未在任何 RLS 迁移命中。
- 推测：app_users 可能由 JWT 全局过滤即可，无需 org_isolation；intake_forms 可能漏配。 **Low**
- 验证：搜索全部 migration；确认是否有未发现的 RLS 启用语句；若漏配则归入安全 backlog。

## OQ-28 `case_templates` 是否启用 RLS
- 信号：023_case_templates 创建表，但未在 04/006/008/010/019 等 RLS 波次中提及。
- 推测：可能被 023 自带 RLS 子句覆盖（023 .up.sql 全文未读）。 **Low**
- 验证：完整 view 023 .up.sql。

## OQ-29 `003_timeline_triggers.sql` 中的 PL/pgSQL 业务逻辑
- 信号：文件名暗示存在触发器；构成"DB 端业务逻辑"。
- 推测：可能在 INSERT/UPDATE 业务表时自动写 timeline_logs。 **Medium**
- 验证：完整 view 003_timeline_triggers.sql。

## OQ-30 billing 三 controller 共用单表 `billing_records`
- 信号：billingPlans.service / billingCollections.service / billingSummary.service 均访问 `billing_records`；payment-records 单独访问 `payment_records`。
- 推测：API 路径以 plan/collection/summary 切片，逻辑层（service）在同一物理表上做不同视图。 **High**
- 验证：阅读三 service 的 SELECT/INSERT 模式；确认是否有隐式按 `kind` 字段分片。


## OQ-31 admin dep-cruiser 中休眠规则的处置策略
- 信号：`packages/admin/.dependency-cruiser.js` 11 条规则中 7 条引用不存在的目录（features/domain/data/infra），见 `08-admin-architecture.md` §2。
- 推测：规则文件曾从 mobile 拷贝裁剪而成，未与现实 admin 形态对齐。 **Medium**
- 验证：与团队确认 admin 是否计划走向 mobile 风格分层；若否，应删除休眠规则避免误导；若是，应预先建立目录骨架。

## OQ-32 admin 双门（dep-cruiser + vitest 静态扫描）冗余
- 信号：`billing-no-cases`（dep-cruiser）与 `repositoryRuntime.architecture-guard.test.ts` 中"views/billing must not import views/cases"做同一断言。
- 推测：双门是渐进引入的产物；vitest 路径解析与 dep-cruiser 路径匹配并非完全等价（vitest 用 path.resolve 不解析 alias，dep-cruiser 用 ts-config）。 **Medium**
- 验证：构造一个绕开 dep-cruiser 但被 vitest 抓到（或反之）的 import 场景。

## OQ-33 admin `shared/model` 是否已成事实领域层
- 信号：`useOrgSettings` / `useGroupOptions` / `useOwnerOptions` / `useVisaTypeOptions` 在 `crossModuleGates.test.ts` 中被多 feature 共享；但目录命名是 `shared/model` 而非 `domain`。
- 推测：shared/model 实际承担 mobile 中 domain 的角色（跨 feature 业务规则 + 类型 + 选项源），只是没有和 React Native / 网络隔离的硬约束。 **High**
- 验证：列出 `shared/model/*.ts` 中纯无状态格式化（formatCurrency 等）vs 含业务逻辑（useGroupOptions）的比例。

## OQ-34 admin route↔nav↔i18n 三方契约的覆盖完整度
- 信号：`router/settingsIntegration.test.ts` 仅覆盖 `/settings` 一个 nav item（24 个 it 全围绕 settings）。
- 推测：其它 nav item（cases / customers / billing / leads / conversations / documents / tasks / dashboard）没有等价的 navKey/groupKey/i18n 契约测试。 **High**
- 验证：grep `meta.navKey` 在 `router/index.ts` 与 `nav-config.ts` 的所有 key；对照 i18n messages 中 `shell.nav.items.*` 的键集。

## OQ-35 admin 跨 view 直接依赖的策略
- 信号：4 处 view→view import（customers→cases, tasks→cases, leads→conversations, dashboard→cases），见 `08-admin-architecture.md` §3。
- 推测：cases 是事实上的"共享 hub"；conversations 直接被组件级嵌入到 leads 是另一种耦合（结构而非工具函数）。 **High**
- 验证：判断这 4 处是否要迁到 shared/，或显式声明"允许 cases 被其它 view 引用"。

## OQ-36 mobile `domain/billing` 与 `domain/reminder` 的归属
- 信号：domain 8 个条目中 billing / reminder 在 features 与 data 中均无对应目录（见 `09-mobile-architecture-rules.md` §1、§7）。
- 推测：这两个领域当前由 `case` feature 通过 model 持有；HTTP 走 `data/case` 或共用 `infra/http`。 **Medium**
- 验证：grep `@domain/billing` / `@domain/reminder` 在 features/data 下的所有 import；列出调用方分布。

## OQ-37 mobile data ↔ feature 一对一是否被某门禁强制
- 信号：现实中 `data/*` 与 `features/*` 各 6 目录精确对齐（auth/case/documents/home/inbox/profile）；但 dep-cruiser 与 `checkFeatureBoundaries.cjs` 都不直接强制此对齐。
- 推测：是隐含约定，靠代码评审维护。 **High**
- 验证：尝试构造"data/<X> 但无 features/<X>"的场景，看是否任何门禁报错。

## OQ-38 mobile features `public/` 出口为何全空
- 信号：6 个 feature 都没有 `public/` 子目录；`checkFeatureBoundaries.cjs` 已为此预留 alias `@features/<name>/public`。
- 推测：当前没有任何"合理的"跨 feature 引用需求；所有跨 feature 协作走 @shared/@domain。 **High**
- 验证：grep features 内是否有任何 import 指向另一个 feature；若有，必为违规。

## OQ-39 portal `@Public + @UseGuards(AppUserAuthGuard)` 对称性是否被强制
- 信号：portal 7 控制器全部依赖此双装饰器组合；任一遗漏会导致 401 或完全公开。
- 推测：当前仅靠人工评审；无静态分析守护。 **High**
- 验证：尝试构造一个仅写 `@Public()` 不写 `@UseGuards` 的端点，看是否被任何 guard test 抓到（`portal/security.test.ts` 是候选）。

## OQ-40 portal/leads 双语义端点的客户端契约
- 信号：`GET /leads` 同时支持 admin（看全量）和 app-user（看自己）两条路径，依赖 `req.requestContext` 是否存在分流。
- 推测：admin 客户端走 `/admin/leads`（core 路径）；portal `/leads` 仅作 admin 调试通道，正式管理流量从未经此。 **Medium**
- 验证：搜索 admin 前端代码是否调用 `/leads`；若是，列出场景。

## OQ-41 portal 是否需要"默认 AppUserAuthGuard"
- 信号：portal 控制器需逐方法 `@UseGuards(AppUserAuthGuard)`；漏写则端点完全无鉴权（被 `@Public` 放行）。
- 推测：`AppUserAuthGuard` 没有作为 `APP_GUARD` 注册；portal 没有独立 NestModule 应用 module-level guard。 **High**
- 验证：检查是否存在 `@Module({ providers: [{ provide: APP_GUARD, useClass: AppUserAuthGuard, scope: 'portal' }] })` 或等价模式（应该没有）。


## OQ-42 submission-packages → cases.service 仅为拿令牌的依赖
- 信号：`submissionPackages.service.ts:17` `import { TEMPLATES_RESOLVER, TemplatesResolver } from "../cases/cases.service"` 实际只为获取 Symbol 与类型，但拉入了对 3457 行 cases.service.ts 的图依赖。
- 推测：把令牌/接口下沉到 `core/cases/templates.contract.ts`（或 `core/model`）即可消除该边；当前形态是"端口寄宿在大宿主"。 **Medium**
- 验证：dep-cruiser 检查 `submission-packages → cases` 是否仅由该一行 import 驱动。

## OQ-43 TEMPLATES_RESOLVER 端口归属位置
- 信号：端口（接口 + 令牌）在 `cases.service.ts:135-153` 内导出，使 cases 成为"模板端口的宿主域"。
- 推测：cases 同时是 resolver 的最大消费者与端口宿主纯属偶然；应迁移至中性位置以避免反向语义。 **Medium**
- 验证：对比 templates / submission-packages / cases 三方 import 拓扑，看端口移位后图是否更小。

## OQ-44 kind 字面量未集中
- 信号：`"case_type"` / `"document_checklist"` / `"state_flow"` 散布于 5 处 `templatesResolver.resolve()` 调用；无 const enum / union type 约束。
- 推测：新增 kind 需要在 templates.service + cases.service + submissionPackages 三处同步；拼写错误目前只能运行时发现。 **Medium**
- 验证：grep `kind:\s*["']` 全仓，确认是否有其他 kind 值未列入。

## OQ-45 模板 config schema 弱类型
- 信号：resolver 返回 `config: Record<string, unknown>`；`resolveChecklistItems` 同时读 `config.items` 与 `config.requirementBlueprint` 形成兜底链，暗示历史 schema 迁移。
- 推测：模板 config 在数据库中以 JSONB 存储；缺少跨语言契约描述；前端/后端 narrow 逻辑分散。 **Medium**
- 验证：检查 templates 模块是否有 zod / class-validator schema，以及 i18n / 前端是否复用同源类型。

## OQ-46 isReviewRequired 重复实现
- 信号：`cases.service.ts:3038` 与 `submissionPackages.service.ts:804` 两份 `isReviewRequired`，逻辑一致（同 kind/key/entityId，同 `review_required_flag` 读取）。
- 推测：未抽取为共享 helper；任何阈值/字段名变化需双侧同步，存在漂移风险。 **High**
- 验证：grep 全仓 `review_required_flag` 出现位置，看是否还有第三处。

## OQ-47 mobile workspace 是否走 i18n
- 信号：`find packages/mobile/src -path "*i18n*"` 无命中；mobile 没有 `locale.ts` / messages 目录。
- 推测：portal 客户端可能仅日文单语言；与 admin 的"代码->键"边界没有对称设施。 **Medium**
- 验证：检查 mobile 入口 / RN 字符串如何处理；若客户端必须支持多语言，需要补建 i18n 设施。

## OQ-48 customers messages 命名不对称
- 信号：`messages/customers/` 含 `en-US.ts` + `en-US-list.ts`、`ja-JP.ts` + `ja-JP-list.ts`，但 zh-CN 仅有 `zh-CN.ts`。
- 推测：zh-CN 已合并 list；en/ja 拆分历史遗留；契约测试以 `en-US.ts` 为基准，可能漏算 `en-US-list` 的键。 **Medium**
- 验证：用 collectLeafKeys 比 `en-US-list` 与 `zh-CN` 的"customers list"子树是否真在同一处。

## OQ-49 7 个 message group 无键平价测试
- 信号：`cases / dashboard-work-item / documents / shell-search / tasks / work-items` 无 `i18n-contract.test.ts`；customers 仅覆盖详情未覆盖 list。
- 推测：契约引入是按 view-by-view 增量；未形成"全 group 默认强制平价"流水。 **High**
- 验证：是否存在统一的 i18n CI 步骤覆盖所有 group；guard 脚本是否扫描所有 group。

## OQ-50 collectLeafKeys / resolveKey 在 5 个测试文件重复
- 信号：5 个 i18n-contract 测试 + no-untranslated-group 各自含一份 `collectLeafKeys`；`resolveKey` 也重复 4 次。
- 推测：i18n 测试 helper 未抽取为 `i18n/__tests__/utils.ts` 或 `shared/test-utils`，散落改写有漂移风险。 **Medium**
- 验证：检查是否有 i18n 测试基础设施 PR / lint 规则。

## OQ-51 必需键白名单手写
- 信号：`FIELD_KEYS / LOG_TAB_KEYS / RISK_ACK_KEYS / ...` 全部以 const 数组手写于测试内；与 messages 字典无单一真相源。
- 推测：新增 key 不会自动进入白名单；删 key 才被发现 → 守护是单边的。 **Medium**
- 验证：是否存在通过类型生成 / json-schema 派生白名单的设施。

## OQ-52 文案级回归仅守 "Group"
- 信号：`i18n-no-untranslated-group.test.ts` 仅以 `/\bGroup\b/` 扫描；其他英文残留（"Customer" / "Lead" / "Status" 等）无同类守护。
- 推测：只对历史 BUG 做了点状回归；通用"无英文残留"规则缺失。 **Medium**
- 验证：是否存在更广义的术语守护（dictionary / glossary check）。

## OQ-53 server 错误码 → admin i18n key 映射缺系统化对账
- 信号：`cases.types.ts:11`、`documents.types.ts:22`、`groups.types.ts:4` 等含"admin adapter 映射为 i18n key"注释；映射仅以 BUG-186 等单点 focused 测试守护（如 `resolveMilestoneI18nKey`）。
- 推测：server code 集合（错误码 / milestone code）与 admin i18n key 集合无 N:1 对账文件；新增 server code 不会触发 admin 端契约失败。 **High**
- 验证：是否存在 `i18n/server-code-map.ts` 或同等真相源；尝试在 server 加新 code 看 admin 测试是否捕获。

## OQ-54 ICU 占位符一致性未守护
- 信号：`i18n-contract.test.ts` 仅断 truthy / typeof string；不比较模板内 `{0}` / `{count}` 等占位符与基准是否一致。
- 推测：跨语言文案漂移可能造成 `{count}` 出现在某语言但不在另一语言，运行时占位符未替换。 **Medium**
- 验证：检查是否有 vue-i18n 自带的占位符校验或 lint 规则。

## OQ-55 跨包 bug 登记缺统一来源
- 信号：admin 49 个唯一 bug ID + server 14 个唯一 bug ID，仅 `bug159` / `bug200` 两个跨包重叠；未发现 `BUG-*.md` / changelog 索引。
- 推测：bug ID 由开发者自定义、按"修复发生层补回归"原则就近落地；缺中心登记表 → 同一 bug 是否需双向锁定不可机械判定。 **Medium**
- 验证：是否存在外部 issue tracker 同步链接 / `docs/bugs/` 目录。

## OQ-56 TEST-OWNERSHIP.md 仅 cases 模块存在
- 信号：仓库内唯一一份 `TEST-OWNERSHIP.md` 在 `packages/admin/src/views/cases/`；customers/billing/documents/leads/conversations 等无对应文件。
- 推测：cases 模块因复杂度（B-002 量化 3456 行）被特别治理；其他模块按规范"自决"或暂未补齐。 **Medium**
- 验证：customers/model（41 文件）、billing/model（13 文件）是否有等同治理需求；询问 cases 模板是否计划复制。

## OQ-57 mobile 测试栈与 admin/server 完全异构
- 信号：mobile 用 Jest + `@testing-library/react-native`；admin 用 Vitest；server 用 node:test；mobile 0 个 i18n / contract / focused / regression 命名文件；15 个测试聚焦 viewModel + domain 规则。
- 推测：mobile 当前覆盖以 viewModel 单测为主，缺跨层契约 + i18n + bug 回归族；可能仍处早期阶段。 **High**
- 验证：mobile 是否有 P0/P1 测试规划文档；admin/server 与 mobile 是否需要共享 contract（DTO 同源）。

## OQ-58 测试侧无 boundary/invariant/ownership 命名族
- 信号：仓库内 0 个文件以 `*.boundary.test.*` / `*.invariant.test.*` / `*.ownership.test.*` 命名；架构守护仅靠 dependency-cruiser + `repositoryRuntime.architecture-guard.test.ts` + `crossModuleGates.test.ts`（共 2 个测试文件）。
- 推测：边界守护主要在 build-time（depcruise / arch:check / feature:check 脚本），运行时仅有 admin 这两文件代表的层间运行时自检。 **Medium**
- 验证：是否需要补 `*.boundary.test.*` 系列以在 CI 中守护 import 路径以外的契约（如 token 注入图、guard 应用一致性）。

## OQ-59 server P1-coe-visa-residence / questionnaire 系列守护批次
- 信号：server 有 11 个 `*.regression-p1-*` 文件（cases.regression-p1-{coe-visa-residence,questionnaire-supplement,reminder-closeout} × 多变体）；admin 端无对应 P1 命名族。
- 推测：服务端独立维护"P1 阶段守护批次"；admin 是否同步、是否有等同的 P1 抓手未知。 **Medium**
- 验证：搜寻 P1 阶段的 admin 测试是否散落在 cases/model 内未冠 P1 名；与 backlog / 任务批次 ID 对齐。

## OQ-60 admin .vue 组件超 500 行（违反 AGENTS.md 字面阈值）
- 信号：B-011 量化结果——`views/cases/CaseDetailView.vue` 848 行、`CaseOverviewTab.vue` 577 行、`CaseMessagesTab.vue` 512 行；AGENTS.md 规则上限 500 行（"页面/组件不堆业务逻辑；业务逻辑放在 feature 的 model 层"）。
- 推测：组件超长可能是 (a) template + script 合计真实业务堆叠；(b) script 已切到 useXxxModel 但 template 内嵌大量 markup；两种情况门禁含义不同。 **Medium**
- 验证：检查这三个 .vue 文件 `<script setup>` 行数 vs `<template>` 行数比例；观察是否调用对应 model（useCaseDetailModel / useCaseDetail* hooks）做状态管理。

## OQ-61 mobile package-lock.json 是否进入 .gitignore
- 信号：`git ls-files` 显示 `packages/mobile/package-lock.json` 被追踪（331721 B）；详见 OQ-03。
- 推测：未在任何 .gitignore 中排除；门禁脚本设计盲区。 **High**
- 验证：`grep -r "package-lock" .gitignore` + 询问用户是否计划将 mobile 子锁纳入禁列或允许多锁形态。

## OQ-62 业务文档 _raw 与 _output 是否定期"回灌"权威页
- 信号：`docs/gyoseishoshi_saas_md/_raw/00-inbox.md`（append-only 原始素材）+ `_output/00-outputs.md`（问答/分析归档）；AGENTS.md 规定"将 Inbox 中 Top3 条目编译为结构化页面，再回灌到权威文档"。
- 推测：知识库闭环（Ingest → Compile → File-back → Lint）依赖人工节奏；当前 _output 约 35 段，未见近期 Compile 时间戳与 lint 周报。 **Medium**
- 验证：检索 _output 与 P0/P1 主体页面是否有 ID 交叉引用；检查是否有"weekly lint"产物。

## OQ-63 P1 知识入口（经营管理签）与 P0 主体的引用关系
- 信号：`P1/01-..04-` 4 文件 + `P1/03-经营管理签高仿真原型需求门禁/` 子目录；P0 主索引（00..09 + 06-页面规格/）未在头部交叉链回 P1。
- 推测：P1 是后加层，缺乏从 P0 入口到 P1 的导航；新人无法快速判断"BMV 在哪儿"。 **Medium**
- 验证：grep `P1/` 在 P0 文件中的引用数；询问是否计划在 README/00-开始这里加 P1 入口章节。

## OQ-64 docs/事务所流程/master.json 与 04-核心流程与状态流转.md 的权威优先级
- 信号：流程主索引同时存在 (a) `docs/事务所流程/事务所流程.master.json` 与 (b) `docs/gyoseishoshi_saas_md/04-核心流程与状态流转.md`；AGENTS.md 未明确二者优先级。
- 推测：JSON 是机器可读的工作流条目源，markdown 是叙述性产品规范；冲突时谁优先未定义。 **Medium**
- 验证：抽样比对一个状态（如 S2 资料齐备 → S3 提交准备）在两边的事件命名、guard 条件是否一致；确认是否有自动 lint 校验。

## OQ-65 feature_flags 表是否启用 RLS / FORCE
- 信号：B-015 已确认 service 走 `tenantDb.query` 携带 GUC，但 B-004 §B "RLS 6 波演进矩阵" 未列入 feature_flags；该表本身也不在 Drizzle schema.ts（OQ-26）。
- 推测：仅靠应用层 GUC 注入而无 RLS policy → 多租户隔离正确性依赖 100 % 调用路径都经过 tenantDb；任意一个绕道（直 Pool.query）即跨 org 串读。 **High**
- 验证：grep migrations 中 `feature_flags` 的 ALTER TABLE / CREATE POLICY；确认 002/008/010/019 RLS 波次是否覆盖。

## OQ-66 feature flag key 注册中心 / 类型化 keyset
- 信号：`featureFlagsService.resolve(ctx, { key: "bmv" })` 接受任意字符串；全仓 production-time 仅 1 key（`"bmv"`）；无 `FEATURE_FLAGS = { ... } as const` 注册表。
- 推测：写错 key 会静默 disabled（resolve 返回 null → enabled=false）；不会触发 build error。 **Medium**
- 验证：是否有计划引入 `type FeatureFlagKey = 'bmv' | ...` 类型化约束；或在 controller 层加 keyset 白名单。

## OQ-67 shouldEnableFlagByRollout 灰度策略语义
- 信号：B-015 §2 引用了 `featureFlags.model.ts` 的 `shouldEnableFlagByRollout(payload, entityId)`，但本轮未读其实现细节（百分比哈希 / 白名单 / 与 entityId 关系）。
- 推测：BMV 实际启用阈值与 entityId 哈希算法是 P1 业务行为关键点；改动可能误开/误关大量客户。 **Medium**
- 验证：直读 `featureFlags.model.ts` + 单测 `featureFlags.service.test.ts`，绘制策略决策表。

## OQ-68 集成测试覆盖面是否计划扩展（22 表 vs 2 文件）
- 信号：B-016 量化——`tests/integration-pg/` 仅 2 文件（dtoSmoke + bug177），相对 22 张 Drizzle 业务表 / 28 张迁移业务表覆盖比 < 1 %；billing 共表（OQ-30）/ portal 双 guard（OQ-25）/ RLS（OQ-65）等业务集成路径无对应 PG 测试。
- 推测：dtoSmoke 已是高 ROI 防漂移点；扩展计划是否存在未确认。 **Medium**
- 验证：询问是否有 RFC / 路线图扩展集成测试；或确认是否依靠 unit + manual QA。

## OQ-69 RLS 端到端测试缺位
- 信号：B-004 §B 确认 RLS 6 波演进 + B-016 确认集成层无 RLS 端到端测试；`tenantDb` 的 GUC 注入与 pg policy 协作仅在 unit 层 mock 验证。
- 推测：跨 org 数据泄漏风险只有部署后人工 QA 兜底；当前 guard 链 (`db:migrations:check` / `db:drizzle:check`) 不验证 policy 行为。 **High**
- 验证：是否计划新增 `tests/integration-pg/rls-policy.*.test.ts`；或确认是否依赖云端环境校验。

## OQ-70 9 个 backfill migrations 中仅 039 有集成验证
- 信号：B-004 §C 列出 backfill 系列 034..042（9 个）；B-016 §4.2 仅 `caseParties.bug177.pg.test.ts` 对应 039。
- 推测：其余 8 个 backfill（034/035/036/037/038/040/041/042）依赖 unit 测试或人工 QA 验证 backfill 正确性。 **Medium**
- 验证：grep 各 backfill 的命名（`*backfill*.test.ts`）；确认是否有 init-once 验证文档或运行记录。


