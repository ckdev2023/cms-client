# BUG-160 Audit — CasesService.create await 点异常清单

> 生成日期：2026-04-30
> 对应文件：`packages/server/src/modules/core/cases/cases.service.ts`

## 概要

`CasesService.create` 从入口到 return 共经过 **2 个同步校验** + **10 个 await 点**（含条件分支）。
下表按执行顺序列出每一处，标注其可能抛出的异常类型，以及在 try/catch 中应被视为 **known**（HttpException 子类，业务层已定义语义）还是 **unknown**（PG 错误或意外运行时异常）。

---

## 同步校验（await 之前）

| # | 调用 | 位置 | 异常类型 | known/unknown |
|---|------|------|----------|---------------|
| S1 | `validateDueAt(input.dueAt)` | L1368 | `BadRequestException("Invalid dueAt date")` | **known** |
| S2 | `validateCaseEnums(input)` | L1369 | `BadRequestException("stage and status must match")`、`BadRequestException("Invalid priority")`、`BadRequestException("Invalid riskLevel")`、`BadRequestException("Invalid resultOutcome")` | **known** |

> S1/S2 在 await 之前同步抛出，不需要 try/catch；但如果最终 try/catch 包裹整个 `create` 方法体，也会被捕获。

---

## Await 点清单

### A1 — `this.resolveChecklistItems(ctx, input.caseTypeCode)` (L1370-1373)

**内部调用**：`this.templatesResolver.resolve(ctx, { kind, key })`

| 异常来源 | 类型 | known/unknown | 说明 |
|----------|------|---------------|------|
| `templatesResolver.resolve` 网络/配置错误 | 任意 `Error` | **unknown** | 模板引擎内部实现决定；可能抛连接错误或 JSON 解析错误 |
| PG 查询失败（若 resolve 内部走 DB） | PG `Error` (code 类似 `42P01` 等) | **unknown** | 表不存在 / 列不存在等 schema 异常 |

> `resolveChecklistItems` 本身是纯映射逻辑，不会主动抛业务异常。风险全部来自 `templatesResolver.resolve` 的底层实现。

---

### A2 — `this.assertCreateRefs(tx, input)` (L1377)

内部包含 4-6 个子 await，逐一列出：

#### A2a — `this.assertBelongsToOrg(tx, "customers", input.customerId)` (L1416)

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| 记录不存在 | `BadRequestException("Referenced customers record not found in current organization")` | **known** |
| PG 查询错误 | PG `Error` | **unknown** |

#### A2b — `this.assertBelongsToOrg(tx, "users", input.ownerUserId)` (L1417)

同 A2a，表名为 `users`。

#### A2c — `this.assertBelongsToOrg(tx, "companies", input.companyId)` (L1421，条件：`input.companyId` 非空)

同 A2a，表名为 `companies`。

#### A2d — `this.assertBelongsToOrg(tx, "users", input.assistantUserId)` (L1424，条件：`input.assistantUserId` 非空)

同 A2a，表名为 `users`。

#### A2e — `this.assertBmvCaseCreationGate(tx, input)` (L1428，条件：`requiresBmvCaseCreationGate(input.caseTypeCode)` 为真)

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| BMV 门禁被阻 | `BadRequestException({ code: CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED, blockers })` | **known** |
| `tx.query` 读取 `customers.base_profile` 失败 | PG `Error` | **unknown** |

> `normalizeObject`、`resolveCustomerBmvProfile`、`checkBmvCaseCreationGate` 均为纯函数，不会自行抛异常。

---

### A3 — `this.resolveCreateGroup(tx, ctx, input)` (L1378-1379)

内部包含两个子 await + 一个同步校验：

#### A3a — `this.resolveCustomerGroupId(tx, input.customerId)` (L1469-1472)

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| PG 查询错误 | PG `Error` | **unknown** |

> 该方法不会主动抛业务异常，未匹配时安全返回 `null`。

#### A3b — `this.resolveExplicitGroupId(tx, ctx.orgId, input.groupId)` (L1473-1477)

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| groupId 无法匹配任何 group | `BadRequestException(CASE_WRITE_ERROR_CODES.GROUP_NOT_FOUND + ": ...")` | **known** |
| PG 查询错误 | PG `Error` | **unknown** |

#### A3c — 同步：跨组缺失 reason

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| `isCrossGroup && !crossGroupReason` | `BadRequestException(CASE_WRITE_ERROR_CODES.CROSS_GROUP_REASON_REQUIRED + ": ...")` | **known** |

---

### A4 — `this.insertCaseWithAutoNumber(tx, ctx, input)` (L1381-1384)

内部包含 `generateCaseNo` + `insertCase`，最多重试 2 次：

#### A4a — `this.generateCaseNo(tx, ctx.orgId)` (L2933 / L2944-2957)

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| `tx.query` 读取 `organizations.settings` 失败 | PG `Error` | **unknown** |
| `tx.query` 统计 `cases.count` 失败 | PG `Error` | **unknown** |

> `resolveCasePrefix` / `formatCaseNo` 为纯函数，不会抛。

