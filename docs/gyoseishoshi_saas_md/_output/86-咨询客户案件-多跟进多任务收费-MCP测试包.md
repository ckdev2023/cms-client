# 咨询线索 — 多轮跟进 / 多任务 / 收费：Chrome DevTools MCP 测试包

> **用途**：在端到端链路（咨询 → 客户 → 案件 → **收费回款**）上，覆盖 **多次回来沟通（跟进记录）** 与 **多任务**，并给出 **可替换盐值的测试数据集**（JSON Bundle）。  
> **日期**：2026-05-14  
> **权威业务引用**：[P0/04 §4.1](../P0/04-核心流程与状态流转.md#41-咨询转案件)、[P0/06-咨询线索](../P0/06-页面规格/咨询线索.md)（跟进 Tab、[§会话](../P0/06-页面规格/咨询线索.md)）、[P0/06-收费与财务](../P0/06-页面规格/收费与财务.md)  
> **主流程 MCP 路由器由**：[85-咨询到客户到案件全流程-Chrome-DevTools-MCP测试手册.md](./85-咨询到客户到案件全流程-Chrome-DevTools-MCP测试手册.md) —— 本文在其上增加 **量变场景**（多跟进、多任务、多笔回款）与 **数据文件**。

**测试数据文件（机器可读）**：[`fixtures/mcp-e2e-multitouch-multi-task.bundle.json`](./fixtures/mcp-e2e-multitouch-multi-task.bundle.json)。

- **`REPLACE_RUN_SALT`**（若仍出现在邮箱等字段模板中）：替换为短随机字母数字串，避免与客户/邮箱去重冲突。
- **`REPLACE_PHONE_DIGITS`**（必填，仅用于电话）：替换为一段**纯数字**盐（例如 8 位十进制：`90887766`），使 `lead.phoneTemplate` 展开后满足 Admin `isValidPhone`（不接受字母）。勿将字母盐填入电话字段，否则「创建线索」会持续禁用且无明确原因（新版 Admin 已在电话下方展示格式提示）。与 `meta.phoneDigitsPlaceholder` 对齐。

---

## （补充）占位符：`REPLACE_RUN_SALT` vs `REPLACE_PHONE_DIGITS`

Bundle 默认：`emailTemplate` 等仍可使用 `REPLACE_RUN_SALT`；`phoneTemplate` 使用独立占位 `REPLACE_PHONE_DIGITS`，避免 MCP 填入 `+8190abc…` 导致前端校验卡住。

---

## 1. 场景范围

| 能力 | 本包是否必选 | 说明 |
|------|--------------|------|
| 线索新建 + 状态推进（至 `signed`） | ✓ | 与 85 手册 §3 一致 |
| **多条跟进记录**（模拟多次回来沟通） | ✓ | `POST .../followups` × N |
| 转客户 → 转案件（两步） | ✓ | ADR：先 `convert-customer` 再 `convert-case` |
| **多个案件任务** + 可选完成 1 条 | ✓ | `POST /tasks`；完成动作见 §4 |
| 收费计划（若为空先建）+ **≥2 笔登记回款** | ✓（建议） | 验证累计已收 / 列表一致性 |
| 会话 Tab「多轮 IM」 | ○ | **单独用例**：见 §6；不作为本包失败条件 |

---

## 2. 故事线（可读剧本）

同一天或跨天均可；以下 **T+N** 仅表示「建议在界面里体现时间间隔」，不必真的改服务器时间：

1. **T+0**：新建线索；状态 → `following`；写 **跟进 #1（电话）** —— 首轮摸底。  
2. **T+2**：**跟进 #2（邮件）** —— 客户邮件补充材料意图。  
3. **状态** → `pending_sign`。  
4. **T+9**：**跟进 #3（面谈）** —— 线下敲定方案。  
5. **T+11**：**跟进 #4（IM）** —— 微调范围；状态 → **`signed`**。  
6. **转化**：仅建立客户档案 → 签约并开始建档 → 向导完成 → 得到 `caseId`。  
7. **案件**：依次创建 **任务 A（高优先级） / B（普通） / C（低）**；可按数据文件 **任选完成 B**（验证完成流）。  
8. **收费**：在案件收费侧配置/确认计划后，登记 **两笔回款**（金额取自 JSON）；最后在 **#/billing** 列表交叉扫一眼该案。

---

## 3. 多轮跟进（沟通）— MCP 操作建议

### 3.1 路由与 API

| 动作 | Tab / URL | Network |
|------|-----------|---------|
| 打开跟进表单 | `#/leads/:id?tab=followups`（或等价 Tab 名「跟进记录」） | — |
| 提交一条跟进 | 表单提交 | **`POST .../leads/:id/followups`** → 2xx |
| 刷新时间线 | 等待 UI 聚合刷新或返回详情 | **`GET .../leads/:id`**（若前端整页拉取） |

### 3.2 表单字段 ↔ API 映射（渠道）

前端 `FollowupChannel`：`phone` | `email` | `meeting` | `im`（见 `packages/admin/src/views/leads/types-detail.ts`）。

写入 API 时的映射（`leadFollowupChannelApi.ts`）：

| UI / 表单 | `mapLeadFollowupChannelToApi` 出站 |
|-----------|-----------------------------------|
| `phone` | `phone` |
| `email` | `email` |
| `meeting` | **`onsite`** |
| `im` | **`other`** |

**MCP 断言**：可在 Network 请求体里看到上述 **出站** 值；展示层可能把 `onsite` 显示为「面谈」。

### 3.3 每条跟进的建议最小字段

与规格 [咨询线索 §3 Tab2](../P0/06-页面规格/咨询线索.md) 对齐：**渠道、摘要、结论、下一步、下次跟进时间**（若 UI 要求则全部填写）。具体文案见 JSON `followUps[]`。

### 3.4 与「状态调整」穿插顺序

推荐顺序：**先跟进再调状态** 或 **先调状态再跟进** 均可，但 **必须在 `signed` 之后** 再做 `convert-customer`，否则头部按钮 preset 可能不符合预期（见 85 §3.1）。本包剧本采用「多跟进穿插两次状态跃迁」以覆盖组合。

---

## 4. 多任务 — MCP 操作建议

### 4.1 入口

- **案件详情** → **任务** 区块 → **新建任务**（实现为 `CaseTaskCreateModal`，见 `CaseDetailView.vue`）。  
- 创建成功应出现对应 **`POST`** 到 tasks 集合（Admin 侧通过 `buildTasksPostUrl` 构造，一般为 **`/api/tasks`**，与 cases 基路径同源裁剪）。

### 4.2 字段与优先级

与 `CaseAdapterTaskWriteBuilders.ts` 一致：

- `title`（必填）  
- `description`（可选）  
- `priority`：`low` | `normal` | `high` | `urgent`  
- `dueAt`（可选，ISO 日期/时间以界面控件为准）  
- `assigneeUserId`（可选；测试数据未强制，按环境选人）

### 4.3 断言清单

- 创建 3 条任务后，任务列表 **计数 +3**（或列表出现三行标题）。  
- **可选**：对 `items[1]` 执行「完成」—— 观察 **完成接口** 2xx 与 UI 状态（已完成/划线等，以 i18n 为准）。

---

## 5. 收费 — MCP 操作建议

规范入口见 [收费与财务](../P0/06-页面规格/收费与财务.md)：案件详情 **「收费」Tab**、全局 **`#/billing`**、仪表盘待回款卡片。

### 5.1 本包路径

1. 在 **案件详情 → 收费**：若空态提示需先配置计划，则先 **创建收费计划 / 应收节点**（具体按钮文案因版本略有差异）。  
2. **登记回款** 两次，金额与备注使用 JSON `billing.payments[]`。  
3. 通过案件上的「查看收费 / 去收费列表」类入口（实现上常见 `router.push({ path: '/billing', query: { case } })`）打开 **`/billing?case=...`**，确认列表与汇总 **与案件侧一致**。

### 5.2 Network 提示

- 回款创建应对应 **写操作**（`POST`/`PATCH` 之一，以当前版本为准）**2xx**。  
- 若存在「欠款继续提交」类风险确认，本包 **不强制** 触发；若误触，按 [收费与财务 §4](../P0/06-页面规格/收费与财务.md) 留痕规则单独记一条用例。

---

## 6. 会话 Tab（多次 IM）— 可选平行用例

咨询线索 **Tab 会话** 用于聚合 `Conversation` 列表（规格 [咨询线索 §3 Tab4](../P0/06-页面规格/咨询线索.md)）。当前 aggregate 可能未挂载列表时，**空态不视为本包失败**（与 85 §3.6 一致）。

若环境已打通会话写入：

- 单开 **S-CONV-1**：对同一 `leadId` 写入 **≥2 条会话/消息**（渠道 `im` / `web` 等），再打开 `#/leads/:id?tab=conversations` 验证倒序与预览。  
- **不要**与「无会话集成环境」的冒烟失败混为一谈。

---

## 7. Chrome DevTools MCP：推荐工具序列（扩展）

下列步骤接续 85 §6 / §11；**每一步后优先 `take_snapshot` 换新 uid**。

| 次序 | 动作 | 断言 |
|------|------|------|
| 1 | `navigate_page` → 登录 Admin | 控制台无阻断性错误 |
| 2 | 新建线索（`#/leads?action=new`） | `POST .../leads` 2xx |
| 3 | 打开 `#/leads/:id?tab=followups` | `wait_for` 跟进表单或 Tab 文案 |
| 4 | **`fill_form` 提交跟进 #1～#N**（N=4） | 每次 `POST .../followups` 2xx |
| 5 | 头部「调整状态」按 `statusPath.transitions[]` | 每次 `PATCH .../status` 2xx |
| 6 | 转化两步 + 向导 | `convert-customer` / `convert-case` 2xx |
| 7 | `#/cases/:id` → 新建任务 ×3 | `POST .../tasks` 各 2xx |
| 8（可选） | 完成任务 B | 完成接口 2xx |
| 9 | 收费 Tab → 回款 ×2 → `#/billing?case=` | UI 汇总 + `list_network_requests` 抽查 |

---

## 8. 数据维护与并行跑

| 课题 | 建议 |
|------|------|
| 电话 / 邮箱去重 | 邮箱模板等仍可用 `REPLACE_RUN_SALT`（小写字母数字）；**电话**须用 Bundle 独立占位 `REPLACE_PHONE_DIGITS`（**仅数字**，见上文） |
| Group / Owner | 登录账号须有权限；Bundle 仅存 `*_Hint` |
| 案件模板与资料清单 | Wizard 选择与 `canonicalCaseTypeSeed` 对齐可避免「空清单」假阳性（见 85 §5.1） |
| CI | 若要自动化，优先在同一故事线后 **`DELETE` 清理 APIs**（若环境提供）；本地 MCP 可走查后不清理 |

---

## 9. 回链索引

| 文档 | 关系 |
|------|------|
| [85-咨询到客户到案件…](./85-咨询到客户到案件全流程-Chrome-DevTools-MCP测试手册.md) | 主路由、按钮矩阵、会话 Tab 已知缺口 |
| [fixtures/mcp-e2e-multitouch-multi-task.bundle.json](./fixtures/mcp-e2e-multitouch-multi-task.bundle.json) | **结构化测试输入** |

---

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-05-14 | 首版：多跟进 + 三任务 + 双回款 JSON Bundle；同日 MCP 走查：电话模板改为数字盐占位 `REPLACE_PHONE_DIGITS`、新建线索弹窗补充电话/邮箱格式提示 |
