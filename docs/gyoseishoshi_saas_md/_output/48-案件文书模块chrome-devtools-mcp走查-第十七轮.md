# 案件文书模块 chrome-devtools-mcp 走查（第十七轮 / R37 文书 tab + 模板 + 生成 / 定稿 / 导出 全链路）

> 生成日期：2026-05-05
>
> 命题：使用 chrome-devtools-mcp 仔细走查「案件详情 · 文书 tab（forms）」的端到端流程，
> 包括模板列表、生成弹窗、生成 / 定稿 / 导出三态切换、跨案件类型行为、S9 只读、timeline / i18n 一致性。
>
> 本轮重点是新落地的 `document_templates` 表 + `useCaseFormTemplates` composable
> + `/api/document-templates` 控制器 + `generated-documents` 的 `finalize` / `export` 端点的**实际接线状态**，
> 而非纯字号 / 颜色 token 体检。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click / evaluate_script
> / list_network_requests / get_network_request / list_console_messages / take_screenshot）
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）；23 条种子案件，4 类 caseTypeCode：
> `biz_mgmt_cert_4m`（4） / `biz_mgmt_4m`（10） / `biz_mgmt`（6） / `family`（3）；
> 阶段覆盖 S1 / S2 / S4 / S7 / S8 / S9。

---

## 0. 总结

### 0.1 一句话结论

**新落地的「案件文书」模块在 P0 happy-path 上跑通了：BMV 案件可以从「文书 tab」打开生成弹窗 → POST `/api/generated-documents` 创建 draft → POST `/finalize` 切到 final → POST `/export` 切到 exported，三态按钮切换正确，timeline 留痕，S9 只读 server-side 兜底正确（`GD_CASE_S9_READONLY`）。但走查发现了 11 项缺陷，集中在三个体系性问题：① 模板系统全链路代码完整、单测齐全，但 `useCaseFormTemplates` composable 从未被 `useCaseDetailModel` 调用、`<CaseFormGenerateModal>` 在 `CaseDetailView.vue` 上挂载时未传 `:templates`，导致**「可用模板」section 在所有案件类型上永远为空**，模板 dropdown 永远 disabled，且 R37-A 的 family case 即使种子里有匹配模板也看不到（实测 `/api/document-templates?caseType=family` 当前返回 0 条 → 二级遗漏：`seedDevData.ts` 没在迁移 048 之后重跑）；② 三个状态 draft / final / exported 视觉上**只有按钮文案变化**，meta 行不变、icon 形状不变（一律 check-circle），`statusLabel`（"下書き / 確定済み / 出力済み"）虽计算出来但既不渲染也未走 i18n，导出后的占位 `fileUrl` 完全不在 UI 露出；③ `finalize` / `export` 在每次调用都会同时写两条 timeline 事件（`generated_document.updated` + `generated_document.finalized` / `.exported`），且这三个新 action 在 `CaseTimelineBuilders` 里**没有翻译条目**，日志里直接显示 `generated_document.exported` 等英文事件名 ── 既比预期多一倍噪声，又破坏中日韩日志可读性。**

### 0.2 走查矩阵（4 个代表性案件 × 7 个交互节点）

| 案件 | caseTypeCode | 阶段 | 文书 tab 入口 | 模板 section | 生成弹窗 | 提交生成 | 定稿 | 导出 |
|---|---|---|---|---|---|---|---|---|
| **A** R23-AUDIT-TITLE-TEST<br/>CASE-202605-0006 | biz_mgmt_cert_4m | S4 | ✅ | ⚠ R37-A 模板 section 不出现 | ✅ ⚠ R37-A2 dropdown disabled<br/>"暂无模板（走占位流程）" | ✅ POST 201 | ✅ POST 201 | ✅ POST 201 ⚠ R37-D fileUrl 不可达 |
| **B** R5 stage probe<br/>CASE-202604-0004 | family | S4 | ✅ | ⚠ R37-A 同上 | ✅ 同 A | n/a | n/a | n/a |
| **C** Tani Family Stay<br/>CASE-202604-0001 | family | S9 | ⚠ R37-H tab 整个 disabled | n/a | n/a | n/a | server 400 `GD_CASE_S9_READONLY` ✅ | n/a |
| **D** seed `family` 模板直查 API | n/a | n/a | n/a | ⚠ R37-A1 服务端 0 条数据 | n/a | n/a | n/a | n/a |

