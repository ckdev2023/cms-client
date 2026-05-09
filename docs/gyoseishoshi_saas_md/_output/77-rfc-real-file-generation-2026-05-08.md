# RFC-077: 真实文件生成（Generated Document Export Pipeline）

- **状态**: Draft
- **作者**: Agent (D1-real-file-rfc)
- **日期**: 2026-05-08
- **前置依赖**: C（模板契约打通 — `templateVersionNo` 快照字段已存在）
- **不包含**: 本 RFC 不写代码、不改迁移、不动状态机；仅输出设计决策与评审清单。

---

## 0. 背景与动机

当前 `POST /api/generated-documents/:id/export` 端点执行的是**同步占位流程**：

```
controller.export()
  → service.update({ status: "exported", fileUrl: "placeholder://generated-documents/<id>.<ext>" })
  → writeTimeline("generated_document.exported")
  → return dto
```

`fileUrl` 写入 `placeholder://` 前缀的伪 URL，前端通过 `isPlaceholderFile` 标识展示"占位 URL · P1 落地"徽章，禁止下载。用户无法获得真实 PDF/DOCX 文件。

**目标**：将 export 端点改为异步队列驱动，由 worker 完成模板渲染 → 文件落盘 → 状态推进，使用户最终获得可下载的真实文件。

---

## 1. 队列方案：复用 RedisQueue + 新增 handler

### 1.1 现状

| 组件 | 位置 | 职责 |
|---|---|---|
| `RedisQueue` | `infra/queue/redisQueue.ts` | 基于 Redis List 的 lPop 轮询队列 |
| `handleExportJob` | `jobs/handlers/exportJobHandler.ts` | CSV/Excel 数据导出（cases/customers/document_items） |
| `worker.ts` | `src/worker.ts` | 并发启动 PG 轮询 + 4 条 Redis 队列 worker |
| 已注册队列 | `REGISTERED_QUEUES` | `reminder_jobs` / `notification_jobs` / `translation_jobs` / `export_jobs` |

### 1.2 决策

**新增 `generated_doc_export_jobs` 队列 + `handleGeneratedDocExportJob` handler**，不复用现有 `export_jobs`（后者是通用数据导出，payload 结构和处理逻辑完全不同）。

#### Payload 定义

```ts
type GeneratedDocExportJobPayload = {
  orgId: string;
  userId: string;
  generatedDocumentId: string;
  caseId: string;
  templateId: string | null;
  templateVersionNo: number | null;  // C 落地后的快照字段
  outputFormat: "pdf" | "docx" | "xlsx";
  title: string;
};
```

#### Worker 注册

`worker.ts` 的 `REGISTERED_QUEUES` 追加 `"generated_doc_export_jobs"`，`Promise.all` 追加：

```ts
queue.runWorker<GeneratedDocExportJobPayload>(
  "generated_doc_export_jobs",
  (job) => handleGeneratedDocExportJob(pool, storageAdapter, queue, job),
)
```

#### 入队触发

`generatedDocuments.controller.ts` 的 `export` 端点改为：
1. `service.update({ status: "exporting" })`（不再写 `placeholder://` fileUrl）
2. `queue.enqueue("generated_doc_export_jobs", { ... })`
3. `writeTimeline("generated_document.export_queued")`
4. 立即返回 `{ ...dto, status: "exporting" }`

#### 不做的替代方案

| 方案 | 优点 | 缺点 | 不做的后果 |
|---|---|---|---|
| 引入 Bull/BullMQ | 重试策略丰富、Dashboard UI | 新依赖违反约束 | 无影响，RedisQueue 足够 |
| PG jobs 表 | 与 timeline.write 复用同一轮询 | job 处理需 tenant 隔离改动，轮询间隔不适合 I/O 密集渲染 | 无影响 |
| 复用 `export_jobs` 队列 | 少一条队列 | payload 类型混杂，handler 分支逻辑复杂 | 无影响 |

### 1.3 反对意见

