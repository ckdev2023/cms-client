# 客户/案件模块（admin）— 事务所流程驱动走查 Bug 清单（第三轮）

> 生成日期：2026-04-28
> 走查依据：
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（20 步状态机 / 数据结构 / 业务规则）
> - `docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md`（7 场景资料矩阵）
> 走查工具：`chrome-devtools-mcp` + `curl`（API 直查）
> 走查环境：`http://localhost:5173/#/`，本地 admin（`admin@local.test` / `Admin123!`）
> 截图归档：`docs/gyoseishoshi_saas_md/_output/screens/16~22*.png`

---

## 0. 第三轮总结

### 0.1 走查范围

| # | 业务规范节点 | 验证方式 | 结果 |
|---|---|---|---|
| 1 | Step 1-6 咨询 → 签约 → 发资料清单 | 客户详情/建案向导/i18n | **FAIL** — 客户实体缺 `location/source_type/visa_type`，资料清单与场景脱节 |
| 2 | Step 7-12 资料制作 → 内审 → 提交入管 | `/api/cases` 状态机 + 详情页 | **FAIL** — 状态机仅 S1-S9，且不强制顺序，详情页 500 |
| 3 | Step 13-14 入管结果 / 补资料循环 | `transition` API + 列表筛选 | **FAIL** — 无 NEED_SUPPLEMENT 等状态，无 `supplement_count` 透出，无补资料子状态 |
| 4 | Step 15-18 收尾款 / COE / 海外返签 | UI + `/api/cases` 字段 | **FAIL** — `coeSentAt/overseasVisaStartAt/entryConfirmedAt` 仅存字段无 UI 操作；CLOSED_FAILED 路径缺失 |
| 5 | Step 19-20 在留期间记录 / 续签提醒 | `/api/residence-periods` + `/api/reminders` | **FAIL** — 提醒任务不会自动生成，日期字段写入偏 1 天 |
| 6 | 资料矩阵 7 场景 | 建案向导 + Document Center | **FAIL** — 模板只有 3 个，未按 7 场景驱动；Document Center 仍是 fixture |

### 0.2 第三轮新增 Bug 数

| 优先级 | 数量 | 说明 |
|---|---|---|
| P0 | 8 | 状态机模型缺位 / 详情聚合 500 / 资料模板未入仓 / 在留期间提醒未触发 / `customerId` 维度数据完全脱节 |
| P1 | 9 | UI 字段未本地化 / 时间戳被截首字 / case# UUID 泄漏 / 模板预览章节中文写死 |
| P2 | 4 | URL `?tab=communications` 不识别、Search 框假阳、Owner 名混用 |
| **总计** | **21** | — |

### 0.3 三句话结论

1. **admin 的 case 状态机还停在 S1-S9 的"操作步骤"维度，与业务规范的 20 状态业务模型完全不对齐**：没有 `CONSULTING / CONTRACTED / WAITING_MATERIAL / NEED_SUPPLEMENT / APPROVED / COE_SENT / VISA_APPLYING / SUCCESS / CLOSED_SUCCESS / CLOSED_FAILED` 等关键节点；`POST /api/cases/:id/transition` 不强制顺序，可以从 S2 一步跳到 S9（已归档），违反"补资料循环结束后只允许进入 APPROVED/REJECTED"等业务约束。
2. **资料清单矩阵（7 场景：经管签 4 个月/1 年/续签、公司设立、技人国认定/续签、企业内転勤）完全没有以模板形式落仓**：建案向导只硬编码 3 个 zh-CN 模板（家族/技人国/经营管理），其中"经营管理"模板把 `biz_mgmt_cert_4m / biz_mgmt_cert_1y / biz_mgmt_renewal / company_setup` 4 个差异巨大的场景压成一份 9 项的 stub；Document Center 仍是 fixture 案件（A2026-001/002/003），新建的真实 case 不出现。
3. **跨 case 详情/在留期间/活动日志全是"半成品"的小细节**：`/api/cases/:id/aggregate` 对任意新建 case 都 500，详情页直接 "Case not found"；`/api/residence-periods` POST 后 `reminderCreated:false` 且 `validFrom/validUntil` 偏移 1 天；客户活动日志 Time 列形如 `ue Apr 28 2026 ...`（**首字母 T 被截掉**）—— 这些细节合起来让"经管签全流程"在 admin 内根本无法跑完一遍。

