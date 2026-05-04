# 案件详情 chrome-devtools-mcp 深度审计 Bug 清单（第十轮 / R31）

> 生成日期：2026-05-04（R30 报告后首次真浏览器复测 / R31）
>
> 命题：
> - R30 共标注 13 条新缺陷（含 2 条 P0 / 4 条 P1 / 5 条 P2 / 2 条 P3）。本轮在 localhost:5173 真浏览器（Chrome DevTools MCP）逐条复测。
> - 同时挖掘新缺陷，按 P1 / P2 / P3 排序。
>
> 复测覆盖样本：
> - CASE-202605-0006 (S1 / phase=咨询中, due_at=2026-12-31)
> - CASE-202604-0018 (status=S1 / stage=S7, post_approval_stage=awaiting_final_payment)
> - CASE-202604-0007 (status=S1 / stage=S9, close_reason 已写入)
> - CASE-202604-0001 / 0002 (status=S9 / stage=S9, 双层状态一致)
> - locale：zh-CN / en-US / ja-JP
>
> 数据库基线：`schema_migrations` 已含 041～046（R30-H 报告所缺的 041～044 已全部应用，并新增 045/046 进一步修正）。

---

## 0. 总结

### 0.1 一句话结论

**R30 13 条缺陷在 R31 全部 LANDED；其中 12 条真生效、1 条（R30-F）部分生效。本轮新发现 11 条缺陷（P1 × 2、P2 × 3、P3 × 4、业务/状态机一致性 × 2）。** R30 P0 两条（R30-A 概览 timeline、R30-H DB migration drift）经真浏览器+ DB 双向验证已闭环，工程纪律明显改善。

### 0.2 R30 LANDED 复测结果

| R30 BUG ID | 等级 | R31 真浏览器复测 | 备注 |
|---|---|---|---|
| **R30-A** 概览 timeline 渲染 | **P0** | ✅ 真生效 | `CaseOverviewTab` 显示 "文书生成：…"、"业务阶段变更：已批准 → 等待尾款" 等 i18n 文案 + "2026/05/03 12:49" 本地化时间 |
| **R30-H** dev DB migration 041～046 | **P0** | ✅ 真生效 | `schema_migrations` 含 041～046；POST `/api/reminders` 201；deadline 写入并实时显示 "剩余 225 日" |
| R30-F 任务 avatar UUID 漏光 | P1 | ⚠️ 部分生效 | 改读 `assigneeName.charAt(0)`，UUID 不再漏光。但 `<span title>` 仍是单字母 "L"，hover 看不到全名（详见 R31-C） |
| R30-G 日期输入年份溢出 | P1 | ✅ 真生效 | `<input type="date">` 加了 `max="9999-12-31"`，注入 8 位数字不再产生 6 位年份 |
| R30-J 沟通记录 channelType=other | P1 | ✅ 真生效 | 新写入 `channel_type='internal_note'/'client_note'` 等；timeline / log tab 显示 "沟通记录追加：内部记录"。旧 `'other'` 数据保留为 legacy |
| R30-K 编辑 modal 日期未回填 | P1 | ✅ 真生效 | CASE-202605-0006 dueAt="2026-12-31" 正确预填。注：riskLevel 仍未回显，但根因是 R31-A（选项命名空间错位），与 R30-K 无关 |
| R30-D 手动添加资料项 modal a11y | P2 | ✅ 真生效 | `aria-modal="true"` + `aria-labelledby="adim-title"` + close `aria-label="关闭"` |
| R30-E 手动添加资料项 modal Escape | P2 | ✅ 真生效 | Escape 关闭 modal |
| R30-L 阶段流转 popover a11y / 键盘 | P2 | ✅ 真生效 | 容器 `role="dialog"` + `aria-modal=true` + `aria-labelledby="phase-popover-title"`；选项变 `<option role="option" tabindex="0">`，键盘可达 |
| R30-N 关闭原因 modal 数据显示 | P2 | ✅ 真生效 | CASE-202604-0007 显示 "归档时间：2026/5/2" + "操作人：Local Admin" + "失败结案详情" 备注（注：日期格式见 R31-D） |
| R30-M Modal X 按钮 aria-label | P3 | ✅ 真生效 | 抽样四个 modal（添加资料、编辑案件、添加期限、阶段流转），close `<button>` 全部带 `aria-label`，屏幕阅读器可识别 |
| R30-O migration 044 dead code | P3 | ✅ 真生效 | 045/046 已 drop 044 加入的列；customers 多语言现走 `base_profile.name_cn/jp/en` JSON |
| R30-P S7 validation 文案矛盾 | P3 | ✅ 真生效 | en-US locale CASE-202604-0018 仅显示 "The case has been approved. COE will be dispatched after final payment is cleared."，"Case has not reached this stage" 已被覆盖 |

