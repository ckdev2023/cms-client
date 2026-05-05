# 案件类型流程 chrome-devtools-mcp 走查（第十五轮 / R35 案件类型横向走查）

> 生成日期：2026-05-04（在 R34 基础上做"不同案件类型流程是否走通"专项走查）
>
> 命题：使用 chrome-devtools-mcp 自动走查 `http://localhost:5173/#/cases`，验证各案件类型在不同阶段的关键操作、阶段流转、Tab 渲染、校验和收尾是否走通。
>
> 数据集：本地 Local Demo Office / Local Admin / 23 条案件，覆盖 3 类案件类型 × 多个阶段。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click / evaluate_script / list_network_requests / list_console_messages）

---

## 0. 总结

### 0.1 一句话结论

**案件列表上 23 条案件覆盖 3 类案件类型（BMV·认定 4 个月 / BMV·无周期 / 家族滞在），9 个 tab + 阶段流转 modal + 校验 tab + 收尾路径在所有类型上整体能跑通；网络请求 109 条全部 200/304，无 console error。本轮新发现 7 条缺陷（P2 × 1 / P3 × 5 / P4 × 1），主要集中在「类型差异未做条件渲染」「空状态文案缺失」「跨视图标题口径不一致」三类，其中 R35-A（详情页 vs 列表页 标题回退口径不一致）是最显眼的回归。R34 以前列出的 5 条新增缺陷未在本轮再次复测，仅做新缺陷扫描。**

### 0.2 走查样本（8 个代表性案件 × 6 类阶段/阶段-业务对组合）

| 编号 | 案件 ID | 案件类型 | 阶段 / 业务阶段 | 用途 |
|---|---|---|---|---|
| **A** | CASE-202605-0006 R23-AUDIT-TITLE-TEST | BMV·认定 4M | S4 / 审查中 | 文书制作中 + 1 阻断 + 1 沟通 |
| **B** | CASE-202605-0005 R6试探客户 经营管理（认定 4 个月） | BMV·认定 4M | S2 / 等待资料 | 资料收集 + 0 阻断 + 2 沟通 |
| **C** | CASE-202604-0019 R7 BUG-111 retest A (auto) | BMV·认定 4M | S7 / 等待尾款 | K 阶段 + 登记尾款入口 |
| **D** | CASE-202604-0006 Tani Keiei Cert4M Test | BMV（无 4M 后缀） | S1 / 咨询中 | 类型对比基线 |
| **E** | CASE-202604-0005 R5 reminder probe | 家族滞在 | S1 / 咨询中 | 类型对比基线 |
| **F** | CASE-202604-0004 R5 stage probe | 家族滞在 | S4 / 审查中 | 类型对比 + COE 卡片 |
| **G** | CASE-202604-0010 R6 phase e2e probe | BMV·认定 4M | S8 / 成功 | 成功收尾 + 待收 ¥50,000 |
| **H** | CASE-202604-0016 BUG-117 CLOSED_FAILED | BMV·认定 4M | S9 / 失败归档 | 终态只读不变量 |

### 0.3 三类案件类型表现矩阵

| 维度 | BMV·认定 4M (A/B/C/G/H) | BMV 无周期 (D) | 家族滞在 (E/F) |
|---|---|---|---|
| 9-tab 渲染 | ✅ | ✅ | ✅ |
| 业务阶段 popover | ✅ 类型相关 | ✅ | ✅ 简化路径 |
| 校验 tab 顶部状态 | ✅ | ✅ | ✅ |
| 校验 tab COE 卡片 | ✅（业务相关） | ✅（业务相关） | ⚠ R35-D 不应展示 |
| 概览 sidebar 风险 | ⚠ R35-B 0-blocking 缺标题 | ⚠ R35-B | ⚠ R35-B |
| 概览 timeline 翻译 | ✅（部分 raw） | ✅ | ⚠ R35-C raw event |
| S9 只读不变量 | ✅ R34 已确认 | n/a | n/a |
| K 阶段 登记尾款 | ✅ | n/a | n/a |
| 成功收尾门禁 | ⚠ R35-E unpaid 未阻 | n/a | n/a |
| 详情 heading 标题 | ✅ caseName 有值 | ⚠ R35-A 退到 caseNo | ✅ |

