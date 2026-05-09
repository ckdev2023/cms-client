# D3 文書真实化渲染管线 — 开发计划

- **Plan ID**: `d3-document-rendering-pipeline`
- **生成日期**: 2026-05-09
- **作用**: 把 worker handler 中的占位 stub `renderDocument` 替换为可投产的真实文書渲染管线
- **总 PR 估算**: ~23 个 PR（落在 18-28 区间）
- **总工时估算**: ~210 小时（≈ 5–7 周）
- **范围**: P1 阶段 — 11 份官方 DOCX 模板 + 渲染管线 + finalize/export preflight + 灰度上线 + 退役 D2 stub

> 业务决策（B1-B5）已拍板，行政書士实务对照评审 22 条已落地到设计文档。
> 本目录**只产出开发计划**，不写实现代码、不修改设计文档。

---

## 阅读顺序

1. **`master-plan.md`** — 顶层计划：背景、目标、依赖图、里程碑、风险登记
2. **`manifest.json`** — 机器可解析任务清单（用于 cursor agent 调度；通过 `jq` 校验）
3. **`epics/E01-...md` → `E15-...md`** — 15 个 epic 的细化任务清单 / 验收 / 回退
4. **`runbook.md`** — 落地执行手册：命令序列 / feature flag 开关 / 回退脚本 / dev 冒烟

---

## 必读设计文档（按优先级）

| # | 文档 | 作用 |
|---|---|---|
| 80 | [`80-rfc-document-rendering-pipeline-2026-05-09.md`](../../../docs/gyoseishoshi_saas_md/_output/80-rfc-document-rendering-pipeline-2026-05-09.md) | D3 渲染管线 RFC（最高权威） |
| 81 | [`81-spec-document-rendering-context-schema-v1-2026-05-09.md`](../../../docs/gyoseishoshi_saas_md/_output/81-spec-document-rendering-context-schema-v1-2026-05-09.md) | RenderContext v1 字段字典 |
| 82 | [`82-spec-document-template-governance-2026-05-09.md`](../../../docs/gyoseishoshi_saas_md/_output/82-spec-document-template-governance-2026-05-09.md) | 模板生命周期 / 审核 / 灰度治理 |
| 83 | [`83-AUDIT-gyoseishoshi-practice-review-2026-05-09.md`](../../../docs/gyoseishoshi_saas_md/_output/83-AUDIT-gyoseishoshi-practice-review-2026-05-09.md) | 行政書士实务对照评审 22 条（P0×8 + P1×9 + P2×5） |
| 78 | [`78-MCP-docs-forms-walkthrough-2026-05-09-v7.md`](../../../docs/gyoseishoshi_saas_md/_output/78-MCP-docs-forms-walkthrough-2026-05-09-v7.md) | 症状暴露走查 |

---

## Epic 速查表

| Epic | 标题 | Owner | 估时(h) | PR 数 | 阶段 |
|---|---|---|---:|---:|---|
| E01 | 迁移 + TS 类型扩展 | backend | 12 | 2 | M1 |
| E02 | renderer 核心（mapper / preflight / fillDocx） | backend | 24 | 4 | M2 |
| E03 | handler 改造（接入真实管线） | backend | 14 | 2 | M3 |
| E04 | finalize 422 + 共享 preflight | backend | 10 | 2 | M3 |
| E05 | 11 份官方 DOCX 模板上传 + variables_schema | backend + ops | 28 | 4 | M3-M4 |
| E06 | contract test 三件套 | backend | 12 | 1 | M4 |
| E07 | admin missing 清单 + 跳转 | frontend | 14 | 2 | M5 |
| E08 | narrative free text 输入（CaseFormFinalizeModal 新增） | frontend | 14 | 2 | M5 |
| E09 | PII 字段级权限 + audit log | fullstack | 18 | 2 | M5 |
| E10 | disclaimer 同意 UI + ToS 接入 | fullstack | 12 | 1 | M5 |
| E11 | 模板治理 admin（运营/法务） | fullstack | 24 | 3 | M5-M6 |
| E12 | 三语 i18n 集中落 | frontend | 8 | 1 | M5 |
| E13 | 可观测性（fill_rate / failure_reason 看板） | fullstack | 10 | 1 | M6 |
| E14 | feature flag `GD_RENDER_PIPELINE_V3` + rollout | backend | 10 | 1 | M6 |
| E15 | 退役 D2 stub + 旧记录处理 | backend | 8 | 1 | M7 |

> 总 PR ≈ 29，但 E05/E11/E07/E08/E09 等 PR 内部有多 task 合并空间 → 实际预估 23-25 PR；详见 `manifest.json`。

---

## 命名约定

- Task ID：`E<NN>-T<N>`（如 `E01-T1`）
- 分支命名：`d3/<epic>-<task>` 或 `d3/<epic>-<short-desc>`
- PR 标题：`[D3/E0X] <short title>`
- migration 编号：续接现有 058，从 **059 起**（迁移 059–064 共 6 条）

---

## 不在本计划范围

- 申請書 PDF（入管定式）AcroForm 自动填表 → **P3 单独 RFC**
- 服务端 PDF 直出（docx → PDF）→ **P2 单独 RFC**
- 翻訳証明書 / 報酬請求書 / 領収書 / 業務報告書 → **P2 单独 RFC**
- 印影 PNG 嵌入 → **P2**
- 業務帳簿自動生成 → **P3 评估**
- 多语种自动翻译 → **P2**
- 在线模板编辑器 → **P2 评估**
- 会社設立 / 許認可 / 相続 类 caseType → **P2 caseType 扩展**
- 事务所自定义模板上传 → **P2**