---

## 1. P0 — 阻塞经管签端到端流程

### BUG-062 [P0][FE/API] 案件状态机仅 S1-S9，与业务规范 20 状态完全脱节

- **依据**：`docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md` § 状态说明 + 流程节点定义
- **位置**：
  - 后端：`packages/server/src/modules/core/cases/cases.service.ts` 状态枚举
  - 前端：`packages/admin/src/views/cases/constants.ts` `CASE_STAGES`
- **现象**：admin 当前 stage 仅 S1-S9（"刚开始办案 / 资料收集中 / 资料待补审核中 / 文书制作中 / 提交前检查 / 可安排提交 / 已提交待回执 / 结果待确认 / 已归档"），缺失 14 个业务关键节点：
  - `CONSULTING / CONTRACTED / WAITING_MATERIAL / MATERIAL_PREPARING / REVIEWING / APPLYING / UNDER_REVIEW`
  - `NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING`
  - `APPROVED / REJECTED`
  - `WAITING_PAYMENT / COE_SENT / VISA_APPLYING / SUCCESS / VISA_REJECTED`
  - `RESIDENCE_PERIOD_RECORDED / RENEWAL_REMINDER_SCHEDULED`
  - `CLOSED_SUCCESS / CLOSED_FAILED`
- **影响**：
  - Step 13-14 入管结果路由（APPROVED / REJECTED / NEED_SUPPLEMENT）没有任何 stage 表达
  - Step 15-18 COE 发送、海外返签的状态机完全无法表示
  - Step 19-20 续签提醒触发条件 `RESIDENCE_PERIOD_RECORDED` 状态不存在
  - 收口规则"所有流程最终必须进入 CLOSED_SUCCESS / CLOSED_FAILED"无法验证 → 系统永远只能 archive 到"S9 已归档"
- **建议**：状态机模型需要分两层（业务流程 stage + 操作进度 substep），或把 S1-S9 重新对应到业务 20 状态；至少要补 NEED_SUPPLEMENT、APPROVED、REJECTED、COE_SENT、CLOSED_SUCCESS、CLOSED_FAILED。

### BUG-063 [P0][API] `POST /api/cases/:id/transition` 不强制状态机顺序，可任意跳跃

- **位置**：`packages/server/src/modules/core/cases/cases.service.ts` `transition()`
- **现象**：S1 → S2 → S9 的跳跃被 API 接受：

  ```bash
  CASE=cbdd7cf6-ce5e-4696-823c-4e502c88c1dd
  # 1. S1 → S2
  curl -s -X POST "http://localhost:5173/api/cases/$CASE/transition" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"toStage":"S2"}'                             # 201, stage=S2

  # 2. S2 → S9（跳过 S3/S4/S5/S6/S7/S8 共 6 个阶段）
  curl -s -X POST "http://localhost:5173/api/cases/$CASE/transition" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"toStage":"S9"}'                             # 201, stage=S9 ← 直接归档
  ```

- **业务约束**：业务规范明确「补资料流程可循环 → 结束后只允许进入 APPROVED/REJECTED」「APPROVED → WAITING_PAYMENT → COE_SENT → VISA_APPLYING」「未记录有效期间不得自动 CLOSED_SUCCESS」；当前 admin 的 transition 没有任何顺序/守卫。
- **影响**：业务上"未提交入管"的 case 也能被一步归档，绕过提交检查、提醒任务、收尾款、COE 发送等所有强制环节；审计可信度坍塌。

### BUG-064 [P0][API] `GET /api/cases/:id/aggregate` 任何新建 case 全部 500，详情页直接 "Case not found"

- **位置**：`packages/server/src/modules/core/cases/cases.service.ts` `getDetailAggregate()`
- **现象**：通过 `POST /api/cases` 创建合法案件后，`GET /api/cases/:id` 返回 200，但 `GET /api/cases/:id/aggregate` 500：

  ```bash
  curl -s -X POST 'http://localhost:5173/api/cases' \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"customerId":"97f1c48d-7f21-4a83-aed1-9728ebef59ec",
         "caseTypeCode":"family",
         "ownerUserId":"00000000-0000-4000-8000-000000000011",
         "caseName":"Tani Family Stay","stage":"S1"}'
  # → 201 OK, id=cafc4ec5-1020-4423-8a50-ce036789aa1d

  curl -s -H "Authorization: Bearer $TOKEN" \
    'http://localhost:5173/api/cases/cafc4ec5-1020-4423-8a50-ce036789aa1d'
  # → 200 OK

  curl -s -H "Authorization: Bearer $TOKEN" \
    'http://localhost:5173/api/cases/cafc4ec5-1020-4423-8a50-ce036789aa1d/aggregate'
  # → {"statusCode":500,"message":"Internal server error"}
  ```