✅ = pass / ⚠ = 本轮新发现缺陷 / n/a = 类型不适用

### 0.4 R35 缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P2** | 1 | 标题回退口径详情/列表不一致（R35-A） |
| **P3** | 5 | 空状态/类型条件渲染/收尾门禁（R35-B/C/D/E/G） |
| **P4** | 1 | 终态 timeline 跨字段顺序异常（R35-F） |

### 0.5 体系性问题（编译式沉淀）

1. **同一字段在 list / detail 两层做了不同的"兜底"**
   - List 行用 `buildFallbackName(applicant, typeLabel, caseNo, id)` 拼合成名
   - Detail header 用 `caseName || caseNo || id`
   - 两边都对"未命名案件"做兜底，但兜底口径不同 → 跨页跳转后用户看到的标题对不上
   - **建议**：`buildFallbackName` 抽到 `shared/model/caseTitle.ts`，list 行与 detail adapter 共用，并补一条契约测试

2. **adapter 在"零状态"下输出空字符串而不是 i18n key**
   - `buildRiskBlock` 在 `blockingCount === 0` / `latestValidation === null` / 未配 deadline 时直接给空字符串，sidebar 渲染时只看到一个孤立的 "0" 或空白行
   - **建议**：所有"语义占位"改成 `LocalizableText`（key + params），零态对应 `cases.detail.overview.risk.noBlocking` 等

3. **类型相关 UI 没有按 `caseTypeCode` 条件渲染**
   - 校验 tab 的 "COE / 海外贴签 / 返签结果" section 在所有类型上都展示
   - 概览 timeline 的事件白名单未按类型扩充（家族滞在的 `residence_period.created` 漏翻译）
   - **建议**：在 `useCaseDetailViewModel` 里挂一个 `caseTypeFlowProfile`（含 `hasCoeFlow`、`hasFinalPaymentGate`、`hasSurveyQuote` 等开关），所有类型相关 UI 通过这个 profile 决定显示

4. **状态流转 popover 缺少前端 guard**
   - BMV S8 → 在留期间已登记 在 unpaid > 0 且无 billingRiskAck 时仍可点
   - **建议**：popover 选项应跟 `derivedClosingGuards`（来自 adapter）联动，guard 失败时禁用并给原因

---

## 1. R35 P2 缺陷详细

### 1.1 R35-A [P2]：案件详情 heading 与列表行兜底口径不一致

**触发**：进入 `/#/cases` → 点击 `CASE-202604-0006`（"Tani Keiei Cert4M Test · 经营管理签"）→ 详情页 heading 退化为 `CASE-202604-0006`。

**列表行 snapshot（zh-CN）**：

```
link "Tani Keiei Cert4M Test · 经营管理签" url="...#/cases/d07a61d1-..."
StaticText "Tani Keiei Cert4M Test · 经营管理签"
```

**详情页 heading snapshot（zh-CN）**：

```
heading "CASE-202604-0006" level="1"
StaticText "S1 · 刚开始办案"
```

**详情页 heading snapshot（en-US，切换语言后）**：

```
heading "CASE-202604-0006" level="1"
StaticText "S1 · Case opened"
```

**根因（已对源码核对）**：

- 列表：`packages/admin/src/views/cases/components/CaseTableRow.vue:82-94`
  ```ts
  function buildFallbackName(applicant, typeLabel, caseNo, id) {
    const app = applicant?.trim();
    const label = typeLabel !== "—" ? typeLabel : "";
    if (app && label) return `${app} · ${label}`;
    if (app) return app;
    if (label) return label;
    return caseNo || id;
  }
  ```
  当 `name === caseNo` 时，使用 `applicant + typeLabel` 兜底。
- 详情：`packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:271-275`
  ```ts
  function resolveTitle(caseRecord, id) {
    return readString(caseRecord, "caseName")
        || readString(caseRecord, "caseNo")
        || id;
  }
  ```
  没有 `applicant + typeLabel` 兜底。