✅ = pass / ⚠ = 本轮新发现缺陷 / n/a = 类型不适用

### 0.3 R37 缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P1** | 1 | R37-A 模板系统整条链路在 wiring 层断开 |
| **P2** | 4 | R37-C 状态可见性 / R37-D 占位 fileUrl 不可达 / R37-E timeline 未 i18n / R37-F finalize/export 双写 timeline |
| **P3** | 4 | R37-A1 dev seed 漏跑 / R37-A2 dropdown 文案误导 / R37-J GD_* 错误码未映射 / R37-K 模板行按钮无 click handler |
| **P4** | 2 | R37-B 已生成行 meta 不刷新 / R37-H S9 整 tab disabled（与 R34 同源，可能是有意设计） |

### 0.4 体系性问题（编译式沉淀）

1. **「数据层 + 适配层 + 单测齐备但 wiring 缺失」是新模块上线最容易踩的坑**
   - 本轮 R37-A 是教科书例子：`useCaseFormTemplates.ts`（hook）+ `CaseAdapterDocumentTemplates.ts`（adapter）+
     `repo.listDocumentTemplates`（仓储）+ `useCaseFormTemplates.test.ts`（135 行单测全覆盖） ──
     全部 PASS，但 `useCaseDetailModel.ts` 从未 import 这个 hook，`CaseDetailView.vue` 挂载
     `<CaseFormGenerateModal>` 时也没把 templates 传进去。
   - 单测全绿不代表运行时通畅；**应补一条 wiring contract test**：
     "打开案件详情时必须发起 `GET /api/document-templates?caseType=<type>` 请求"
     （类似 `CaseDetailView.wiring.contract.test.ts` 已有的 documents/tasks/timeline 模式）。
   - 类似的「死代码 hook」反模式建议在 dependency-cruiser 配一条规则：
     `useCase*` 名字开头的 composable 必须被某个 `views/` 文件 import，否则报错。

2. **「状态是颜色 + 按钮文案」不足以代替显式 status label**
   - 当前 forms 行的状态切换（draft → final → exported）依赖：图标颜色（gray → green → blue）
     + 按钮文案（定稿 → 导出 → 再次导出）+ 同样的 check-circle 图标。
   - 用户能不能区分一行的状态完全取决于 ① 看图标能不能分辨颜色 ② 看按钮文案。
     色觉障碍用户和扫视用户都可能错读。
   - 同时 `statusLabel`（"下書き / 確定済み / 出力済み"）已经在 adapter 里算出来了，
     却既不渲染也是硬编码日文。**最小修复**：在 `CaseFormsTab.vue` row 里
     `<span class="status-chip status-chip--{tone}">{{ doc.statusLabel }}</span>`，
     再把 `GEN_DOC_STATUS_LABELS` 改成 i18n key 映射。

3. **「占位实现」在 P0 阶段必须有用户可见的标识**
   - 后端 `export` 端点写入的 `fileUrl = "placeholder://generated-documents/<id>.pdf"` 是 P0 占位约定。
   - 但 UI 完全不告诉用户这是占位 ── 用户点「再次导出」期待文件下载，什么都没发生。
   - **建议**：在 P0 阶段，「导出」按钮应该 ① 额外弹一条 toast「导出已记录，文件生成功能 P1 落地」
     或 ② 把 `fileUrl` 暴露成只读「占位 URL」字段并标记 `coming soon`。
   - 同样适用于：生成模板 dropdown 的 placeholder「暂无模板（走占位流程）」── 这条文案
     现在出现在所有案件上，用户没法知道这是「模板系统未上线」还是「这种案件没有模板」。