> **Q: 为什么不直接同步渲染？PDF 生成通常几秒就够。**
>
> A: 模板渲染涉及外部进程（LibreOffice headless / wkhtmltopdf），耗时不可控（5s–60s+），同步阻塞 API event loop 会拖垮其他请求。即使模板简单，network timeout（30s default）也不足以覆盖极端 case。异步队列是唯一稳妥方案。

---

## 2. 渲染管线（Rendering Pipeline）

### 2.1 候选方案评估

| 方案 | 渲染质量 | 依赖 | Docker 影响 | 复杂度 |
|---|---|---|---|---|
| **A: docx 模板填充 + LibreOffice headless 转 PDF** | 高（所见即所得） | `libreoffice` Alpine 包 (~400MB) 或独立 sidecar | Dockerfile 增大显著；或 docker-compose 增 sidecar 服务 | 中 |
| **B: wkhtmltopdf 子进程** | 中高（HTML→PDF） | `wkhtmltopdf` Alpine 包 (~50MB) + 字体 | Dockerfile 增大适中 | 中 |
| **C: 纯 Node 库（docx-templates → pdf-lib）** | 中（docx 优秀，PDF 文字布局有限） | `docx-templates` + `pdf-lib`（新依赖） | 无 Docker 变化 | 低 |
| **D: 纯 Node 库（Puppeteer headless Chrome）** | 高 | `puppeteer` + Chromium (~300MB) | Dockerfile 增大显著 | 高 |

### 2.2 推荐方案

**阶段性策略**：

- **P1 首发（本轮 D2 实施）**：**方案 C — 纯 Node docx 模板填充**
  - 仅生成 `.docx` 文件（行政书士 SaaS 的主要交付物是 Word 文书，客户和入管局都接受 docx）
  - 使用 `docx-templates`（MIT, 活跃维护）做模板变量填充
  - 不做 PDF 转换，`outputFormat` 为 `"docx"` 时直接落盘
  - 当 `outputFormat` 为 `"pdf"` 时，返回 `export_failed` + 错误信息"PDF 渲染未启用"（降级路径）
  - **优点**：零 Docker 变化、零系统依赖、实现最快
  - **缺点**：不支持 PDF 输出

- **P2 增强**：**方案 A 或 B — 服务端 PDF 转换**
  - 视产品需求决定：LibreOffice headless sidecar（高保真）vs wkhtmltopdf（轻量）
  - 独立 RFC 决策

### 2.3 Handler 处理流程

```
handleGeneratedDocExportJob(pool, storageAdapter, queue, job)
  1. 查询 generated_document 当前记录 — 若 status !== "exporting" 则幂等跳过
  2. 若 templateId 存在：
     a. 查询 document_templates 获取模板内容（template_body / template_url）
     b. 查询 case 数据 + customer 数据 + document_items 作为模板上下文
     c. 调用模板引擎填充变量
  3. 若 templateId 为 null（手动生成）：
     a. 生成空白文档（包含 title 作为标题）
  4. 上传文件到 StorageAdapter
  5. 更新 generated_document: { status: "exported", file_url: <storageKey> }
  6. 写 timeline: "generated_document.exported"
  7. 入队 notification_job 通知用户
```

### 2.4 依赖引入说明

若采用方案 C，需引入 `docx-templates`。按 AGENTS.md 约束"不引入新依赖，除非确有必要"，这属于**确有必要**——没有它就无法填充 Word 模板。需同步：
- 更新 `packages/server/package.json`
- 运行 `npm install` 更新 `package-lock.json`
- 若存在 arch-check / lock-check 白名单，同步更新

#### 不做的后果

不引入模板填充库 → 只能生成空白/纯文本文件 → 不满足产品需求。

---

## 3. StorageAdapter 复用

### 3.1 现状

`StorageAdapter` 接口（`infra/storage/storageAdapter.ts`）：

```ts
type StorageAdapter = {
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
};
```

- `local` 实现：文件写入 `STORAGE_LOCAL_DIR`（生产默认 `/data/storage`）
- `s3` 实现：占位，未实现（`Promise.reject("S3 adapter not implemented")`）

现有 `exportJobHandler` 已复用此接口存储 CSV 导出文件，key 格式：`exports/<orgId>/<timestamp>_<type>.csv`。