- **UI 表现**：`/#/cases/:id` 直接显示「Case cafc4ec5-... not found」+「Back to case list」（截图 `screens/16-case-detail-aggregate-500-not-found.png`）。
- **影响**：从案件列表点 "View detail"、从客户 Cases tab 点 "Open case" 全都进入空白状态，**整个案件详情页对真实数据不可用**。BMV 走完 round 2 BUG-039 之后即便能下单，也走不到详情页。

### BUG-065 [P0][FE] 建案向导只有 3 个模板（家族/技人国/经营管理），与业务规范 7 场景脱节

- **位置**：`packages/admin/src/views/cases/components/CaseCreateStep1.vue` 模板列表
- **现象**：截图 `screens/17-case-create-templates-disabled.png` / `19-case-create-bmv-checklist-stub.png`。三个模板：
  - 家族滞在 → 对应业务无单独场景，只是「条件必需材料 (仅家族滞在时)」
  - 技人国 → 同时承担 `eng_humanities_intl_cert` + `eng_humanities_intl_renewal`
  - 经营管理 → 同时承担 `biz_mgmt_cert_4m` + `biz_mgmt_cert_1y` + `biz_mgmt_renewal` + `company_setup`
- **缺失场景**：
  - `company_setup`（公司设立资料包，3000 万入资 + 印鉴证明）—— 完全没有
  - `intra_company_transfer`（企业内転勤，要转勤命令 + 集团内调动证明）—— 完全没有
  - 经管签 4 个月 vs 1 年的资料差异（4 个月偏创业期、1 年偏公司落地）—— 同一模板表达
  - 技人国 认定 vs 续签的资料差异（认定看学历职历、续签看税务社保）—— 同一模板表达
- **影响**：对接业务后系统选不出正确模板 → 模板预览的资料清单一律错；后续 Document Center 跟单也跟错。

### BUG-066 [P0][FE] 建案向导资料清单只显示 8-9 项，与 7 场景规范的 18-25 项相差甚远

- **位置**：建案向导 Step 2「Document checklist preview」区
- **实测对照**：
  | 选择模板 | 向导预览 | 业务规范要求 | 缺口 |
  |---|---|---|---|
  | 家族滞在（默认） | 8 项（护照首页/证件照/亲属关系/在留卡/课税证明/在职证明/理由书/检查单） | 主场景需先确定，家族滞在仅作为「条件必需」 | 没有主场景前提 |
  | 技人国 | 8 项（护照首页/履历书/学历资格/雇佣合同/公司概要/决算/理由书/检查单） | 技人国认定 19 必需 + 4 条件；续签 13 必需 | 缺学位证明、成绩证明、源泉征收票、雇用保险编号、员工列表、雇用条件通知书、健康保险证等 |
  | 经营管理 | 9 项（护照首页/证件照/事业计划书/事务所租赁合同/登记事项证明书/定款/决算报告/理由书/检查单） | 1 年 25 必需；4 个月 18 必需；续签 12 必需；公司设立 7 必需 | 缺资本金 3000 万证明、资本来源证明、印鉴证明、住民票、设立申报、役员报酬决议记录、雇用保险编号、交易方名片等 |
- **截图**：`screens/18-case-create-step2-checklist-stub.png`、`screens/19-case-create-bmv-checklist-stub.png`
- **影响**：管理员按 admin 走流程时只会收 8-9 份资料，远低于真实场景 18-25 份；真要补齐时既无清单也无生成器。

### BUG-067 [P0][API] `POST /api/residence-periods` 成功后 `reminderCreated:false`，续签提醒任务不会自动产生

