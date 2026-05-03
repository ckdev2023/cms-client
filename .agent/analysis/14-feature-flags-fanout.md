# 14. feature-flags 横切耦合面（B-015）

> 生成阶段：B-015。来源：grep + 直读 `packages/server/src/modules/feature-flags/`、`customers.controller.ts`、`app.module.ts`、所有 `featureFlagsService` / `FEATURE_FLAGS` 引用点。仅服务端，admin/mobile 无引用。

## 1. 模块结构（High）

```
packages/server/src/modules/feature-flags/
  featureFlags.service.ts      (生产入口；class FeatureFlagsService)
  featureFlags.controller.ts   (HTTP 路由：list / get / resolve / upsert)
  featureFlags.model.ts        (类型 + 推测 shouldEnableFlagByRollout 工具)
  featureFlags.service.test.ts (单测)
```

**仅 1 张表**：feature_flags（通过 `tenantDb.query` 直读 `select id, org_id, key, enabled, payload, ...`），未在 `drizzle/schema.ts` 中声明（B-004 §A 已记入"绕过 Drizzle"的 13 张表之一）。

## 2. Service 公共 API（High）

| 方法 | 签名（节录）| 用途 |
|------|------------|------|
| `list(ctx)` | `Promise<FeatureFlagRow[]>` | 列出本 org 所有 flag（按 key 排序）|
| `get(ctx, key)` | `Promise<FeatureFlagRow \| null>` | 单 key 查询 |
| `resolve(ctx, { key, entityId? })` | `Promise<FeatureFlagResolution>` | **灰度决策**：返回是否开启（结合 rollout 规则与 entityId）|
| `upsert(...)` | flag 写入 + timeline 审计 | 管理后台用 |

依赖注入：`Pool` + `TimelineService`（写入审计） + 内部 `createTenantDb(pool, orgId, userId)`（多租户隔离）。

## 3. 装配（High）

`app.module.ts:67`：`import { FeatureFlagsService }`；`app.module.ts:166`：列入 `providers`。
`app.module.ts` 同时装配 `FeatureFlagsController`（66）→ HTTP `/feature-flags/*` 路由对外暴露 list/resolve/upsert。
未通过 token / Symbol 抽象（与 templates 模块 `TEMPLATES_RESOLVER` Port-Adapter 模式不同）→ **直接类型注入**；耦合面 = 谁 `@Inject(FeatureFlagsService)`。

## 4. 实际运行时消费者（High）—— 仅 1 处生产消费

grep `import { FeatureFlagsService }` + `featureFlagsService.resolve` 后排除测试，仅得：

| 文件 | 调用点 | 标志 key | 行为 |
|------|--------|----------|------|
| `modules/core/customers/customers.controller.ts:21,103,110,111,416` | `assertBmvEnabled(ctx)` 私有方法 | **`"bmv"`**（唯一）| `resolution.enabled` 为 false 时 throw `ForbiddenException("BMV feature is not enabled for this organization")` |

→ 全仓 production-time 仅 **1 个消费者**、**1 个 flag key**（`"bmv"`）；其余命中（5 个 customers 测试 + 1 个 timestamps.bug135-regression.test 仅 import 类型）皆为测试或自身。

`featureFlags.controller.ts:143` 自身在 HTTP 层调用 `service.resolve(ctx, { key, entityId })` 提供前端读取灰度结果的能力，不算业务消费者。

## 5. 横切面广度评估（High）

| 维度 | 量化 | 评估 |
|------|------|------|
| 服务侧消费者 controller 数 | **1**（customers）| **极低**：未达"横切"程度 |
| flag key 数 | **1**（`"bmv"`）| 单 flag |
| 与状态机交互 | `bmv` flag 控制客户的 BMV（基本审查 / Master Verification）入口；S2 状态门槛 | 业务关键但隔离良好 |
| admin / mobile 引用 | **0** / **0** | 客户端无 feature flag 概念；运行时由后端 ForbiddenException 单边阻断 |
| Drizzle 声明 | **缺**（feature_flags 表不在 schema.ts）| 与 B-004 §A 缺口一致 |
| Port-Adapter 抽象 | **无**（直接类型注入）| 与 templates 模块设计不一致 |
| 审计 | upsert 写 timeline | OK |
| 灰度规则 | `shouldEnableFlagByRollout(payload, entityId)` 函数（model.ts）| 含 entityId 哈希 / 百分比 / 白名单类（具体未读，下游 OQ）|

## 6. 与既有 OQ / 风险点交叉

- **OQ-26（Drizzle 缺 13 张表）**：`feature_flags` 表确认在缺口列表内。
- **OQ-27/28（RLS 表覆盖）**：`feature_flags` 是否纳入 RLS / FORCE 列表未在 B-004 矩阵中确认 → 见 OQ-65。
- **B-005/B-007 Port-Adapter 对照**：templates 用 `TEMPLATES_RESOLVER` Symbol 解耦 core ↔ templates；feature-flags 直接类型注入未隐藏实现 → 风格不一致（无即时风险，因消费面极小）。

## 7. 关键缺口（新 OQ）

- **OQ-65** `feature_flags` 表是否启用 RLS / FORCE：影响多租户隔离正确性（如组织 A 误 resolve 到组织 B 的 flag）；当前仅 `tenantDb` GUC 控制，**未在 §B-004 RLS 6 波演进中确认**。
- **OQ-66** flag key 命名 / 注册中心：仅 `"bmv"` 一项实际使用，但 service 接受任意字符串 key；无白名单 / 类型化 keyset → 写错 key 静默失败（resolve 返回 disabled）。
- **OQ-67** `shouldEnableFlagByRollout` 灰度策略未审：百分比 / entityId 哈希 / 白名单语义未在本轮直读，影响 BMV 灰度的实际行为。

## 8. 置信度

| 项 | 置信度 |
|----|--------|
| 模块结构 / 装配位置 / 仅 1 个生产消费者 | High（直读 + grep 全文）|
| 唯一 key 为 `"bmv"` | High（grep `featureFlagsService.resolve` 全仓）|
| Drizzle 缺声明 | High（与 B-004 §A 一致）|
| RLS 是否覆盖 feature_flags | Low（未在矩阵中验证）|
| 灰度策略细节 | Low（未读 model.ts）|