#### A4b — `this.insertCase(tx, ctx, input)` (L2908-2925)

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| `returning` 无行 | `BadRequestException("Failed to create case")` | **known** |
| PG FK 违例 (`23503`) | PG `Error` { code: "23503" } | **unknown** — 需映射为 400 |
| PG unique 违例 (`23505`) case_no 冲突 | PG `Error` { code: "23505", constraint: "uq_cases_org_case_no" } | 被 `isCaseNoConflict` 捕获后重试（attempt 0），attempt 1 后重抛 → **unknown** |
| PG unique 违例 (`23505`) 非 case_no 约束 | PG `Error` { code: "23505" } | **unknown** — 需映射为 400 |
| PG check 违例 (`23514`) | PG `Error` { code: "23514" } | **unknown** — 需映射为 400 |
| PG 其他错误（连接断开等） | PG `Error` | **unknown** — 映射为 500 |

#### A4c — 重试耗尽

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| 2 次 case_no 冲突后 fallthrough | `BadRequestException("Failed to create case")` | **known** |

---

### A5 — `this.insertDocumentItems(tx, ctx.orgId, created.id, checklistItems)` (L1385)

逐条 `tx.query` 插入 `document_items`。

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| PG FK 违例 (`23503`): `case_id` 或 `org_id` 不存在 | PG `Error` { code: "23503" } | **unknown** — 理论上不应发生（case 刚创建） |
| PG unique 违例 (`23505`): 同一 case 的 checklist_item_code 重复 | PG `Error` { code: "23505" } | **unknown** — 模板配置错误 |
| PG 其他错误 | PG `Error` | **unknown** |

---

### A6 — `writeTimelineInTx(tx, ctx, { ... })` (L1386-1395)

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| PG 插入 `timeline_logs` 错误（FK / 磁盘满等） | PG `Error` | **unknown** |

---

### A7 — `writeCrossGroupTimeline(tx, ctx, ...)` (L1398-1405，条件：`isCrossGroup`)

内部调用 `writeTimelineInTx`，同 A6。

| 异常来源 | 类型 | known/unknown |
|----------|------|---------------|
| PG 插入 `timeline_logs` 错误 | PG `Error` | **unknown** |

---

## 汇总：异常分类矩阵

### Known（HttpException 子类）— try/catch 应 **re-throw**

| 异常 | 来源 | HTTP 状态码 |
|------|------|-------------|
| `BadRequestException("Invalid dueAt date")` | S1 `validateDueAt` | 400 |
| `BadRequestException("stage and status must match")` | S2 `validateCaseEnums` | 400 |
| `BadRequestException("Invalid priority")` | S2 | 400 |
| `BadRequestException("Invalid riskLevel")` | S2 | 400 |
| `BadRequestException("Invalid resultOutcome")` | S2 | 400 |
| `BadRequestException("Referenced <table> record not found ...")` | A2a-d `assertBelongsToOrg` | 400 |
| `BadRequestException({ code: BMV_GATE_BLOCKED, blockers })` | A2e `assertBmvCaseCreationGate` | 400 |
| `BadRequestException(GROUP_NOT_FOUND + ": ...")` | A3b `resolveExplicitGroupId` | 400 |
| `BadRequestException(CROSS_GROUP_REASON_REQUIRED + ": ...")` | A3c `resolveCreateGroup` | 400 |
| `BadRequestException("Failed to create case")` | A4b `insertCase` (无 returning 行) | 400 |
| `BadRequestException("Failed to create case")` | A4c `insertCaseWithAutoNumber` (重试耗尽) | 400 |

### Unknown — try/catch 应 **映射并记录**

| PG code | 含义 | 建议映射 |
|---------|------|----------|
| `23503` | FK 违例 | `400 CASE_CREATE_FAILED` + `{ source: "pg", constraint, pgCode: "23503" }` |
| `23505` | unique 违例（非 case_no） | `400 CASE_CREATE_FAILED` + `{ source: "pg", constraint, pgCode: "23505" }` |
| `23514` | check 约束违例 | `400 CASE_CREATE_FAILED` + `{ source: "pg", constraint, pgCode: "23514" }` |
| 其他 PG / 非 PG 错误 | 连接断开、磁盘满、未知 | `500 CASE_CREATE_FAILED` + `{ detail: error.message }` + `console.error(stack)` |

---

## try/catch 实现建议

```ts
async create(ctx: RequestContext, input: CaseCreateInput): Promise<Case> {
  try {
    // ... 现有逻辑 ...
  } catch (error) {
    // ① known：HttpException 子类 → 透传
    if (error instanceof HttpException) throw error;

    // ② PG 约束违例 → 400
    const pgCode = (error as { code?: string })?.code;
    const constraint = (error as { constraint?: string })?.constraint;
    if (pgCode === "23503" || pgCode === "23505" || pgCode === "23514") {
      throw new BadRequestException({
        code: CASE_WRITE_ERROR_CODES.CREATE_FAILED,
        detail: { source: "pg", constraint, pgCode },
        message: `Failed to create case: ${constraint ?? pgCode}`,
      });
    }

    // ③ 其他未知 → 500 + log
    // eslint-disable-next-line no-console
    console.error("[CasesService.create] unexpected error:", error);
    throw new InternalServerErrorException({
      code: CASE_WRITE_ERROR_CODES.CREATE_FAILED,
      detail: error instanceof Error ? error.message : String(error),
      message: "Failed to create case",
    });
  }
}
```

---

## 影响范围确认

- `create` 方法外部（Controller `CasesController.create`）目前无 catch，全部依赖 NestJS 全局异常过滤器。现状下未被 `HttpException` 包裹的 PG 错误会被全局过滤器转为 `500 Internal server error`（无 detail），即 BUG-160 现象。
- `update` / `transition` / `softDelete` 有类似风险，但不在本 BUG 范围。