**统计**：
- ✅ 真生效：12 条（含 R30-A、R30-H 两个 P0）
- ⚠️ 部分生效：1 条（R30-F）
- ❌ 完全未生效：0 条

### 0.3 R31 新发现缺陷（共 11 条）

| BUG ID | 等级 | 一句话描述 | 影响 |
|---|---|---|---|
| **R31-A** | **P1** | 编辑案件信息 modal 的 `<select name="riskLevel">` options 是 `normal/attention/high`，DB 默认 `risk_level='low'` → 选项命名空间不匹配，回填空、保存可能改写为空 | 高频字段误改 |
| **R31-J** | **P1** | 案件详情 收费 tab 的「登记回款」`<button>` 跳 `/billing?case=…` 但 `BillingListView` 不读 `route.query.case`，跳转后既不打开 modal、也不按案件过滤 | 关键操作链路断裂 |
| **R31-B** | **P2** | server `caseParties.service.ts:181-184` emit `case_party.created` payload 不带 `partyName`；admin timeline / log 显示 "添加关联人："（冒号后空白） | 关联人创建无可读名称 |
| **R31-F** | **P2** | `CaseFormsTab.vue:172` 的 `<button>「版本历史」` 没有 `@click` handler，纯死按钮 | 文书版本管理入口缺失 |
| **R31-G** | **P2** | `caseDocumentStats.ts:88, 96` 硬编码中文 "无必需资料" / `${} / ${} 完成`，绕开 i18n；en-US locale 下出现 "0 / 1 完成" 中文漏出 | 多语言一致性破窗 |
| R31-C | P3 | task avatar `<span title="L">` 仅单字母，无完整姓名 tooltip；R30-F 只修了底层 UUID 漏光，渲染层 hover 提示仍是字母 | 体验降级 |
| R31-D | P3 | 关闭原因 modal "归档时间：2026/5/2" 缺前导零，与同页 timeline "2026/05/02" 格式不一致 | 时间格式破窗 |
| R31-E | P3 | 任务创建 modal `<select name="assigneeUserId">` 的占位项文案 "Enter user ID or name" 误导（看起来像 text input 提示，实际是 select 占位） | UX 文案 |
| R31-K | P3 | 概览「财务状况」tile 在 CASE-202604-0018 (S7) 显示 `—` + 警告 "需先在收费 Tab 添加至少一条待收费记录"，但案件已到 S7 已提交 — 业务上 S7 必须有 billing | 状态/数据一致性 |
| R31-L | 业务一致性 | 双层状态机偏移：很多案件 `status='S1'` 但 `stage='S7'/'S9'`（CASE-202604-0007/0011/0016/0018 等）；部分案件 stage=S9 但 `archived_at=NULL` | 状态机数据漂移 |
| R31-M | 业务一致性 | 沟通记录 channelType 命名空间扩展后，过滤面板有 `自动邮件 / auto_email`，但创建记录的下拉只有 4 个值，无法手动产生 `auto_email` 类记录 — 滤镜与可写命名空间不一致 | 命名空间不匹配 |

---

## 1. P1 缺陷详细

### 1.1 R31-A：编辑案件信息 modal 的 riskLevel 选项不匹配 DB 命名空间（P1）

**真浏览器观测**：