- **业务规则**：「只要存在有效的在留到期日，系统必须自动生成续签提醒任务」「默认建议提醒时间：到期前 180/90/30 天」「若提醒任务创建失败，案件不得自动进入 CLOSED_SUCCESS」
- **位置**：`packages/server/src/modules/core/residence-periods/residencePeriods.service.ts`
- **复现**：

  ```bash
  curl -s -X POST 'http://localhost:5173/api/residence-periods' \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{
      "caseId":"cbdd7cf6-ce5e-4696-823c-4e502c88c1dd",
      "customerId":"97f1c48d-7f21-4a83-aed1-9728ebef59ec",
      "visaType":"BUSINESS_MANAGER",
      "statusOfResidence":"経営・管理",
      "validFrom":"2026-09-01","validUntil":"2030-09-01","periodYears":4
    }'
  # → 201, "reminderCreated": false
  curl -s -H "Authorization: Bearer $TOKEN" \
    'http://localhost:5173/api/reminders?caseId=cbdd7cf6-ce5e-4696-823c-4e502c88c1dd'
  # → {"items":[],"total":0}   ← 没有自动派生任务
  ```
- **影响**：Step 19-20 的续签提醒链路是空的；如果按 admin 流程结案，`CLOSED_SUCCESS` 永远不会被自动触发，违反「未记录提醒不得自动结案」的业务规则。

### BUG-068 [P0][API] `POST /api/residence-periods` 日期字段被偏移 1 天（时区 bug）

- **位置**：`residencePeriods.service.ts` 写库前的日期序列化
- **复现**：发送 `validFrom: "2026-09-01"` / `validUntil: "2030-09-01"`，回包：

  ```json
  {
    "validFrom": "2026-08-31",
    "validUntil": "2030-08-31"
  }
  ```
- **根因**：写入时把 ISO `2026-09-01T00:00:00.000Z` 用本地时区（JST = +09:00）转回 date-only，导致回退到前一天。
- **影响**：续签提醒计算（180/90/30 天前）会整体偏 1 天；客户实际到期是 2030-09-01，admin 显示 2030-08-31。

### BUG-069 [P0][FE] 客户实体缺 `location / source_type / visa_type` 等业务核心字段

- **业务规范**：客户实体应包含 `location: OVERSEAS|JAPAN`、`source_type: REFERRAL|WEB|ADS`、`referrer_name`、`visa_type: BUSINESS_MANAGER|ENGINEER|DEPENDENT`（用于扩展预留）。
- **现象**：客户详情页（截图同 round 2 BUG）只有"Display name / Legal name / Furigana / Nationality / Gender / DOB / Phone / Email / Group / Owner / Referral source(自由文本) / Avatar / Note"。
  - 无 `location` 单选（海外 / 日本）
  - 无 `source_type` 枚举下拉，仅"Referral source"自由文本
  - 无 `visa_type` 单选 → 后续根本无法接入"按签证类型分发模板"的扩展点
- **影响**：Step 2 基础信息收集阶段的字段在 admin 全部缺失；客户分流（海外 / 日本）、来源分析（介绍 / 广告 / 自然）也无从做起。

---

## 2. P1 — 字段未本地化 / UI 数据脏

### BUG-070 [P1][FE] 案件列表 Stage 列展示原始 stage 码 `S1`，未走 i18n 字典

- **位置**：`packages/admin/src/views/cases/components/CaseTableRow.vue`
- **现象**：Cases 列表筛选下拉里 stage 全部本地化为 "Case opened / Collecting documents / Drafting forms / ..."，但表格行 Stage 列直接渲染 `S1`。
- **复现**：`/#/cases` → 搜索我们刚建的 case `Tani Family Stay`，Stage 列就是 `S1`。

### BUG-071 [P1][FE] 案件列表 Owner 列展示 UUID，未关联用户名

- **现象**：Cases 列表 Owner 列对真实 case 显示 `00000000-0000-4000-8000-000000000011`；筛选下拉里却又有 "Suzuki / Tanaka / Li / Sato / Shota Yamada / ..."（fixture）。
- **影响**：与 round 2 BUG-051 的"Owner 名字 4 套混用"互为补集 —— 这次列表干脆把名字漏过来了直接渲染 UUID。

### BUG-072 [P1][FE] 案件列表 Risk 列展示 `low`，与筛选选项 `Normal / Needs attention / High risk` 不一致

- **现象**：Risk 列直接渲染 `low`（后端 `riskLevel` 字段值），筛选下拉里却写的是英文翻译。
- **影响**：用户按 "Normal" 过滤 → 命中后展示 "low"，看上去好像查错了。