4. **新增 timeline action 必须同步补 builder + i18n key**
   - 本轮发现 `generated_document.finalized` / `.exported` / 第二条 `.updated` 在 `CaseTimelineBuilders.ts`
     的 `LOG_BUILDERS` map 里没有条目（只有 `generated_document.created` 一条）。
   - 加一条新 server-side action 应该是「3 处必改」：① server controller writeTimeline call
     ② `CaseTimelineBuilders.ts` + `CaseCommsTimelineBuilders.ts` 的 builder map
     ③ `i18n/messages/cases/zh-CN.ts` (+en + ja) 的 `cases.log.timeline.*` 三语 key。
   - 当前缺第 ② ③ 两步 → 中日英三语日志全部回退到 raw key。

5. **`finalize` / `export` 控制器在写 timeline 上有重复**
   - 调用链：`controller.finalize` → `service.update({ status: "final" })`（service 内部写 `.updated` 时间线）
     → `controller.writeTimeline({ action: "generated_document.finalized" })`
   - 净效果：每次定稿 / 导出在 timeline 多写一条 `generated_document.updated`。
   - 建议：在 service `update()` 里增加 `skipTimelineWrite?: boolean` 选项，
     finalize / export 流程显式跳过 service-level 的通用 `.updated` 写入；
     或者把 `.finalized` / `.exported` 改成同一次 `update()` 的 `action` 参数传入。

---

## 1. R37 缺陷详细

### R37-A · P1 · 模板系统在 wiring 层断开

**现象**：

- 走查 `biz_mgmt_cert_4m`（A）和 `family`（B）两类案件的「文书 tab」：
  - 两者**都没有触发** `GET /api/document-templates?caseType=…` 请求（network 列表 22 条都看不到）
  - 两者「可用模板」section 都不出现，只显示「暂无可用文书模板或生成记录」空态
  - 两者打开生成弹窗后 template dropdown 都是 disabled，唯一选项「暂无模板（走占位流程）」

**根因（代码）**：

```17:55:packages/admin/src/views/cases/model/useCaseFormTemplates.ts
export function useCaseFormTemplates(deps: {
  repo: CaseRepository;
  caseType: Ref<string>;
  language?: Ref<string | undefined>;
}) {
  // ... 完整实现：响应式 caseType 触发 fetch、generation 防过期、loading 状态
}
```

```text
$ rg "useCaseFormTemplates" packages/admin/src
packages/admin/src/views/cases/model/useCaseFormTemplates.ts          # 定义
packages/admin/src/views/cases/model/useCaseFormTemplates.test.ts     # 单测
# (其他位置 0 处引用)
```

```821:827:packages/admin/src/views/cases/CaseDetailView.vue
<CaseFormGenerateModal
  :open="formGenModalOpen"
  :case-name="detail.title"
  :submitting="formGenModalSubmitting"
  @close="formGenModalOpen = false"
  @submit="onFormGenSubmit"
/>
```

挂载时**没有**传 `:templates="..."` prop。
`CaseFormGenerateModal.vue` 第 32 行 `resolvedTemplates = computed(() => props.templates ?? [])`
→ `hasTemplates = false` → select 永久 disabled。

```300:302:packages/admin/src/views/cases/model/CaseAdapterSupportSeams.ts
  return { templates: [], generated };
}
```

`adaptCaseFormsData` 的 `templates` 直接硬编码 `[]`（注释里写「P0 阶段 templates 始终为空」），
但 P0 阶段的所有上游模块（迁移 048 / seed / controller / hook / adapter）都已建好，
只剩这一根「最后一公里」的线没接。

**等级**：P1（核心功能不可用）

**修复方向**：

1. 在 `useCaseDetailModel.ts` 里 `useCaseFormTemplates({ repo, caseType: computed(() => detail.value.caseTypeCode) })`，
   暴露 `formTemplates: Ref<FormTemplate[]>`。
2. `CaseDetailView.vue` 把 `formTemplates` 透传给 `<CaseFormGenerateModal :templates="formTemplates">`，
   同时（可选）传给 `<CaseFormsTab :detail="detailWithTemplates">` 让模板 section 出现。
3. 补一条 `CaseDetailView.wiring.contract.test.ts` 的契约：
   `expect(network.calls).toContainRequest({ method: 'GET', urlPattern: /\/api\/document-templates\?/ })`。

---

### R37-A1 · P3 · dev seed 在迁移 048 之后未重跑