CASE-202605-0006、CASE-202604-0018 等多案件，DB 写入 `risk_level='low'`，但点击「编辑信息」后：
```js
// modal 表单字段实测
[
  ...,
  { tag: "SELECT", name: "riskLevel", value: "" },     // ← 期望 "low"，实际空
  ...
]
```

i18n 选项文案（`zh-CN.ts:259-263`）：
```ts
riskOptions: { normal: "正常", attention: "需关注", high: "高风险" }
```

模板（`CaseEditModal.vue:259-270`）：
```vue
<select :value="localRiskLevel" ...>
  <option value="">--</option>
  <option value="normal">{{ t("...riskOptions.normal") }}</option>
  <option value="attention">{{ t("...riskOptions.attention") }}</option>
  <option value="high">{{ t("...riskOptions.high") }}</option>
</select>
```

**根因**：

DB 命名空间是 `low / medium / high / critical`（`cases.risk_level` text 列默认 `'low'`，FE adapter `CaseAdapterShared.ts:165-167` 也按此分组），但 modal options 是 `normal / attention / high`。两个命名空间没有 `low ↔ normal` 的桥接。

后果：
1. `riskLevel="low"` 的案件打开 modal → `<select>.value` 找不到 option 匹配，落到空 `<option value="">--</option>`。
2. 用户保存（即使没有动这个字段），`handleSave` 会把 `riskLevel: ""` 透传给写接口。
3. 写接口 `omits empty-string optional non-null fields` 测试用例（`CaseAdapterWriteBuilders.update.test.ts:380`）保护了"不下发"，但**这只是 PATCH 行为，并未修复显示**。

**修复建议**（最小改动）：

1. 在 `riskOptions` 中补 `low: "正常"`（zh-CN）/ `"Normal"`（en-US）/ `"通常"`（ja-JP），把 DB 命名空间作为权威；或
2. 在 `CaseAdapterDetailAggregate.ts:339` 处对 `riskLevel='low'` 做规范化映射 → `'normal'`（保持与 modal 一致），但需同步修正写接口；或
3. 把 `riskLevel='low'` 的 deep-link 数据折算成 `localRiskLevel.value = 'normal'`（最稳，但模糊掉了语义层级）。

补单测：`CaseEditModal.test.ts` 加 `props.riskLevel='low'` 的快照断言。

**优先级**：P1。每一次「编辑信息」都会触发，被覆盖案件数 100%（dev 库 25/25 都是 `low`）。

---

### 1.2 R31-J：案件详情 收费 tab「登记回款」跳转后丢失案件上下文（P1）

**真浏览器观测**：

CASE-202604-0018 收费 tab → 点「登记回款」`<button>`：
- URL 跳到 `http://localhost:5173/#/billing?case=9854ce6c-71f1-448f-9e1b-25ebb934d760`
- BillingListView 渲染 7 条全部数据，**无任何案件过滤**
- 搜索框为空，未自动填入 caseNo

**根因**：

`CaseDetailView.vue:263-265`：
```ts
function onOpenCollection(): void {
  router.push({ path: "/billing", query: { case: caseId.value } });
}
```

但 `packages/admin/src/views/billing/BillingListView.vue` 既无 `useRoute()` 也无 `route.query.case` 引用（`grep` 在 `views/billing/` 目录下完全无匹配）。

**修复建议**：

短期最小修复（任选其一）：
1. 在 `BillingListView.vue` 顶层 `useRoute().query.case` → 自动设置 search 或行内打开 `BillingCollectionDrawer`。
2. 直接在案件详情 inline 打开 `BillingCollectionDrawer`（不跳页），保留案件上下文。

中期：把「登记回款」从案件 tab 移到统一的 case-context drawer，避免上下文跳出。

**优先级**：P1。这是收费链路核心入口。S7 案件最常被 PM/HR 当作「下一关键动作」点这个按钮。

---

## 2. P2 缺陷详细

### 2.1 R31-B：case_party.created 事件 payload 缺 partyName（P2）

**真浏览器观测**：

CASE-202605-0006 概览 timeline 与日志 tab 同时显示：
```
文本：添加关联人：
时间：2026/05/02 20:36
```