### BUG-073 [P1][FE] 案件列表 Case 列把 UUID 当主标识展示，`caseNo` (`CASE-202604-0001`) 不见

- **现象**：行内同时展示「Tani Family Stay」+ 紧跟 `cafc4ec5-1020-4423-8a50-ce036789aa1d` 的 UUID，而 `caseNo: "CASE-202604-0001"` 没出现在任何位置。
- **影响**：业务沟通常用 case# 做协作锚点，UUID 在用户语境里没有任何意义。

### BUG-074 [P1][FE] 客户活动日志 Time 列被截掉首字符 "T"，Type/Content 列写死中文

- **截图**：`screens/20-activity-log-truncated-timestamp.png`
- **现象**：Activity Log 行：

  ```text
  ue Apr 28 2026 13:40:12 GMT+0900 (Japan Standard Time) | 信息变更 | 创建客户 | Local Admin
  ```

  - Time 字段：JS `Date.toString()` 原始格式，**首字母 `T` 被截**（应是 `Tue Apr 28 2026 ...`）→ 看上去像 `ue Apr 28 ...`
  - Type 字段："信息变更" 中文，en-US locale 下未翻译
  - Content 字段："创建客户" 中文 fixture，en-US locale 下未翻译
- **影响**：审计/活动追踪在 en-US/ja-JP locale 下读起来像未翻译的中文 demo + 半截时间戳。

### BUG-075 [P1][FE] 客户「Case Summary / Last created」展示原始 ISO 时间戳

- **现象**：`Last created: 2026-04-28T04:43:10.399Z` 直接呈现给用户，没有按 locale 格式化、没有时区显示。
- **影响**：与 round 2 BUG-060 同源（时间戳无时区指示），扩展到客户摘要卡。

### BUG-076 [P1][FE] 客户 Cases tab Updated 列展示原始 ISO，Type 列展示原始 caseTypeCode（"family"）

- **现象**：从客户详情 → Cases tab，Updated 列展示 `2026-04-28T04:40:39.888Z`；Type 列写 `family`（应为 "家族滞在 / Family stay"）；Owner 行写 `Owner: 00000000-0000-4000-8000-000000000011`。
- **影响**：与 BUG-070/071 同根，把所有列都按"原样字段"渲染。

### BUG-077 [P1][FE] 建案向导 Step 2 客户下拉混入 fixture（李娜/陈美/王浩/张伟/刘芳），与 `/api/customers` 返回脱节

- **截图**：`screens/21-case-create-customer-dropdown-mixed-fixture.png`
- **现象**：Step 2 "Select existing customer" 下拉同时出现：
  - URL 携带的真实客户 `Tani Keiei Cert4M Test /`（后缀 group 为空，所以末尾是孤零零的 `/`）
  - 5 个硬编码 fixture：「李娜 / 东京一组」「陈美 / 东京一组」「王浩 / 东京二组」「张伟 / 东京一组」「刘芳 / 东京二组」
- **位置**：`packages/admin/src/views/cases/fixtures-create.ts` `SAMPLE_CREATE_CUSTOMERS`
- **影响**：作流程演示用还行；但用户实际选 fixture 客户后再 Submit，又会走到 round 2 BUG-040 的 `customerId: ""` 路径（因为 fixture 的 `id` 不是真实 UUID）。

### BUG-078 [P1][i18n] 建案向导 Document Checklist 章节标题与"P1 模板"等说明写死中文

- **现象**：en-US 视图下，Step 2 显示
  - 章节标题：`主申请人提供 / 扶养者 / 保证人提供 / 法人 / 事业体提供 / 事务所内部产出` （中文）
  - 模板说明文案：`常用模板 / P1 模板 / 适合配偶/子女批量建案，自动展开扶养者/保证人资料。`（中文）
  - Application type 选项：`认定 / 变更 / 更新`（中文，未译为 "Initial / Change / Renewal"）
- **影响**：与 round 2 BUG-047/048 同根，i18n 字典覆盖不完整。

---

## 3. P2 — 体验/小瑕疵

### BUG-079 [P2][FE] Document Center 新建的真实 case 不出现，仅展示 fixture A2026-001/002/003