### 3.2 生成文书存储 Key 规范

```
generated-documents/<orgId>/<generatedDocumentId>/v<versionNo>.<ext>
```

示例：`generated-documents/org-001/gd-abc123/v3.docx`

设计理由：
- 按 orgId 隔离（与 export 文件一致的一级前缀模式）
- 按 generatedDocumentId 分目录（便于清理和按 ID 查找）
- 包含 versionNo（同一文书多版本不覆盖，支持历史回溯）
- 不使用 `organizationSettings.storageRoot.rootPath` —— 该字段用于**本地资料服务器挂载路径**（事务所自有文件服务器的根目录），是给 `document_files`（资料文件登记）用的。生成文书走的是系统内部存储（`StorageAdapter`），与事务所本地资料服务器无关。

### 3.3 fileUrl 最终值

生成完成后，`generated_documents.file_url` 存储的是 **storage key**（不是完整 URL）。

前端下载时，需要通过新增的 `GET /api/generated-documents/:id/download` 端点获取 signed URL（或直接 stream 文件内容）。这避免了将 storage key 暴露给前端，也兼容未来切换到 S3 等对象存储。

#### 替代方案：直接存完整 URL

| | 存 storage key | 存完整 URL |
|---|---|---|
| 迁移成本 | 切 S3 时无需改数据 | 切 S3 时需 backfill 全量 file_url |
| 安全 | key 不含签名，无过期泄漏 | signed URL 有 TTL，过期后 DB 里存的失效 |
| 实现复杂度 | 需新增下载端点 | 无需新端点 |

推荐存 storage key + 新增下载端点。

#### 不做的后果

继续存 `placeholder://` URL → 用户无文件可下载。

---

## 4. 状态机扩展

### 4.1 现状

```ts
type GeneratedDocumentStatus = "draft" | "final" | "exported";

const STATUS_TRANSITIONS: Record<string, Set<string>> = {
  draft: new Set(["draft", "final"]),
  final: new Set(["final", "exported"]),
  exported: new Set(["exported"]),
};
```

### 4.2 扩展后

```ts
type GeneratedDocumentStatus =
  | "draft"
  | "final"
  | "exporting"
  | "exported"
  | "export_failed";

const VALID_STATUSES = new Set([
  "draft", "final", "exporting", "exported", "export_failed",
]);

const STATUS_TRANSITIONS: Record<string, Set<string>> = {
  draft:         new Set(["draft", "final"]),
  final:         new Set(["final", "exporting"]),      // 不再直接到 exported
  exporting:     new Set(["exported", "export_failed"]),
  exported:      new Set(["exported"]),
  export_failed: new Set(["exporting"]),                // 重试
};
```

#### 新增状态说明

| 状态 | 含义 | 由谁写入 |
|---|---|---|
| `exporting` | 已入队，渲染中 | controller.export（同步） |
| `exported` | 渲染完成，文件可下载 | worker handler（异步） |
| `export_failed` | 渲染失败 | worker handler（异步） |

#### 状态流转图

```
draft → final → exporting → exported
                    ↓            
              export_failed → exporting (重试)
```

#### 影响面

- `cases.types-generated-docs.ts`：`GeneratedDocumentStatus` 类型扩展
- `generatedDocuments.service.ts`：`VALID_STATUSES` + `STATUS_TRANSITIONS` 更新
- `validationRuns.service.ts`：`generated_documents_finalized` check 的 `status not in (...)` 条件需加入 `'exporting'`、`'export_failed'`（这两个状态不算 finalized）
- Admin adapter：`CaseAdapterSupportSeams.ts` 的 `GEN_DOC_STATUS_TONES` 新增 `exporting` / `export_failed` 映射
- Admin i18n：`cases.detail.forms.status.exporting` / `exportFailed`
- Admin CaseFormsTab：`exporting` 状态行显示 spinner + "导出中…"；`export_failed` 行显示重试按钮

#### `final → exported` 直通路径的关闭

当前 `final → exported` 是同步 placeholder 写入。扩展后该路径改为 `final → exporting`（入队）→ `exported`（worker 异步）。