**DB 验证**：
```sql
$ SELECT action, payload FROM timeline_logs WHERE entity_id='5d38aaac-bdaa-483d-9ac3-64f72d9de27f' AND action='case_party.created';
 action               | payload
----------------------+---------------------------------------------------------------
 case_party.created   | {"partyType":"applicant","casePartyId":"c7d7e1c2-..."}
```

payload 不含 `partyName` 或 `name`，admin builder（`CaseCommsTimelineBuilders.ts:129-132`）：
```ts
"case_party.created": (p) => ({
  key: "cases.log.timeline.casePartyCreated",
  params: { suffix: pickFirst(p, ["partyName", "name"]) },  // ← 永远落空
}),
```

**server 根因** (`packages/server/src/modules/core/case-parties/caseParties.service.ts:181-184`)：
```ts
await this.writeCaseTimeline(ctx, party.caseId, "case_party.created", {
  casePartyId: party.id,
  partyType: party.partyType,
});
```

**修复建议**：

1. server 在 emit 时根据 `party.customerId / party.contactPersonId` 解析显示名（zh/jp/en 任一），写入 `payload.partyName`。
2. 同时保留 `casePartyId`，便于审计。
3. 补 server 单测：`caseParties.service.test.ts:114-121` 已有快照，把 `payload.partyName` 加进期望值。

### 2.2 R31-F：CaseFormsTab「版本历史」死按钮（P2）

**真浏览器观测**：

CASE-202604-0018 文书 tab → 已生成文书行 → 点 "版本历史 / Version history"：
- 无 modal 弹出
- 无路由跳转
- 无网络请求
- 无 console 日志
- DOM `<button>` 既无 `onclick` 也无 click listener

**根因**（`packages/admin/src/views/cases/components/CaseFormsTab.vue:172-174`）：
```vue
<button class="forms-tab__link-btn" type="button">
  {{ t("cases.detail.forms.versionHistoryAction") }}
</button>
```

无 `@click` 绑定。

**修复建议**：

短期：根据计划要么实现版本历史 modal（API：`GET /api/generated-documents/{id}/versions`），要么按 R28-C 的 disabled 模式临时隐藏按钮（加 `disabled` + `description="建设中"`）。

中期：补上版本历史 sheet/modal + 单测。

### 2.3 R31-G：caseDocumentStats 硬编码中文（P2）

**真浏览器观测**：

en-US locale CASE-202605-0006 资料清单 tab：
```
0/1 (0%)
MAIN APPLICANT
0 / 1 完成    ← 中文 "完成" 漏到 en-US
R26 audit test
```

**根因**（`packages/admin/src/views/cases/model/caseDocumentStats.ts:85-97`）：
```ts
if (total <= 0) {
  return { collected: 0, total: 0, percent: 0, label: "无必需资料" };  // ← 写死中文
}
const percent = Math.round((collected / total) * 100);
return {
  collected, total, percent,
  label: `${collected} / ${total} 完成`,  // ← 写死中文
};
```

**修复建议**：

把 `label` 改成 i18n key，或在调用方做 i18n 渲染。注意：model 层不应直接调 i18n，最佳做法是返回结构化数据 `{ collected, total, percent }`，让 view 通过 `t("docs.completion.label", { collected, total })` 拼接。

补单测：`CaseDocumentsTab.bug169.test.ts` 加 en-US/ja-JP locale 渲染断言。

注：ja-JP 下 "完成" 字符也通用，但官方应当走 i18n。

---

## 3. P3 缺陷详细

### 3.1 R31-C：task avatar tooltip 仍是单字母（P3）

**真浏览器观测**：

CASE-202605-0006 任务行 DOM：
```html
<span class="tasks-tab__avatar" title="L">L</span>
```

`title` 属性也只是 "L"，hover 不显示 "Local Admin"。

**根因**（`packages/admin/src/views/cases/model/CaseAdapterSupportSeams.ts:366-372`）：
```ts
function resolveAssigneeLabel(r: Record<string, unknown>): string {
  for (const key of ASSIGNEE_DISPLAY_FIELDS) {
    const v = readNullableString(r, key);
    if (v && v.trim().length > 0) return v.trim().charAt(0).toUpperCase();
  }
  return "—";
}
```