- **截图**：`screens/22-document-center-fixture-only.png`
- **现象**：通过 API 创建的 `Tani Family Stay`、`Tani Keiei Cert4M Test (workflow test)` case 都不出现；筛选下拉里 case 选项硬编码为 `A2026-001 経営管理ビザ新規` / `A2026-002 技人国更新` / `A2026-003 家族滞在新規`。
- **附加 i18n 问题**：12 条文档名称（`納税証明書 / 課税証明書 / 在留カード写し / 戸籍謄本 / ...`）全是日文；en-US 状态下「Expired」状态格上同时出现红色 "Expired" 与中文 "过期"。
- **影响**：Document Center 这个面板基本只起 demo 作用，没法跟踪真实 case 的资料状态。

### BUG-080 [P2][FE] 客户详情 URL `?tab=communications` 不会激活 Communications 页签（实际 key 是 `comms`）

- **现象**：`/#/customers/:id?tab=communications` 进入后，Basic info tab 仍被选中；只有 `?tab=comms` 才能命中 Communications。
- **影响**：分享给同事的 URL 一旦写成 verbose 形式就跳错。

### BUG-081 [P2][FE] `/#/cases?stage=S8` URL query 不被列表筛选器消费

- **现象**：进入 `/#/cases?stage=S8`，列表 Stage 筛选下拉仍是 "Stage: All"；API 调用也未携带 `stage=S8`（Network 看到 `/api/cases?scope=mine&stage=S8&page=1&limit=20&view=summary` 实际是 `wait_for` 之后我们手动触发，但 UI 控件无视该 URL 状态）。
- **影响**：Dashboard 的"View due soon / Go to submit / Fix risk items"行动按钮如果以后接到 deeplink，靠 URL 设置筛选条件会失效。

### BUG-082 [P2][FE] 客户 Avatar 按钮在 en-US/ja-JP locale 下仍显示「未选择任何文件」

- 与 round 2 BUG-059 一致，本轮在 zh-CN 默认 locale 下进入 Tani Keiei Cert4M Test 客户详情仍能复现，未修。

---

## 4. 状态机覆盖矩阵（业务规范 ↔ admin 现状）

| 业务节点 | 业务状态 | admin stage | 是否暴露给 UI | 是否能转换 |
|---|---|---|---|---|
| Step 1 创建客户 | — (CONSULTING 之前) | — | ✅（客户列表/详情） | N/A |
| Step 2 基础信息 | CONSULTING | — | ❌ 没有 location/source_type 字段 | ❌ |
| Step 3 发问卷 | CONSULTING | — | 部分（BMV intake card） | ❌（只对 BMV 客户） |
| Step 4 问卷+报价 | CONSULTING | — | 部分（BMV quote） | ❌（同上） |
| Step 5 签约 | CONSULTING → CONTRACTED | — | 部分（BMV sign） | ❌（同上） |
| Step 6 发资料清单 | CONTRACTED → WAITING_MATERIAL | — | ❌ 模板与 7 场景不对齐 | ❌ |
| Step 7 客户提交资料 | WAITING_MATERIAL → MATERIAL_PREPARING | S1→S2？ | ⚠️ 用 S1/S2 模糊覆盖 | ⚠️（可任意跳） |
| Step 8 内部资料制作 | MATERIAL_PREPARING | S2→S4？ | ⚠️（用 S4 文书制作中近似） | ⚠️ |
| Step 9 行政书士处理 | MATERIAL_PREPARING | S4 | ⚠️ | ⚠️ |
| Step 10 内部/客户确认 | MATERIAL_PREPARING → REVIEWING | S4→S5？ | ⚠️（用 S5 提交前检查近似） | ⚠️ |
| Step 11 最终确认 | REVIEWING | S5 | ⚠️ | ⚠️ |
| Step 12 提交入管 | REVIEWING → APPLYING → UNDER_REVIEW | S5→S6→S7 | ⚠️ | ⚠️ |
| Step 13 入管反馈 | APPROVED / REJECTED / NEED_SUPPLEMENT | S8 + ??? | ❌ resultOutcome 字段存在但 stage 不区分 | ❌ |
| Step 14 补资料循环 | NEED_SUPPLEMENT ↔ SUPPLEMENT_PROCESSING ↔ UNDER_REVIEW | ❌ | ❌ | ❌ |
| Step 15 收尾款 | APPROVED → WAITING_PAYMENT | ❌ 无对应 stage | ❌ | ❌ |
| Step 16 发 COE | WAITING_PAYMENT → COE_SENT | `coeSentAt` 字段存在；无 stage | ❌ | ❌ |
| Step 17 客户海外返签 | COE_SENT → VISA_APPLYING | `overseasVisaStartAt` 字段存在；无 stage | ❌ | ❌ |
| Step 18 返签结果 | SUCCESS / VISA_REJECTED | `entryConfirmedAt` 字段存在；无 stage | ❌ | ❌ |
| Step 19 记录在留期间 | RESIDENCE_PERIOD_RECORDED | ❌ | ⚠️ `/api/residence-periods` 可写但未连 case stage | ⚠️ |
| Step 20 续签提醒 | RENEWAL_REMINDER_SCHEDULED → CLOSED_SUCCESS | ❌ | ❌ 提醒不会自动派生 | ❌ |