**影响**：

- 用户在列表看到 `Tani Keiei Cert4M Test · 经营管理签`，点进详情看到 `CASE-202604-0006`，会以为打开错了案件
- 三个 locale 都受影响

**修复方向**：

- 把 `buildFallbackName` 抽到 `packages/admin/src/views/cases/model/caseTitleFallback.ts`（或 `shared/model/`），导出共用函数
- `CaseAdapterDetailAggregate` 也调用同一函数：
  ```ts
  function resolveTitle(caseRecord, deepLink, typeLabel, id) {
    const explicit = readString(caseRecord, "caseName");
    if (explicit) return explicit;
    return buildFallbackName(
      readString(deepLink, "customerName"),
      typeLabel,
      readString(caseRecord, "caseNo"),
      id,
    );
  }
  ```
- 补 1 条契约测试：`buildFallbackName` 与 detail header 共用，且 detail/list 在同一案件上输出相同 title

**位置**：

- `packages/admin/src/views/cases/components/CaseTableRow.vue:82-100`
- `packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:271-275`
- 测试：`CaseAdapterDetailAggregate.overview-info-focused.test.ts`（contract）+ `CaseTableRow.test.ts`（如已存在）

---

## 2. R35 P3 缺陷详细

### 2.1 R35-B [P3]：概览 sidebar "阻断与风险摘要" 在零态下只剩一个孤立 "0"

**触发**：任意 0-blocking 案件（B/D/E/G/H 等）→ 「概览」tab → 右侧「阻断与风险摘要」卡片。

**零态 snapshot（zh-CN，案件 E：家族滞在 S1）**：

```
StaticText "阻断与风险摘要"
StaticText "0"        ← ❌ 孤立 "0"，没有 label
StaticText "无"       ← arrears 行
（缺 deadline 行 — 整个 row 渲染但无 text）
（缺 lastValidation 行 — 整个 row 渲染但无 text）
heading "案件团队"
```

**对比有阻断时的 snapshot（案件 A：BMV·4M S4）**：

```
StaticText "阻断与风险摘要"
StaticText "1"
StaticText "1 项阻断"  ← 有 label
StaticText "有"
StaticText "¥200,000"
StaticText "未通过"
```

**根因（已核对源码）**：

`packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:128-153`
```ts
function buildRiskBlock(blockingCount, unpaidAmount, latestValidation, latestReview) {
  const vs = latestValidation ? readString(latestValidation, "status") : "";
  const bKey = "cases.detail.overview.risk.blockingDetail";
  return {
    blockingCount: blockingCount > 0 ? String(blockingCount) : "0",
    blockingDetailLoc:
      blockingCount > 0 ? { key: bKey, params: { count: blockingCount } } : undefined,
    arrearsStatus: unpaidAmount > 0 ? "cases.detail.arrearsYes" : "cases.detail.arrearsNo",
    arrearsDetail: unpaidAmount > 0 ? `¥${unpaidAmount.toLocaleString()}` : "",
    deadlineAlert: "",                  // ❌ 永远 ""
    deadlineAlertDetail: "",            // ❌ 永远 ""
    lastValidation: "",
    lastValidationLoc: vs ? { key: ... } : undefined,
    reviewStatus: latestReview ? readString(latestReview, "decision") : "",
  };
}
```

且 `CaseOverviewSidebar.vue` 模板里没有 `v-if`，只要数据存在就把"标题 + detail"两行渲染出来，detail 为空时只是空白节点；title 为空时 row 被压缩成单个 "0"。

**影响**：

- sidebar 视觉上有"塌陷"的孤立数字与空白行
- 屏幕阅读器朗读出"零、（停顿）、无"等无意义片段
- 三 locale 都受影响

**修复方向（同源 R34-A）**：