**兼容处理**：已有 `status = "exported"` 且 `file_url` 以 `placeholder://` 开头的记录，adapter 侧保持 `isPlaceholderFile` 逻辑不变；前端渲染照旧。只有 `file_url` 不以 `placeholder://` 开头的 `exported` 记录才显示下载链接。

#### 不做的后果

不扩展状态机 → 无法区分"正在渲染"和"渲染完成"，前端无法给用户有效反馈。

---

## 5. 版本快照与重渲染策略

### 5.1 版本快照

C（模板契约打通）在 `generated_documents` 表新增 `template_version_no` 列。这是创建时的**模板版本快照**，标识"用哪个版本的模板生成了这份文书"。

当模板更新后：
- 已生成的文书 `template_version_no` 不变（历史版本不受影响）
- 用户可选择对已有文书发起"重新渲染"（即基于当前最新模板版本重新生成）

### 5.2 重渲染策略

**重渲染 = 新建一条 `generated_document` 记录，而非更新现有记录。**

理由：
- 同一案件同一模板可能有多版文书（`versionNo` 递增），这是已有设计
- 重新渲染本质是"用新模板版本再生成一份"
- 保留旧版本便于比对和审计

流程：
1. 前端调 `POST /api/generated-documents`（create）时带 `templateId`
2. Service 自动递增 `versionNo`，快照当前 `template_version_no`
3. 返回新记录（status=draft）
4. 用户 finalize → export → 走队列渲染

### 5.3 重试 vs 重渲染

| 场景 | 操作 | 生成新记录？ |
|---|---|---|
| export_failed 后重试 | `POST /:id/export`（重新入队同一 ID） | 否，状态回到 exporting |
| 模板更新后重新生成 | `POST /api/generated-documents`（新建） | 是，versionNo + 1 |

#### 不做的后果

不做版本快照 → 无法判断文书是用哪个版本的模板生成的，模板更新后无法追溯。

---

## 6. 失败处理

### 6.1 Worker 侧

```
try {
  // 渲染 + 上传 + status → exported
} catch (err) {
  // status → export_failed
  // timeline: "generated_document.export_failed" + { error: err.message }
  // 不抛异常（不让 worker 循环中断）
}
```

### 6.2 超时保护

`RedisQueue.runWorker` 是简单的 lPop 轮询，没有单 job 超时机制。建议在 handler 内部用 `AbortController` + `setTimeout` 实现软超时：

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), JOB_TIMEOUT_MS);
try {
  await renderWithSignal(controller.signal, ...);
} finally {
  clearTimeout(timeout);
}
```

`JOB_TIMEOUT_MS` 建议默认 120_000（2 分钟），可通过环境变量覆盖。

### 6.3 前端重试

`export_failed` 状态的行显示"重试导出"按钮。点击后调 `POST /:id/export`，controller 检查 `status === "export_failed"` → 允许 → 重新入队 → status 回到 `exporting`。

状态流转：`export_failed → exporting → exported | export_failed`。

### 6.4 幂等性

同一 `generatedDocumentId` 在 `exporting` 状态时，重复调 `export` 端点应返回 409 Conflict（`GD_EXPORT_IN_PROGRESS`），防止重复入队。

---

## 7. 降级路径与 Placeholder 退役计划

### 7.1 Phase 0（当前，D2 之前）

- `export` 端点写 `placeholder://` URL
- 前端 `isPlaceholderFile` 徽章展示"占位 URL · P1 落地"
- 不可下载

### 7.2 Phase 1（D2 落地后）

- `export` 端点入队 → worker 渲染 → 真实文件
- `outputFormat === "docx"` 支持渲染
- `outputFormat === "pdf"` 暂不支持 → `export_failed` + 提示"PDF 渲染未启用，请使用 docx 格式"
- 前端新增状态展示：`exporting`（spinner）/ `export_failed`（重试按钮）
- `isPlaceholderFile` 逻辑保留但新记录不再产生 `placeholder://` URL

### 7.3 Phase 2（placeholder 退役）

条件：
- D2 已在生产运行 ≥ 1 sprint 无事故
- 所有历史 `placeholder://` 记录已被重新渲染或标记为弃用