---

## 5. 资料清单矩阵覆盖（业务规范 ↔ admin 现状）

| 场景 ID | 业务规范要求 | admin 模板 | 模板预览项数 | 缺口 |
|---|---|---|---|---|
| `biz_mgmt_cert_4m` | 18 必需 + 3 条件 | 共用「经营管理 P1 模板」 | 9 | 资本金 3000 万证明、资本来源、设立委任状、印鉴证明、住民票等 9-10 项 |
| `biz_mgmt_cert_1y` | 25 必需 + 3 条件 | 共用「经营管理 P1 模板」 | 9 | 设立申报（国税/府税/市税）、定款、役员报酬决议、交易方名片等 16-17 项 |
| `biz_mgmt_renewal` | 12 必需 | 共用「经营管理 P1 模板」 | 9 | 课税证明、源泉征收票、雇用保险编号、健康保险等 |
| `company_setup` | 7 必需 | ❌ 无独立模板 | — | 整套 |
| `eng_humanities_intl_cert` | 19 必需 + 4 条件 | 共用「技人国 模板」 | 8 | 学位证明、成绩证明、源泉征收票、雇用保险编号、雇用条件通知书、员工列表等 |
| `eng_humanities_intl_renewal` | 13 必需 | 共用「技人国 模板」 | 8 | 健康保险证、雇用保险事业者编号 |
| `intra_company_transfer` | 11 必需 + 备注 | ❌ 无独立模板 | — | 整套（特别是「转勤命令 / 让渡合同 / 股东名簿」3 项标注 `日本/本国・日本` 的关键证据） |

---

## 6. 复现资产

### 6.1 准备 token + 客户

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# 创建一个非 BMV 真实客户（用于触发 BUG-064/067/068/069）
curl -s -X POST http://localhost:5173/api/customers \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "type":"individual",
    "baseProfile":{
      "name_jp":"経営管理 認定四ヶ月",
      "name_en":"Tani Keiei Cert4M Test",
      "phone":"08077001100",
      "email":"keiei.cert4m@example.com",
      "sourceType":"REFERRAL"
    },
    "contacts":[]
  }'
```

### 6.2 状态机跳跃（BUG-062 / BUG-063 / BUG-064）

```bash
ADMIN_USER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5173/api/auth/me \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["userId"])')

CASE_ID=$(curl -s -X POST http://localhost:5173/api/cases \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{
    \"customerId\":\"$CUST_ID\",
    \"caseTypeCode\":\"biz_mgmt\",
    \"ownerUserId\":\"$ADMIN_USER_ID\",
    \"caseName\":\"Workflow Probe\",
    \"stage\":\"S1\"
  }" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 任意跳跃
curl -s -X POST http://localhost:5173/api/cases/$CASE_ID/transition \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"toStage":"S2"}'
curl -s -X POST http://localhost:5173/api/cases/$CASE_ID/transition \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"toStage":"S9"}'   # 直接归档

# 详情聚合 500
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/cases/$CASE_ID/aggregate"
# {"statusCode":500,"message":"Internal server error"}
```

### 6.3 在留期间 + 提醒（BUG-067 / BUG-068）

```bash
curl -s -X POST http://localhost:5173/api/residence-periods \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{
    \"caseId\":\"$CASE_ID\",
    \"customerId\":\"$CUST_ID\",
    \"visaType\":\"BUSINESS_MANAGER\",
    \"statusOfResidence\":\"経営・管理\",
    \"validFrom\":\"2026-09-01\",
    \"validUntil\":\"2030-09-01\",
    \"periodYears\":4
  }"