**现象**：

- `evaluate_script` 直接打 `/api/document-templates?caseType=family` → 200 OK，但 `items=[]`。
- `seedDevData.ts` 第 250-289 行明确定义了 6 条种子模板（家族滞在 3 + 技人国 3），
  但 admin 端 `Local Demo Office` 实测一条都拿不到。
- 这意味着：即使 R37-A 修好，本地 demo 数据也看不到模板列表，必须先手动 `npm run seed:dev`。

**等级**：P3

**修复方向**：

- README / 部署 runbook 里明确「迁移 048 落地后必须重跑 seed」。
- 或者在 `app.module.ts` 启动时自动幂等地补 seed（看产品策略；目前其他 6 条 doc items 也是 seed 才有）。

---

### R37-A2 · P3 · "暂无模板（走占位流程）" 文案语义模糊

**现象**：

- 模板 dropdown 当前 disabled + 唯一选项的文案："暂无模板（走占位流程）"。
- 这条文案在两种语义下都会出现：
  1. 「该案件类型在 `document_templates` 里没有匹配条目」
  2. 「模板系统压根没接通」（当前 100% 是这种情况）
- 用户没法分辨，且「走占位流程」对终端用户是开发术语。

**等级**：P3

**修复方向**：

- 拆分成两条文案：
  - `templatePlaceholder`：「请选择模板」（启用态，必填）
  - `templateEmpty`：「该案件类型暂无可用模板，将创建无模板草稿」（禁用态，提示性）
- i18n 对齐 zh-CN / ja-JP / en-US。

---

### R37-B · P4 · 已生成文书 row 的 meta 行不随状态刷新

**现象**：

| 时点 | 按钮 | meta 行（不变） |
|---|---|---|
| 生成后（draft） | "定稿" | "PDF · v1 · Local Admin · 2026/05/05 13:46" |
| 定稿后（final） | "导出" | "PDF · v1 · Local Admin · 2026/05/05 13:46" |
| 导出后（exported） | "再次导出" | "PDF · v1 · Local Admin · 2026/05/05 13:46" |

- 后端实际 response 里有 `approvedBy / approvedAt / fileUrl` 字段，但 adapter `adaptGeneratedDocumentDto` 没写入 meta。

**等级**：P4（功能正确，仅 UX 缺信息）

**修复方向**：

- meta 行追加：定稿后 → "· 定稿：Local Admin 13:47"；导出后 → "· 导出：13:48"
- 或者用单独的 status chip 行（参见 R37-C）

---

### R37-C · P2 · `statusLabel` 计算出来但从不渲染 + 硬编码日文

**现象（代码）**：

```220:230:packages/admin/src/views/cases/model/CaseAdapterSupportSeams.ts
const GEN_DOC_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  final: "確定済み",
  exported: "出力済み",
};
const GEN_DOC_STATUS_TONES: Record<string, string> = {
  draft: "muted",
  final: "success",
  exported: "primary",
};
```

```272:278:packages/admin/src/views/cases/model/CaseAdapterSupportSeams.ts
return {
  id: id || "",
  name: title,
  meta: metaParts.join(" · "),
  tone: GEN_DOC_STATUS_TONES[status] ?? "muted",
  statusLabel: GEN_DOC_STATUS_LABELS[status] ?? status,
  backendStatus: resolveBackendStatus(status),
};
```

```text
$ rg "statusLabel" packages/admin/src/views/cases/components/CaseFormsTab.vue
# (0 处)
```

- `statusLabel` 从 adapter 出来一路传到 `FormGenerated.statusLabel`，但 `CaseFormsTab.vue` 完全没绑定这个字段。
- 同时这 3 个文案是裸日文，未走 i18n，即使渲染了 zh-CN / en-US 用户也只能看到 "下書き"。

**等级**：P2

**修复方向**：

- `CaseFormsTab.vue` row 增加状态 chip：
  ```vue
  <Chip :tone="doc.tone" size="xs">{{ t(`cases.detail.forms.status.${doc.backendStatus}`) }}</Chip>
  ```