退役步骤：
1. **数据库**：`UPDATE generated_documents SET file_url = NULL WHERE file_url LIKE 'placeholder://%'`（清除占位 URL，保留记录）
2. **后端**：删除 controller.export 中 placeholder URL 构造逻辑（已在 D2 移除，确认无残留）
3. **前端**：
   - `CaseAdapterSupportSeams.ts`：删除 `isPlaceholderFile` 派生逻辑
   - `types-detail.ts`：从 `FormGenerated` 移除 `isPlaceholderFile` 字段
   - `CaseFormsTab.vue`：删除 `placeholder-badge` Chip 和相关 `v-if`
   - `fixtures-detail.ts`：删除 `isPlaceholderFile` 测试数据
   - 相关测试文件清理
4. **i18n**：删除 `cases.detail.forms.placeholderBadge` key
5. **grep 扫描**：`rg "placeholder://" --type ts --type vue` 确认零残留

涉及文件清单（基于当前 codebase grep）：

| 文件 | 删除内容 |
|---|---|
| `CaseAdapterSupportSeams.ts:285` | `isPlaceholderFile: fileUrl?.startsWith("placeholder://") ?? false` |
| `types-detail.ts:720` | `isPlaceholderFile: boolean` 字段定义 |
| `CaseFormsTab.vue:212-219` | placeholder-badge Chip 模板 |
| `CaseFormsTab.vue:222-223` | `!doc.isPlaceholderFile` 条件 |
| `fixtures-detail.ts:740,751,2129` | 测试 fixture 中 `isPlaceholderFile` 字段 |
| `CaseFormsTab.finalize-export.test.ts` | placeholder 相关 test case |
| `CaseFormsTab.readonly.test.ts` | `isPlaceholderFile` 字段 |
| `CaseAdapterSupportSeams.docs-forms-focused.test.ts:294-308` | `isPlaceholderFile` test case |

#### 不做退役会怎样

`isPlaceholderFile` 逻辑无害但增加代码噪音。新记录不再产生 placeholder URL，旧记录的徽章会一直显示直到手动清理。建议 D2 稳定后 1 sprint 内清理。

---

## 8. 前端轮询策略

D2 落地后，export 从同步变为异步。前端需要处理 `exporting` 中间态：

### 8.1 方案

当列表中存在 `status === "exporting"` 的记录时，`useCaseFormsTab` 发起轮询：

```ts
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 60; // 5 分钟超时

// 当 forms.generated 中有 exporting 状态时启动轮询
watchEffect(() => {
  if (forms.generated.some(d => d.backendStatus === "exporting")) {
    startPolling();
  } else {
    stopPolling();
  }
});
```

轮询 `GET /api/generated-documents?caseId=<id>`（已有端点），刷新列表。

### 8.2 乐观 UI

export 按钮点击后立即将本地状态切为 `exporting`（无需等待 API 返回后再更新）。

---

## 9. 迁移清单（D2 阶段，本 RFC 不实施）

| 序号 | 变更 | 文件 |
|---|---|---|
| M1 | `ALTER TABLE generated_documents ADD COLUMN ...` status CHECK 扩展 | `migrations/050_*.up.sql` |
| M2 | 新增 handler | `jobs/handlers/generatedDocExportHandler.ts` |
| M3 | `worker.ts` 注册队列 | `src/worker.ts` |
| M4 | controller.export 改为入队 | `generatedDocuments.controller.ts` |
| M5 | service STATUS_TRANSITIONS 扩展 | `generatedDocuments.service.ts` |
| M6 | types 扩展 | `cases.types-generated-docs.ts` |
| M7 | 新增下载端点 | `generatedDocuments.controller.ts` |
| M8 | validation check 兼容 | `validationRuns.service.ts` |
| M9 | Admin adapter 新状态 | `CaseAdapterSupportSeams.ts` |
| M10 | Admin 轮询 + UI | `useCaseFormsTab.ts` / `CaseFormsTab.vue` |
| M11 | i18n 三语种 | `zh-CN.ts` / `ja-JP.ts` / `en-US.ts` |
| M12 | 引入 `docx-templates` | `package.json` / `package-lock.json` |