- 给 `risk` 字段全部走 `LocalizableText | undefined` 路径：
  ```ts
  blockingCount: blockingCount > 0 ? String(blockingCount) : "0",
  blockingDetailLoc:
    blockingCount > 0
      ? { key: "cases.detail.overview.risk.blockingDetail", params: { count: blockingCount } }
      : { key: "cases.detail.overview.risk.noBlocking" },
  deadlineAlertLoc: dueAt
    ? deadlineDangerLocText(dueAt)
    : { key: "cases.detail.overview.risk.noDeadline" },
  lastValidationLoc: vs
    ? { key: `cases.detail.overview.risk.lastValidation.${vs}` }
    : { key: "cases.detail.overview.risk.notValidated" },
  ```
- 增加 i18n key：`noBlocking / noDeadline / notValidated`
- `CaseOverviewSidebar.vue` 加 `v-if="detail.risk.blockingDetailLoc"` 等显式 guard，避免空 row

**位置**：

- `packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:128-153`
- `packages/admin/src/views/cases/components/CaseOverviewSidebar.vue:48-119`
- i18n：`packages/admin/src/i18n/messages/cases/{zh-CN,en-US,ja-JP}.ts`

---

### 2.2 R35-C [P3]：概览 timeline 出现 raw event 类型未翻译

**触发**：

- 案件 E（家族滞在 S1）：timeline 第一条 `residence_period.created`（raw event 字面）
- 案件 F（家族滞在 S4）：timeline 中 `case.transitioned`（raw event 字面，但同一 timeline 别处又被翻译为 "阶段变更：S3 → S4"）
- 案件 C（BMV S7）：timeline 全部翻译为 "业务阶段变更：…"，对照来看是部分事件类型缺映射

**家族滞在 S1 snapshot**：

```
StaticText "residence_period.created"     ← ❌ raw key
StaticText "2026/04/29 11:36"
StaticText "案件创建：家族滞在"
StaticText "2026/04/29 11:36"
```

**家族滞在 S4 snapshot**：

```
StaticText "阶段变更：S3 → S4"
StaticText "2026/05/04 14:17"
StaticText "case.transitioned"           ← ❌ raw key（同一类型在前一行已被翻译）
StaticText "2026/05/04 14:17"
```

**根因（推断）**：`CaseTimelineTextResolver` 对部分事件类型 / 部分 payload shape 没有命中翻译分支，回退为 raw `eventType`。怀疑是 `payloadSnapshot` 缺字段时的 fallback 路径漏写。

**修复方向**：

- 给 `CaseTimelineTextResolver.resolveTimelineText` 加严格白名单 + 兜底 i18n key：
  ```ts
  if (!matched) return t("timeline.events." + eventType, params, eventType);
  ```
- 在三 locale messages 补全 `timeline.events.residence_period.created` 等
- 补单测：`CaseTimelineTextResolver.test.ts` 覆盖 `case.transitioned / residence_period.created / validation_run.executed` 等

**位置**：

- `packages/admin/src/views/cases/model/CaseTimelineTextResolver.ts`
- `packages/admin/src/i18n/messages/cases/{zh-CN,en-US,ja-JP}.ts:timeline.events.*`

---

### 2.3 R35-D [P3]：家族滞在仍展示 "COE / 海外贴签 / 返签结果" 卡片

**触发**：进入家族滞在案件（E、F）→ 「提交前检查」tab → 滚到底部。

**snapshot（家族滞在 S4）**：

```
heading "COE / 海外贴签 / 返签结果"
StaticText "当前案件未到该阶段"
StaticText "当前案件还在提交前或补正处理阶段，因此这里暂不展示 COE 发送、海外贴签和返签结果。切换到相应样例后可查看完整流程。"
```

**问题**：

- COE / 海外贴签 / 返签 是 BMV·认定（在留资格认定）的 K → S8 流程的一部分
- 家族滞在的更新（在留期间更新）不走 COE 流程；展示这块卡片对家族滞在没有意义且产生误导
- 文案说"切换到相应样例后可查看"，但实际上**对家族滞在永远不会有 COE 内容**

**修复方向**：