- `GEN_DOC_STATUS_LABELS` 删除，改用 i18n key（`cases.detail.forms.status.draft / final / exported`），
  zh-CN 加「草稿 / 已定稿 / 已导出」、en-US 加「Draft / Finalized / Exported」、ja-JP 保留现有。

---

### R37-D · P2 · 占位 `fileUrl` 完全不在 UI 露出，"再次导出" 按钮形成空操作

**现象**：

- POST `/api/generated-documents/<id>/export` → 201：response body
  ```json
  {
    "fileUrl": "placeholder://generated-documents/0f2f660e-….pdf",
    "status": "exported", "approvedAt": "2026-05-05T04:47:07.830Z", ...
  }
  ```
- 但前端 `FormGenerated` 类型（`packages/admin/src/views/cases/types-detail.ts` 第 676-697 行）
  完全没有 `fileUrl` 字段；adapter 也不读取。
- 按钮文案变成「再次导出」，用户每次点击都会再次触发 POST `/export`，但**没有任何文件下载**，
  也没有 toast / 锚点链接 / 占位提示。

**等级**：P2（功能误导）

**修复方向**：

- 短期：点 "导出" 后弹 toast「导出已记录（生成文件功能 P1 落地）」。
- 中期：把 `fileUrl` 加入 `FormGenerated`；当 protocol === `placeholder://` 时显示灰色「占位 URL，文件功能未上线」徽标；
  当为真实 URL 时显示「下载」链接。

---

### R37-E · P2 · 新 timeline action 在 admin builder 里完全没翻译

**现象（截图证据）**：

R23-AUDIT-TITLE-TEST 案件「日志」tab，按时间倒序：

```
LA  generated_document.exported    操作日志  文书  2026/05/05 13:48
LA  generated_document.updated     操作日志  文书  2026/05/05 13:48
LA  generated_document.finalized   操作日志  文书  2026/05/05 13:47
LA  generated_document.updated     操作日志  文书  2026/05/05 13:47
LA  文书生成：R23-AUDIT-TITLE-TEST  操作日志  文书  2026/05/05 13:46  ← 唯一翻译过的
```

- `CaseTimelineBuilders.ts` 第 176-178 行 `LOG_BUILDERS` map 里只有 `generated_document.created`，
  缺 `.updated` / `.finalized` / `.exported`。
- zh-CN 是 admin 默认语言，仍然全部 raw event key，i18n 完全失效。

**等级**：P2（log 可读性 / 国际化）

**修复方向**：

```typescript
// CaseTimelineBuilders.ts + CaseCommsTimelineBuilders.ts
"generated_document.updated":  () => ({ key: "cases.log.timeline.generatedDocumentUpdated", params: {} }),
"generated_document.finalized":(p) => ({ key: "cases.log.timeline.generatedDocumentFinalized", params: { suffix: pickSuffix(p, ["title"]) } }),
"generated_document.exported": (p) => ({ key: "cases.log.timeline.generatedDocumentExported", params: { suffix: pickSuffix(p, ["title"]) } }),
```
- 同步 zh-CN / ja-JP / en-US 三语 i18n 文件追加对应 key。

---

### R37-F · P2 · `finalize` / `export` 在 timeline 上每次写两条事件

**现象（同 R37-E 截图）**：

- 用户点了 1 次「定稿」 → timeline 出现 2 条：`generated_document.updated` + `generated_document.finalized`
- 用户点了 1 次「导出」 → timeline 出现 2 条：`generated_document.updated` + `generated_document.exported`

**根因（代码）**：

- `generatedDocuments.controller.ts` finalize 路径：
  - 调 `service.update({ status: "final" })` ── service 内部 line 226-228 写 `generated_document.updated`
  - 然后控制器自己再 `writeTimeline({ action: "generated_document.finalized" })`
- export 路径同款。

**等级**：P2（数据噪声 + 用户日志阅读疲劳）

**修复方向**：

- 让 `generatedDocuments.service.update()` 接受 `{ skipTimelineWrite?: boolean }`，finalize / export 显式 skip。
- 或者把 `update()` 的 timeline write 拆出去，由调用方按需写。

---

### R37-G · 已 PASS · 创建 `generated_document.created` 翻译正确