# 回包 validFrom=2026-08-31 / validUntil=2030-08-31 / reminderCreated=false

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/reminders?caseId=$CASE_ID"
# 仍然 {"items":[],"total":0}
```

### 6.4 错误的 ownerUserId 抛 500（BUG-040 复盘）

```bash
# admin UI 下拉的"suzuki"、"tanaka"、"li"、"sato" 都是 fixture key
curl -s -X POST http://localhost:5173/api/cases \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{
    \"customerId\":\"$CUST_ID\",
    \"caseTypeCode\":\"family\",
    \"ownerUserId\":\"suzuki\",
    \"caseName\":\"Owner picker probe\",
    \"stage\":\"S1\"
  }"
# {"statusCode":500,"message":"Internal server error"}   ← 应当 400 Invalid ownerUserId
```

---

## 7. 与第二轮的关系

| 第二轮 | 第三轮新增 | 备注 |
|---|---|---|
| BUG-039 BMV 建案向导前提门禁始终判 4 项未满足 | **BUG-064** 真实 case `/aggregate` 全部 500 | 即便绕过 BUG-039 在前端硬塞，详情页仍打不开 |
| BUG-040 `customerId: ""` 400 | **BUG-077** Step 2 客户下拉混入 fixture | 只要选了 fixture 客户就触发 BUG-040；本轮抓到了源头 |
| BUG-041 `/api/cases?scope=...&view=summary` 全 scope 500 | 已修复（本轮均 200） | 列表读路径恢复 |
| BUG-042 `/api/admin/leads?scope=mine` 500 | 已修复（本轮 200） | 仅 demo 数据为空 |
| BUG-043 Settings 不持久化 | 仍未修 | round 2 即记录 |
| BUG-053 dashboard scope 错位 | 部分修复（mine/group/all 200，team 仍 400） | UI tab 已对齐 mine/group/all |
| 未覆盖：经管签 20 状态机 / 7 场景资料矩阵 / 续签提醒 | **BUG-062 ~ 069** | 本轮重点产出 |

---

## 8. 仍未覆盖（建议下一轮走查）

- **修复 BUG-064 后的「单 case 端到端流程」**：从 CONTRACTED → 提交 → APPROVED → COE_SENT → SUCCESS → RESIDENCE_PERIOD_RECORDED → CLOSED_SUCCESS 真正跑一遍。
- **NEED_SUPPLEMENT 补资料循环**：业务允许多次循环，需要观察 `supplement_count` 字段、UI 显示、对应资料模板是否能挂回。
- **CLOSED_FAILED 路径**：拒签 → 部分退款 / 海外返签拒 → 不退款。当前 `closeReason` 字段存在但 UI 无入口。
- **多 admin 用户 / 多 group 的可见性 + 角色矩阵**：当前只用 `owner` 这个 root 角色跑，`staff / viewer` 看不到的字段没验证。
- **公司设立资料包 + 企业内転勤** 两个完全没有模板的场景：建议先建独立模板再走查资料挂载。
- **`POST /api/cases` 在 admin UI 上的全字段写入路径**：当前 e2e 走查依赖 curl 直建，admin UI 走「Start case」由于 BUG-040/077 短路。

---

## 附录 A — 第三轮新增截图

| 文件 | 描述 |
|---|---|
| `screens/16-case-detail-aggregate-500-not-found.png` | 真实 case 详情页：「Case xxx not found」 |
| `screens/17-case-create-templates-disabled.png` | 建案向导 Step 1：3 个硬编码 zh-CN 模板 |
| `screens/18-case-create-step2-checklist-stub.png` | 家族模板 Step 2 资料清单只有 8 项 |
| `screens/19-case-create-bmv-checklist-stub.png` | 经营管理模板 Step 2 资料清单只有 9 项 |
| `screens/20-activity-log-truncated-timestamp.png` | 客户活动日志：`ue Apr 28 2026 ...`（首字母 T 被截）+ 中文 fixture |
| `screens/21-case-create-customer-dropdown-mixed-fixture.png` | Step 2 客户下拉：真实客户 + 5 条中文 fixture |
| `screens/22-document-center-fixture-only.png` | Document Center 仅展示 A2026-001/002/003 fixture，真实 case 缺席 |

---