- `CaseValidationTab.vue` 里 COE section 增加 `v-if="detail.flowProfile.hasCoeFlow"` guard
- 在 `useCaseDetailViewModel` 添加 `flowProfile` 计算属性：
  ```ts
  const flowProfile = computed(() => ({
    hasCoeFlow: detail.value.caseTypeCode?.includes("cert"),
    hasFinalPaymentGate: BMV_TYPES.includes(detail.value.caseTypeCode),
    hasSurveyQuote: ...,
  }));
  ```

**位置**：

- `packages/admin/src/views/cases/components/CaseValidationTab.vue`（或类似）
- `packages/admin/src/views/cases/model/useCaseDetailViewModel.ts`

---

### 2.4 R35-E [P3]：BMV S8 成功 → S9 转换未做欠款门禁

**触发**：

- 案件 G（CASE-202604-0010 BMV·4M S8 成功，待收 ¥50,000，无 billingRiskAck）
- 点击 「状态流转」按钮 → popover 出现 1 个选项 "成功 → 在留期间已登记"
- 点击该选项 → "确认流转" 按钮**变为可点**（无任何警告）

**popover snapshot**：

```
dialog "业务阶段流转" modal
  StaticText "当前：成功"
  listbox
    option "成功 → 在留期间已登记" focusable focused selectable selected
  contentinfo
    button "取消"
    button "确认流转"   ← ❌ 在 unpaid > 0 且无 billingRiskAck 时仍可点
```

**业务规则（来自 P0 / P1 文档）**：成功收尾必须满足 `(unpaidAmount === 0) || (billingRiskAcknowledged === true)`。

**问题**：

- 前端 popover 没做 guard。后端 service 层可能会拒绝这个转换（已有 `requiresSuccessCloseoutCheck` 的测试见 `cases.success-closeout-gate.focused.test.ts`），但前端 UI 应该提前阻止
- 现状：用户点确认 → 后端 4xx → 前端不知道为什么失败（除非 i18n 错误码到位）

**修复方向**：

- 在 `useCasePhaseTransitionMenu` 里挂 `disabled` + `disabledReason`：
  ```ts
  const successCloseoutBlocked = computed(() =>
    detail.value.stageCode === "S8"
      && detail.value.businessPhase === "VISA_GRANTED"
      && detail.value.billing.outstandingNumeric > 0
      && !detail.value.risk.billingRiskAck
  );
  ```
- popover option 设 `disabled` + tooltip："存在 ¥X 未收余款且未登记欠款风险确认"
- 引导用户去「提交前检查 tab → 登记欠款风险确认」或「收费 tab 登记尾款」

**位置**：

- `packages/admin/src/views/cases/model/useCasePhaseTransitionMenu.ts`
- `packages/admin/src/views/cases/components/PhaseTransitionPopover.vue`
- 测试：`useCaseDetailWriteActions.coe-residence-reminder.transition-model.focused.test.ts`（已有 BMV transition 测试，可在此扩充）

---

### 2.5 R35-G [P3]：S7 等待尾款 但 unpaid=0 时仍提示"需先添加待收费记录"

**触发**：

- 案件 C（CASE-202604-0019 BMV·4M S7 等待尾款）→ 「概览」tab → 「财务状况」card

**snapshot（zh-CN）**：

```
StaticText "财务状况"
StaticText "—"
StaticText "需先在收费 Tab 添加至少一条待收费记录，再推进到待缴费阶段"   ← ❌ 该案已经在 S7
```

**问题**：

- 该案件 stage = S7 等待尾款，已经过了"添加待收费记录推进到待缴费"这个节点
- 文案是 S3/S4 阶段的引导，不该在 S7 还出现
- 实际数据：billingTotal = 0，unpaidAmount = 0（quote 未做但已经走到 S7 — 这本身可能是测试数据异常，但 UI 不该回退到 S3/S4 文案）

**根因**：

`CaseOverviewTab.vue` 中 `isNoBillingRecordWarning` 只看 `stage === "S3" || stage === "S4"`：