---

## 10. 评审清单

请逐项确认或反对：

- [ ] **Q1 — 队列选型**：新增 `generated_doc_export_jobs` 队列，复用 `RedisQueue`，不引入 Bull/BullMQ。
- [ ] **Q2 — 渲染方案**：P1 首发仅支持 docx（纯 Node `docx-templates`），PDF 暂降级为 `export_failed`；P2 另行 RFC 决策 PDF 方案。
- [ ] **Q3 — 新依赖 `docx-templates`**：确有必要，无替代方案。需特批引入。
- [ ] **Q4 — Storage key 规范**：`generated-documents/<orgId>/<id>/v<n>.<ext>`，不走 `organizationSettings.storageRoot`。
- [ ] **Q5 — fileUrl 存 storage key**：前端通过新增下载端点获取 signed URL，不直接暴露 key。
- [ ] **Q6 — 状态机扩展**：`final → exporting → exported / export_failed`，关闭 `final → exported` 直通。
- [ ] **Q7 — 重试策略**：`export_failed → exporting`，handler 内 2min 软超时。
- [ ] **Q8 — 幂等**：`exporting` 状态下重复 export 返回 409。
- [ ] **Q9 — 重渲染 = 新建记录**：不覆盖旧版本。
- [ ] **Q10 — Placeholder 退役**：D2 稳定 1 sprint 后清理，涉及 8 个文件。
- [ ] **Q11 — 前端轮询**：5s 间隔，5min 超时，watchEffect 驱动。
- [ ] **Q12 — Docker 镜像不变**：P1 无系统依赖新增，Alpine image 不变。

---

## 11. 开放决策点（需产品/架构确认）

| # | 问题 | 建议 | 如果不决策会怎样 |
|---|---|---|---|
| O1 | P1 是否只支持 docx 不支持 PDF？ | 是，PDF P2 再做 | D2 可以落地但 PDF 导出会 fail |
| O2 | `docx-templates` 是否允许引入？ | 允许（MIT 协议，无安全风险） | 无法填充模板变量，只能生成空白文件 |
| O3 | 是否需要对象存储（S3）而非本地存储？ | P1 用 local，S3 adapter 已预留 | 本地存储足够，多节点部署再切 S3 |
| O4 | 下载端点是 signed URL redirect 还是 stream？ | 建议 stream（简单且兼容 local/S3） | 两种都可实现，但需统一 |
| O5 | 模板内容存 DB (template_body) 还是文件系统？ | 取决于 C 的实现；建议 DB（便于版本管理） | D2 handler 需要知道去哪里读模板 |

---

## 附录 A：现有代码引用

| 文件 | 相关行 | 内容 |
|---|---|---|
| `infra/queue/redisQueue.ts` | 全文 | RedisQueue 类：enqueue / dequeue / runWorker |
| `infra/storage/storageAdapter.ts` | 全文 | StorageAdapter 接口 + local/s3 实现 |
| `jobs/handlers/exportJobHandler.ts` | 全文 | 现有 CSV 导出 handler（参考模式） |
| `worker.ts:50-55` | `REGISTERED_QUEUES` | 已注册的 4 条队列 |
| `worker.ts:166-184` | `Promise.all([...])` | 并发启动所有 worker |
| `generatedDocuments.service.ts:22-29` | `VALID_STATUSES` / `STATUS_TRANSITIONS` | 当前状态机 |
| `generatedDocuments.controller.ts:262-290` | `export` 方法 | 当前 placeholder 写入逻辑 |
| `cases.types-generated-docs.ts:22` | `GeneratedDocumentStatus` | 当前 3 状态类型 |
| `organizations.service.ts:29-31` | `storageRoot.rootPath` | 事务所本地资料服务器路径（不用于生成文书） |
| `release/docker/server.Dockerfile` | 全文 | 基础镜像 `node:20-alpine`，无 LibreOffice/wkhtmltopdf |
| `CaseAdapterSupportSeams.ts:285` | `isPlaceholderFile` | 占位标识派生逻辑 |