`日志` tab 上 "文书生成：R23-AUDIT-TITLE-TEST" 是这次链路里唯一被翻译的 timeline 项。
对应 `cases.log.timeline.generatedDocumentCreated` i18n key 已就绪。
**这条作为正例，可以参照它把 R37-E 的 4 条新 action 一次性补齐。**

---

### R37-H · P4 · S9 案件整个 forms tab disabled

**现象**：

- 导航 `Tani Family Stay`（CASE-202604-0001 / S9）`?tab=forms` → 路由自动 fallback 到 `?tab=log`
- 9 个 tab 中除「概览」「日志」全部 disabled，`文书` 也被禁用 → 用户无法查看历史已生成文书

**等级**：P4（与 R34 的「S9 全 tab 只读」是同一系统设计；视产品口径决定是否需要保留可见但只读的 forms tab）

**修复方向**（如确认要 expose）：

- 让 `forms` tab 在 S9 时仍可点击，传 `:readonly="true"` 让 `CaseFormsTab.vue` 自动隐藏「生成 / 定稿 / 导出」按钮。
- 当前 CaseFormsTab 已经支持 `:readonly` prop（第 56 行 `v-if="!readonly"`），server 端 S9 gate 也兜底，
  改一行路由 disabled 判定即可。

---

### R37-I · 已 PASS · server-side S9 gate + 状态机 gate 工作正常

直接 fetch 测试：

| 操作 | 结果 |
|---|---|
| POST `/api/generated-documents`（caseId=S9 案件） | **400** `GD_CASE_S9_READONLY: Parent case is archived (S9) and read-only` ✅ |
| POST `/api/generated-documents/<id>/finalize`（已 exported 文档） | **400** `GD_INVALID_TRANSITION: cannot transition from 'exported' to 'final'` ✅ |

**结论**：后端写门禁 + 状态机校验完整。即使前端短暂 race condition，服务器会兜底。

---

### R37-J · P3 · `GD_*` 错误码在 admin 端没映射 i18n key

**现象（代码）**：

```text
$ rg "GD_" packages/admin/src/views/cases/model/CaseWriteErrorMapping.ts
# (0 处)
```

server `GENERATED_DOCUMENT_ERROR_CODES` 共 7 条（`GD_CASE_NOT_FOUND` / `GD_CASE_S9_READONLY` /
`GD_NOT_FOUND` / `GD_INVALID_STATUS` / `GD_INVALID_TRANSITION` / `GD_INVALID_OUTPUT_FORMAT` /
`GD_TITLE_REQUIRED`），admin 端 `CASE_WRITE_ERROR_I18N_MAP` 没有任何一条 → 全部回退到
`cases.writeErrors.unknown`。

**等级**：P3

**修复方向**：

- `CASE_WRITE_ERROR_I18N_MAP` 追加 7 条：
  ```typescript
  GD_CASE_NOT_FOUND: "gdCaseNotFound",
  GD_CASE_S9_READONLY: "gdCaseS9Readonly",
  GD_NOT_FOUND: "gdNotFound",
  GD_INVALID_STATUS: "gdInvalidStatus",
  GD_INVALID_TRANSITION: "gdInvalidTransition",
  GD_INVALID_OUTPUT_FORMAT: "gdInvalidOutputFormat",
  GD_TITLE_REQUIRED: "gdTitleRequired",
  ```
- 同步 zh-CN / ja-JP / en-US 三语 `cases.writeErrors.gd*` key。

---

### R37-K · P3 · 模板行的「生成」按钮没有 `@click` 事件

**现象（代码）**：

```116:118:packages/admin/src/views/cases/components/CaseFormsTab.vue
<Button v-if="!readonly" size="sm" pill>
  {{ tpl.actionLabel }}
</Button>
```

- 没有 `@click="..."` handler。点击后什么都不发生。
- 用户预期：「点这个按钮应该把模板预选进生成弹窗并打开」。
- 当前情况：等同装饰按钮。
- 由于 R37-A 模板从不渲染，这条 bug 暂时被掩盖；R37-A 修好后会立刻显形。

**等级**：P3

**修复方向**：