```ts
const isNoBillingRecordWarning = computed(() => {
  const stage = props.detail.stageCode;
  return (
    (stage === "S3" || stage === "S4") &&
    props.detail.billing.payments.length === 0
  );
});
```

但是上面这个 case 的 stage = S7，这条不应触发。然而 snapshot 中**确实显示了警告文本**，说明触发了**另一条**类似规则。怀疑是 `isWaitingPaymentNoBilling`（等待尾款且无回款）：

```ts
const isWaitingPaymentNoBilling = computed(
  () =>
    props.detail.businessPhase === "WAITING_PAYMENT" &&
    props.detail.billing.payments.length === 0,
);
```

文案是同一段中文，但语义不该一样。

**修复方向**：

- 区分两个 warning 的文案：
  - S3/S4 + 无 billing：`"需先在收费 Tab 添加至少一条待收费记录"`
  - S7 等待尾款 + 无 payment：`"该案已进入待尾款阶段，但尚未登记任何回款。请到收费 Tab 登记尾款"`
- 抽 i18n key：`overview.billing.warning.s3s4NoBilling` / `overview.billing.warning.waitingPaymentNoCollection`

**位置**：

- `packages/admin/src/views/cases/components/CaseOverviewTab.vue:45-57`
- i18n：`packages/admin/src/i18n/messages/cases/*`

---

## 3. R35 P4 缺陷详细

### 3.1 R35-F [P4]：失败归档 case timeline 出现 "S1 → S9" 与业务阶段轨迹冲突

**触发**：案件 H（CASE-202604-0016 BUG-117 CLOSED_FAILED）→ 「概览」tab → 「近期动态」。

**snapshot（zh-CN）**：

```
StaticText "阶段变更：S1 → S9"                     ← ❌ 突兀的跳跃
StaticText "2026/05/04 14:23"
StaticText "业务阶段变更：已拒否 → 失败归档"
StaticText "2026/04/29 22:00"
StaticText "业务阶段变更：审查中（入管） → 已拒否"
StaticText "2026/04/29 22:00"
StaticText "业务阶段变更：申请中 → 审查中（入管）"
StaticText "2026/04/29 22:00"
StaticText "业务阶段变更：审查中 → 申请中"
StaticText "2026/04/29 22:00"
```

**问题**：

- 业务阶段轨迹完整（审查中 → 申请中 → 审查中（入管） → 已拒否 → 失败归档），意味着此案件已经实际进入 S6/S7
- 但**业务阶段（stage）轨迹**只有一条 `S1 → S9`，且时间戳晚 5 天
- 推测：是后端一次性把 stage 从 S1 同步到 S9（可能是修复/测试脚本回灌），而 business_phase 是历史正常累加的
- timeline 把这两条事件混在一起按时间顺序展示，用户难以理解

**修复方向**：

- timeline 渲染时把 stage 与 business_phase 当作两条**独立轨道**展示，或在 stage 跳跃时加注解："（数据修复）"
- 或者 server 在处理 stage 同步时不写 timeline 事件（仅 audit log）

**位置**：

- `packages/server/src/modules/core/timeline/`（来源）
- `packages/admin/src/views/cases/components/CaseRecentTimeline.vue`（渲染）

---

## 4. 已确认 PASS 的关键流程（本轮新增确认 / 不与 R34 重复）