只返回首字母作为 label；template 把 label 直接绑到 `<span>` 文本和 `title`。

**修复建议**：

1. 拆成两个字段：`assigneeAvatar`（首字母）+ `assigneeFullName`（全名）。
2. `<span class="tasks-tab__avatar" :title="assigneeFullName">{{ assigneeAvatar }}</span>`。

### 3.2 R31-D：关闭原因 modal 日期格式不一致（P3）

CASE-202604-0007 (S9 已归档) 「查看关闭原因」modal：
```
归档时间：2026/5/2     ← 缺前导零
操作人：Local Admin
```

同页面下方 timeline："业务阶段变更：咨询中 → 失败归档 / 2026/05/02 21:15" — 有前导零。

**修复建议**：

modal 的归档时间应当复用 `formatDate(d, locale)`（与 `CaseLogTab` 同一 helper），输出 "2026/05/02"。

### 3.3 R31-E：任务创建 modal「Assignee」placeholder 像 text input 提示（P3）

**en-US 真浏览器观测**：

```
Assignee
[Enter user ID or name ▾]    ← <select> 占位
   Enter user ID or name
   Local Admin
```

`<select>` 第一项 `<option value="">Enter user ID or name</option>`：文案误导，看起来像键盘输入提示，但实为 select 占位。

**修复建议**：

替换文案为 "— Select assignee —" / "—請選擇承辦人—" / "—担当者を選択—"。

### 3.4 R31-K：概览「财务状况」与 stage=S7 业务不一致（P3）

CASE-202604-0018 (S7 已提交) 概览：
```
财务状况：—
需先在收费 Tab 添加至少一条待收费记录，再推进到待缴费阶段
```

但案件已经走到 S7（已提交待回执），按业务规约，案件至少应已签约 + 收预付款 + 进入提交阶段。

**根因**：dev 数据本身缺 billing 行，stage 通过手工 API 推进绕过 invariant。但 UI 没有兜底校验。

**修复建议**（属业务/状态机层面）：
1. 阶段流转 service 加 `requireBillingRecord(targetStage in ["S5","S6","S7"])` 校验。
2. 若历史数据已破窗，UI 改文案为 "财务状况未登记，建议在收费 Tab 补录" + 不做"必须前置"硬阻断。

详见 R31-L。

---

## 4. 业务/状态机一致性

### 4.1 R31-L：双层状态机数据漂移

DB 抽样：
| case_no | status | stage | archived_at | 备注 |
|---|---|---|---|---|
| CASE-202604-0001 | S9 | S9 | NULL | 一致但未归档 |
| CASE-202604-0002 | S9 | S9 | NULL | 一致但未归档 |
| CASE-202604-0007 | S1 | S9 | NULL | 业务结案但 lifecycle 仍 S1 |
| CASE-202604-0011 | S1 | S9 | NULL | 同上 |
| CASE-202604-0016 | S1 | S9 | NULL | 同上 |
| CASE-202604-0018 | S1 | S7 | NULL | 已提交但 lifecycle 仍 S1 |

观察：
1. `status` 与 `stage` 在 dev 库大面积漂移，FE header 文案完全靠 `stage` 派生（"S7 · 已提交待回执"），`status` 似乎不再驱动任何 UI；
2. `archived_at` 全部 NULL，但 stage=S9 的案件 UI 显示「已归档」靠 stage=S9 推断；R30-N 复测时关闭原因 modal 的「归档时间」实际不是 `archived_at`（NULL）而是其他来源（updated_at? timeline event?） — 易让运营误读。

**修复建议**：

1. 决定一份权威：要么把 lifecycle `status` 列彻底废弃（migration 把它从必填字段改为派生视图），要么补迁移把 `status` 与 `stage` 一致化。
2. `archived_at` 在 stage=S9 流转时必须落库；`CaseCloseReasonModal` 的「归档时间」绑到 `archived_at`，否则显示 "未记录"。
3. 加 server-side guard：归档操作（stage→S9）必须同时写 `archived_at = now()` + `status='S9'`。