```vue
<Button
  v-if="!readonly"
  size="sm"
  pill
  @click="emit('open-generate-modal-with-template', tpl.id)"
>
  {{ tpl.actionLabel }}
</Button>
```
- `CaseDetailView.vue` 接住事件，把 templateId 预填进 modal（modal 已经支持 `localTemplateId` 可选，
  改成 props `:initial-template-id="..."` 即可）。

---

## 2. Happy-path 网络回路（参考）

| # | 时点 | Method | URL | 状态 | Body / 关键字段 |
|---|---|---|---|---|---|
| 1 | 进入 forms tab | GET | `/api/cases/:id/aggregate` | 304 | (no template request fired ⚠ R37-A) |
| 2 | 同上 | GET | `/api/generated-documents?caseId=:id` | 304 | `items=[]` |
| 3 | 点「生成文书」 + 提交 | POST | `/api/generated-documents` | 201 | `{ caseId, title, templateId: null, outputFormat: 'pdf' }` → returns `status:"draft", versionNo:1, fileUrl:null` |
| 4 | 自动 refetch（10 个 endpoint） | GET | `/api/cases/:id/aggregate` 等 | 200/304 | 大幅冗余，可优化 |
| 5 | 点「定稿」 | POST | `/api/generated-documents/:id/finalize` | 201 | returns `status:"final", approvedBy:<userId>, approvedAt:<ts>` |
| 6 | 自动 refetch ×10 | … | … | … | timeline 200 (新事件)，其他 304 |
| 7 | 点「导出」 | POST | `/api/generated-documents/:id/export` | 201 | returns `status:"exported", fileUrl:"placeholder://generated-documents/<id>.pdf"` |
| 8 | 自动 refetch ×10 | … | … | … | 同 #6 |

**Console error**: `<no console messages found>`（全程零异常 ✅）

**性能观察**：每次 write action 都触发 10 条 refetch（aggregate / document-items / generated-documents /
validation-runs / billing-tab-aggregate / submission-packages / review-records / communication-logs /
timeline / tasks / reminders）。其中 8 条返回 304，但 RTT 仍要付出。
建议在 `useCaseDetailWriteActions` 里区分写入类型，按需 refetch（finalize / export 应只刷
generated-documents + timeline 即可）。

---

## 3. 截图

| 文件 | 描述 |
|---|---|
| `/tmp/r37-A1-bmv-forms-empty.png` | BMV S4 案件初次进入 forms tab — empty state |
| `/tmp/r37-A2-bmv-modal-open.png` | 生成文书 modal 打开 — 模板 dropdown 永久 disabled，唯一选项「暂无模板（走占位流程）」 |
| `/tmp/r37-A3-bmv-after-finalize.png` | 定稿后 — 按钮变「导出」，meta 不变 |
| `/tmp/r37-A4-bmv-after-export.png` | 导出后 — 按钮变「再次导出」，无下载链接 |

---

## 4. 后续建议（按优先级）

1. **P1 → R37-A wiring 修复**（接 hook + 传 props + 补 wiring contract test）── 解锁整个模板路径
2. **P2 → R37-E timeline 翻译 + R37-F 双写去重**（同一个 PR，影响所有 zh/en/ja 用户的日志可读性）
3. **P2 → R37-C statusLabel chip + i18n**（行内可见状态，立竿见影）
4. **P2 → R37-D 占位提示**（避免「再次导出」按钮形成黑洞）
5. **P3 → R37-J GD\_\* 错误码映射 / R37-K 模板按钮 click handler**（小工时易补）
6. **P3 → R37-A1 dev seed 重跑提示**（README + runbook 一行字）
7. **P4 → R37-B meta 刷新 / R37-H S9 forms tab 可读视图**（视产品口径）

---

## 附录 · 走查环境与凭证

- Vite dev server: `http://localhost:5173` (port 5173)
- NestJS server: `PORT=3300 npm run server:dev`
- 账号：`admin@local.test` / `Admin123!` (Local Demo Office)
- Browser: chrome-devtools-mcp 控制 Chromium 147
- 走查总用时：约 30 分钟，发起 ~58 条 HTTP 请求，零 console error。