| 流程 | 验证 | 备注 |
|---|---|---|
| 案件列表 23 条 + 6 类 filter（沿用 R34） | ✅ | 我的案件 17 + 全所共 23 |
| 案件类型 column 显示一致（BMV·认定 4M / BMV / 家族滞在） | ✅ | 列表行 typeLabel 来自 `cases.constants.caseTypes.*` |
| 9-tab 渲染（所有类型 / 所有阶段） | ✅ | 概览 / 提交前检查 / 资料清单 X/Y / 任务 / 基础信息 / 文书 / 期限 / 收费 / 沟通记录 / 日志 |
| Tab badge：当 count > 0 时显示数字（卡点 1 / 沟通记录 2） | ✅ | 沿用 R33-C 修复 |
| 状态流转 popover：BMV S4 → 申请中 / 失败归档 | ✅ | 类型相关合法转换 |
| 状态流转 popover：BMV S7 → 在留已发送 / 失败归档 | ✅ | K 阶段后续 |
| 状态流转 popover：BMV S8 → 在留期间已登记 | ✅ | 终态前 |
| 状态流转 popover：家族滞在 S1 → 已签约 / 失败归档 | ✅ | 简化路径 |
| S9 已归档：编辑/状态流转/8 个 tab 全 disabled，剩 概览 + 日志 | ✅ | 终态只读不变量 |
| S9 已归档：banner "全字段只读" | ✅ |
| S9 已归档：「下一关键动作」改为 "查看关闭原因" + "处理退款（建设中）" | ✅ |
| 校验 tab：1 阻断时显示 "1 项阻断未处理" + 描述 | ✅ R33-A |
| 校验 tab：通过时显示 "校验通过，无阻断项" | ✅ |
| 校验 tab：S8 时 COE section 显示 "下签后流程已完成…" | ✅（BMV）/ ⚠（家族滞在见 R35-D） |
| K 阶段（S7）「登记尾款」按钮可点 | ✅ |
| 网络请求 109 条 fetch 全部 200/304 | ✅ | 无 5xx/4xx |
| Console error 0 | ✅ |
| 三语言切换 zh-CN / en-US / ja-JP | ✅ | 详情 heading、breadcrumb、tab 名都跟随；R35-A 在三 locale 一致重现 |

---

## 5. 工程改进建议（编译式回灌）

1. **抽出 `caseTitleFallback` 共享函数**
   - 让 list 与 detail 兜底口径完全一致；契约测试覆盖

2. **`CaseAdapterDetailAggregate.buildRiskBlock` 全面 LocalizableText 化**
   - 与 R34-A/B/C 修复同源，本轮 R35-B 再次暴露相同问题
   - 建议在一个 PR 内一次性把 `risk.*` / `validationHint` / `deadlineMeta` 等统一改为 `LocalizableText`

3. **引入 `caseTypeFlowProfile`**
   - 集中管理"是否走 COE / 是否有尾款门禁 / 是否有问卷与估价"等开关
   - 校验 tab、概览右侧 sidebar、状态流转 popover 都按 profile 决定显示

4. **状态流转 popover 与 adapter 派生 guard 联动**
   - 把 R35-E 的成功收尾欠款门禁、以及未来更多 guard（如 K → S8 必须有 COE 收件、S6 必须有提交包等）从 adapter 输出 `derivedTransitionGuards`，popover 直接读

5. **timeline 事件白名单 + 双轨道渲染**
   - i18n 兜底 `timeline.events.<key>` 找不到时显示 raw key 但加一条警告日志（dev only）
   - stage 与 business_phase 在 UI 上分两条 swimlane 展示，避免 R35-F 跨字段混乱

---

## 6. 下一步行动

按 P 等级分批：

1. **R35-A（P2）**：1 个 PR — 抽 `buildFallbackName` 到共享，detail header 改用同一函数；补契约测试
2. **R35-B（P3，与 R34-A/B/C 同源）**：合并到 R34 收口 PR — `risk.*` 全面 LocalizableText 化
3. **R35-D（P3）**：1 个 PR — 引入 `caseTypeFlowProfile`，COE section 加 guard
4. **R35-E（P3）**：1 个 PR — popover 与 derived guards 联动，BMV 成功收尾欠款门禁
5. **R35-C / R35-G（P3）**：可合并 1 个 PR — timeline 事件白名单 + S7 财务文案分流
6. **R35-F（P4）**：作为「数据健康度」改进项进入 P1 backlog；优先补 server 端不在 stage 同步时写事件

---

**报告生成完毕。3 类案件类型 × 6 类阶段-业务对组合覆盖完成；流程整体走通，新发现 7 条缺陷集中在"类型条件渲染缺失 / 兜底口径不一致 / 收尾门禁前端未阻"三类。建议 R36 先把 R35-A（标题）和 R35-E（成功收尾门禁）作为最高优先级修复。**