### 4.2 R31-M：沟通记录 channelType 命名空间扩展不闭环

UI 创建侧（`CaseAdapterMessageWriteBuilders.ts` CHANNEL_MAP）：
- `internal` → `internal_note` ✅
- `client_visible` → `client_note` ✅
- `phone` → `phone` ✅
- `meeting` → `meeting` ✅

UI 过滤侧（沟通记录 tab 过滤面板）：
- 所有记录、内部记录、客户可见记录、电话记录、线下会议、**自动邮件**

但创建侧无法手动产生 `auto_email` —— 假设这是系统自动写入的特殊类型。这是设计但未文档化。

**修复建议**：

1. 在 `docs/gyoseishoshi_saas_md/` 沟通记录页面规范中加一行：「`auto_email` 仅由系统事件触发器写入，UI 不暴露手动入口」。
2. 在 server `communicationLogs.service.ts` 加 enum 校验，禁止从 admin write API 直接传 `auto_email`。

---

## 5. 关键产物 / 修复清单

| 优先级 | BUG | 涉及文件（核心） |
|---|---|---|
| P1 | R31-A | `CaseEditModal.vue:67,82,259-270`、i18n `riskOptions`、`CaseAdapterDetailAggregate.ts:339` |
| P1 | R31-J | `CaseDetailView.vue:263-269`、`BillingListView.vue` 加 `useRoute().query.case` 过滤逻辑 |
| P2 | R31-B | server `caseParties.service.ts:181-184` 增补 `partyName` |
| P2 | R31-F | `CaseFormsTab.vue:172-174` 增 `@click` handler 或加 disabled |
| P2 | R31-G | `caseDocumentStats.ts:85-97` 改造为结构化输出 + view 层 i18n |
| P3 | R31-C | `CaseAdapterSupportSeams.ts:366-372` + `CaseTasksTab.vue` 模板分离 avatar/title |
| P3 | R31-D | `CaseCloseReasonModal.vue` 归档时间格式化 |
| P3 | R31-E | i18n `assigneeUserId` placeholder 文案 |
| P3 | R31-K | 阶段流转 service 加 billing 前置校验 |
| 一致性 | R31-L | migration + service 修复 status / archived_at |
| 一致性 | R31-M | 沟通记录 channelType enum + 文档 |

---

## 6. 已闭环的 R30 工程纪律改进（值得记录）

R30 §6 提出的三条工程问题，本轮验证落地度：

1. **真浏览器复测** ✅：本轮覆盖 13 条 R30 缺陷，每条均通过 chrome-devtools-mcp `take_snapshot` / `evaluate_script` 真渲染断言。
2. **migration drift 检测**：`schema_migrations` 已含 041～046；DB 基线与代码 `src/infra/db/migrations/` 一致。建议把这一比对脚本固化到 `npm run guard`（仍未见）。
3. **i18n 渲染断言**：本轮抽样发现 R31-G "完成" 中文漏出，说明仅靠 grep "raw key" 不够；建议加快照测试覆盖各 locale 实际渲染。

---

## 7. 取证补充

- 截图 evidence：`/tmp/r31-overview-s7.png`、`/tmp/r31-overview-timeline-empty-param.png`、`/tmp/r31-close-reason-date-format.png`
- 网络请求 evidence：
  - POST `/api/reminders` → 201（R30-H 已修）
  - POST `/api/communication-logs` → 201（R30-J 已修，DB 落 `internal_note`）
  - GET `/api/cases/{id}/aggregate` → riskLevel="low" 正确返回（R31-A 反向验证 FE 显示侧）
- DB evidence：
  - `schema_migrations` 含 040～046（R30-H 闭环）
  - `cases.risk_level` 列保留 default `'low'`（R31-A 根因）
  - `timeline_logs` payload 缺 `partyName` 字段（R31-B 取证）

---

**报告生成完毕。R30 13 条缺陷全部 LANDED（12 真生效 + 1 部分生效）；R31 新发现 11 条（P1 × 2、P2 × 3、P3 × 4、业务一致性 × 2）。**
