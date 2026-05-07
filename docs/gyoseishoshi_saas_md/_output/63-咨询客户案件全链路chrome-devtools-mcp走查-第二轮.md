# 咨询 → 客户 → 案件 全链路 chrome-devtools-mcp 走查（第二轮 / R-FLOW2）

> 生成日期：2026-05-07
>
> 命题：在 R-FLOW（第一轮）所有 P1 修复均已落库（adapter 拆分、case_templates
> seed、CustomerCreateCaseGate 解耦 BMV、LeadLogPayloadFormatter 转化分支等）之后，
> 以 admin（Local Admin）身份再跑一次「new → following → pending_sign →
> signed → convert-customer → convert-case」全链路；这一轮特意把意向类型
> 切到「家族滞在」（caseTypeCode = `dependent_visa`），覆盖与第一轮不同的
> 业务路径，用以验证 R-FLOW-A-1 / B-1 / C-1 / D-1 / D-2 / E-1 / F-1 / G-1 /
> G-2 / H-1 在另一类型下是否依旧成立。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill / fill_form / wait_for / evaluate_script /
> list_network_requests / get_network_request / list_console_messages）+ 直
> 连 PG 校验真实持久化、`case_templates`、`document_items`、`tasks`、
> `lead_logs`。
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）。本轮新增 1
> 条线索 `LEAD-202605-0006 / R-FLOW-02 田中花子`（intended_case_type =
> `family-stay`，admin → caseTypeCode 映射为 `dependent_visa`），convert
> 成功落库 1 个 customer `CUS-202605-0011 / 0577eb14` 与 1 个 case
> `CASE-202605-0008 / defbc401`。基线 leads 6 / customers 20 / cases 29
> → 末态 leads 7 / customers 21 / cases 30。同时本轮还首次跑了
> `npm run db:seed-dev`，把 `case_templates` 表写入了 2 条种子（
> `family_stay` / `engineer_humanities_intl_visa`）。
>
> 上游权威：
>
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md#41-咨询转案件)
> - [P0/04-核心流程与状态流转.md §4.2 资料收集与审核](../P0/04-核心流程与状态流转.md#42-资料收集与审核)
> - [P0/06-页面规格/咨询线索.md §4 关键动作](../P0/06-页面规格/咨询线索.md)
> - [P0/06-页面规格/客户.md §3 详情页 / §4 关键动作](../P0/06-页面规格/客户.md)
> - [P0/06-页面规格/案件.md](../P0/06-页面规格/案件.md)
> - [62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md](./62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md)
> - [ADR-case-templates-as-checklist-ssot.md](./ADR-case-templates-as-checklist-ssot.md)

---

## 0. 总结

### 0.1 一句话结论

**R-FLOW（第一轮）报的 D-1 / D-2 / H-1 / C-1 / G-2（cases 列表口径）已经
真的修好（PG ↔ UI 完全对齐、convert 后 UI 立即刷新到 `convertedCase`、
日志 Tab 新增「转化」分类与正确文案、cases 列表 owner picker 切到真用户）；
但 R-FLOW2 同一条 family-stay 主链路同时把第一轮没提到的两条 P0/P1 一并
推到了红线：**

> 1.  **R-FLOW2-A-1 [P0]** R-FLOW-G-1 的 SQL 修复（在 `buildCaseNamesExpr`
>     里引用 `ca.case_type_label`）一起把列查表达式塞进了
>     `buildCustomerListSelect`/`buildCustomerDetailSelect`，但 `cases`
>     表根本没有 `case_type_label` 这一列；PG 在解析阶段直接报
>     `column "case_type_label" does not exist`，导致 `GET /api/customers`、
>     `GET /api/customers/:id` **全部 500**——本轮所有 customer 列表 / 详
>     情接口（包括 R-FLOW-01 的 `CUS-202605-0010` 和本轮新建的
>     `CUS-202605-0011`）一律返回 500，整个客户模块在 admin UI 不可访问；
>     与 R-FLOW-F-1 修复目标耦合，「客户详情顶部 BMV 卡片是否解耦」**本轮无
>     法在 UI 上验证**（页面直接进入「暂时无法加载该客户」错误态）。
> 2.  **R-FLOW2-B-1 [P1]** `case_templates` 与 admin 端 caseTypeCode 严
>     重错位：admin `family-stay → dependent_visa`、`work-visa → work`
>     等 7 个 caseTypeCode，与 seed 中 case_templates.caseType（`family_stay`
>     / `engineer_humanities_intl_visa`）完全不重合；`findActiveCaseTemplateByCaseType`
>     按 `case_type=$1` 查表永远 miss，`document_items` 仍是 0/0，R-FLOW-E-1
>     修复方向 1（写 seed）落地了但没能闭环。

> 同时 R-FLOW（第一轮）报的 R-FLOW-B-1 在 family-stay 路径上发生了**升
> 级回归**：`HEADER_BUTTON_PRESETS.signedNotConverted` 把 `convertCase`
> 设为 `"hidden"`，导致顶部 header / banner / 转化 Tab **三处入口同时
> 失效**——admin 在 `signed` 状态下看到 banner 文案「下一步请直接开始
> 建档并创建首个案件」，但顶部既没有「签约并开始建档」按钮，banner 也
> 不再渲染按钮，Tab 内同名按钮 disabled，唯一可点的入口是「仅建客户档
> 案」+ 中间 dedup 弹窗 → 必须先建客户、再回过头来点 convert-case，
> 至此「一键签约并开始建档」的产品 narrative **被完全打断**。

> 净效果：服务端 lead → customer → case 三表 + lead_logs 的事务、
> auto-chain swallow、case 默认任务 都依旧绿灯（PG 直查全部对齐）；
> 客户端层 R-FLOW-D-1 / D-2 / H-1 / C-1 已经稳定生效；但
> **`/api/customers` 系列 500（R-FLOW2-A-1）+ `signedNotConverted`
> preset 把 convertCase 隐藏（R-FLOW2-C-1 / 升级版 R-FLOW-B-1）+
> case_templates ↔ admin caseTypeCode 口径错配（R-FLOW2-B-1）** 三件
> 事任意一件都阻断 §4.1 主链路的 admin 体验。建议把这三条放进同一个
> P0 修复 PR，并补 `customers.query.ts` 的 SQL 语义快照测试，避免再
> 次出现「列名不存在但生产 SQL 已下推」的回归。

### 0.2 优先级分布

| 等级 | 个数 | 编号 | 主题 |
|------|------|------|------|
| P0 | 1 | R-FLOW2-A-1 | `customers.query.ts` 引用不存在的 `cases.case_type_label` 列，导致 `/api/customers`、`/api/customers/:id` 全部 500 |
| P1 | 3 | R-FLOW2-B-1 / R-FLOW2-C-1 / R-FLOW2-D-1 | case_templates 口径与 admin caseTypeCode 错配（`family-stay` → `dependent_visa` 但 seed 用 `family_stay`） / `signedNotConverted` preset 把顶部+banner+Tab 三处 convertCase 入口同时关掉 / customer 列表 500 被前端静默吞掉（UI 只显示 `0 位`，不弹错误） |
| P2 | 3 | R-FLOW2-E-1 / R-FLOW2-E-2 / R-FLOW2-F-1 | dedup 把 lead 自己识别为「可能重复的记录」 / lead 详情 URL `?tab=log` 不被 active tab 还原 / 转化 Tab 内卡片在 `convertedCase` 状态下没有切换为「已建案件 / 查看案件」展示 |
| P3 | 2 | R-FLOW2-G-1 / R-FLOW2-G-2 | leads 列表对 `family_stay` 旧数据仍以 snake_case 直接渲染（其他线索是 kebab-case），口径不齐 / R-FLOW-H-1 转化日志 link 文案显示 UUID 前 8 位（应展示 `CUS-XXXX-XXXX` / `CASE-XXXX-XXXX`） |

### 0.3 R-FLOW（第一轮）修复回归矩阵

| 编号 | 主题 | R-FLOW2 验证 | 证据 |
|------|------|-------------|------|
| R-FLOW-A-1 | 列表「联系方式 / 咨询信息」列把 `source_channel` 错位为 `source` | ✅ 已修复 | R-FLOW-02 行第二列下半段 = `family-stay · web`，R-FLOW-01 = `work-visa · web`，与详情 Tab 一致 |
| R-FLOW-B-1 | 转化信息 Tab `签约并开始建档` 按钮 disabled / banner 同名按钮 enabled 双态不一致 | ❌ **升级回归（R-FLOW2-C-1）**：现在 banner 完全不渲染按钮、顶部 header 不渲染按钮、Tab 内 disabled，三处全失 | snapshot uid `38_0/38_1/39_3`、`HEADER_BUTTON_PRESETS.signedNotConverted = { convertCase:"hidden", convertCustomer:"highlighted" }`（`packages/admin/src/views/leads/types-detail.ts:364-370`） |
| R-FLOW-C-1 | 资料清单 Tab `本地资料根目录未配置` alert 与「暂无资料登记」叠加 | ✅ 已修复 | R-FLOW-02 case `CASE-202605-0008` 资料 Tab 现在只显示一条「资料模板未配置 / 当前签证类型尚未配置资料模板，请联系管理员维护。」（snapshot uid `46_0/46_1`） |
| R-FLOW-D-1 | `adaptLeadMutationResult` 在合法响应上返回 null → UI 报「转案件失败」 | ✅ 已修复 | 新增 `LeadAdapterConvertMappers.ts` 拆出 `adaptLeadConvertCustomerResult`/`adaptLeadConvertCaseResult`，从 `record.id || record.lead?.id` + `customerId/caseId` 取值；本轮 reqid `2296 POST convert-customer 201` + `2299 POST convert-case 201` UI **没有弹任何 toast**，立即刷新到 `convertedCustomer` → `convertedCase`，顶部按钮直接切到「查看客户 / 查看案件」 |
| R-FLOW-D-2 | convert 失败后 UI 不刷新需 reload | ✅ 已修复（联动 D-1） | reqid `2298 convert-customer 400` 因 `Lead already has a converted customer` 被 swallow，紧接着 `2299 convert-case 201` → `2300 GET 详情 200` 自动 refetch，UI 直接进入 `convertedCase` |
| R-FLOW-E-1 | case_templates 表 0 行 → 资料清单 0/0 | ⚠️ **半修复**：seed 已写 `family_stay` + `engineer_humanities_intl_visa` 两条模板，且 `cases.service.create-flow.ts` 已对接 `findActiveCaseTemplateByCaseType` ；但 admin 端 `family-stay → dependent_visa`、`work-visa → work` 与 seed 的 `case_type` **完全不重合**，所有新建 case 的 `case_type_code` 永远命中不到模板 → `document_items` 依旧 0（**R-FLOW2-B-1**） | PG `cases.case_type_code='dependent_visa'`、`case_templates.case_type IN ('family_stay','engineer_humanities_intl_visa')`、`document_items count=0` |
| R-FLOW-F-1 | customer 详情顶部 BMV 卡片对所有签证类型生效 | 🚫 **本轮无法验证**（被 R-FLOW2-A-1 阻断） | UI 直接显示「暂时无法加载该客户。请求失败或返回异常，请稍后重试。」（reqid `2479 GET customers/:id 500`）；代码层 `useCustomerCreateCaseGateModel.customerRequiresBmv` 已经按 `visaType==='business_manager' \|\| profile.questionnaireStatus !== 'not_started'` 实现，看似方向对，但缺端到端 UI 验证 |
| R-FLOW-G-1 | customer 详情顶部「案件名称」永远 `—`、关联案件 Tab 案件列没有 case 名称 | ❌ **修复带来更严重 P0 回归**（R-FLOW2-A-1）：`buildCaseNamesExpr` 把 `ca.case_type_label` 写进 SQL，但 `cases` 表没有这一列，PG 在解析期就报 `column "case_type_label" does not exist`，所有 `customers` 系列 endpoint 全 500 | git diff `customers.query.ts` 第 95-115 行；本轮 `evaluate_script` 对 `/api/customers/146d985a...`、`/api/customers/0577eb14...`、`/api/customers?scope=all` 三个端点均得到 500 |
| R-FLOW-G-2 | customer / cases owner picker 错源（仅 fixture 日本员工） | ⚠️ **半修复**：cases 列表 `全部负责人` dropdown 现在是 4 个真用户（Local Admin / R6走查成员 / ceshi001 / 测试 002）；但 `/customers` 列表仍然是 7 个 fixture 名（铃木 / 田中 / 李 / 佐藤 / 山田翔太 / 高桥健太 / 铃木明里），无 Local Admin | snapshot uid `50_30..50_38` |
| R-FLOW-H-1 | lead 日志把 convert 当成「状态变更」、to_value 写 UUID | ✅ 已修复 | snapshot uid `49_6` 顶部分类 Tab 多了「转化」；`converted_customer` / `converted_case` 行渲染为「转化 · 已转客户：0577eb14」「转化 · 已建案件：defbc401」，配点击 link 跳客户/案件详情；遗留 P3：UUID 前缀 8 位（应显示 `CUS-202605-0011` / `CASE-202605-0008`） |

---

## 1. 新发现缺陷明细（R-FLOW2-A …… R-FLOW2-G）

### R-FLOW2-A-1 [P0] `customers.query.ts` 引用不存在的 `cases.case_type_label` 列 → `/api/customers`、`/api/customers/:id` 全 500

- **页面**：`/customers`、`/customers/:id`
- **重现**：
  1. R-FLOW-02 路径建出 customer `CUS-202605-0011 / 0577eb14`；
  2. UI 自动跳 `/customers/0577eb14...` → 显示 `暂时无法加载该客户。/ 请求失败或返回异常，请稍后重试。 / [重试][返回客户列表]`；
  3. 网络面板 reqid `2479 GET /api/customers/0577eb14... 500`；浏览器内手工 fetch：
     ```js
     await fetch('/api/customers/146d985a-5763-4132-a6e5-1d1f793ea9ac', ...)   // R-FLOW-01 customer
     // status: 500, body: {"statusCode":500,"message":"Internal server error"}

     await fetch('/api/customers/0577eb14-a8cf-4f76-a0e3-0b0b09732565', ...)   // R-FLOW-02 customer
     // status: 500

     await fetch('/api/customers?scope=all&page=1&limit=5', ...)
     // status: 500
     ```
  4. PG 直查 cases 表，`case_type_label` 列**根本不存在**（`\d cases` 输出无该列）；同时 R-FLOW-02 case `CASE-202605-0008` 的 `case_name` 为空（`select case_name from cases where id=... → ' '`）；
  5. `git diff packages/server/src/modules/core/customers/customers.query.ts` 显示 R-FLOW-G-1 修复时 `buildCaseNamesExpr` 改写：
     ```sql
     coalesce(
       nullif(trim(coalesce(ca.case_name, '')), ''),
       concat_ws(' · ',
         nullif(trim(coalesce(${customerAlias}.base_profile->>'displayName',
                              ${customerAlias}.base_profile->>'legalName', '')), ''),
         nullif(trim(coalesce(ca.case_type_label, ca.metadata->>'caseTypeLabel', '')), '')
       )
     )
     ```
- **根因**：
  - `cases` 表里只有 `case_type_code`、`metadata->>'caseTypeLabel'`，没有顶层 `case_type_label` 列；
  - PG 在 SQL **解析阶段**就要识别所有列名，即便 `coalesce` 在运行时短路，解析期也会因为列不存在而失败；
  - 该表达式同时被 `buildCustomerListSelect` 和 `buildCustomerDetailSelect`（后者直接 `return buildCustomerListSelect(alias)`）使用 → 整个 customers 模块查询路径都炸；
  - 单测里没有 lib-pg 真表的语义快照（多数 customers.* test 走 row mock），所以 PR review 与 CI 都拦不下来。
- **修复方向**：
  1. **最小修**：把 `ca.case_type_label` 替换为 `ca.metadata->>'caseTypeLabel'`（保留 R-FLOW-G-1 修复方向），并在 fallback 链上再加 `ca.case_type_code`：
     ```sql
     concat_ws(' · ',
       nullif(trim(...displayName...), ''),
       coalesce(
         nullif(trim(coalesce(ca.metadata->>'caseTypeLabel', '')), ''),
         nullif(trim(coalesce(ca.case_type_code, '')), '')
       )
     )
     ```
  2. **彻底修**：在服务端 mapping 时把 `case_type_code` 通过 i18n 字典翻译成 `case_type_label`（如 `dependent_visa → 家族滞在`），不在 SQL 里 hardcode；或在新建/更新 case 时把 `case_type_code` 一并写入 `case_name`/`metadata.caseTypeLabel`；
  3. **测试护栏**：新增 `customers.query.detail-sql.smoke.test.ts`，对 `getCustomerRowById` 跑真 PG（已在 docker），断言 `select … from customers c where c.id=$1 limit 1` 不抛错；同时给 `cases.controller` 测一条 `case_name='' / metadata.caseTypeLabel='X'` 的 fixture 验证下游 `caseNames[0] === '<displayName> · X'`；
  4. **前端**：`CustomerListView.vue` / `CustomerDetailView.vue` 在拿到 5xx 时弹结构化 toast（不要静默把 items 当成 0），见 R-FLOW2-D-1。
- **影响面**：
  - 整个 admin 客户模块当前不可作业（列表 0 位、详情 500、关联 → 客户详情链接全部进 fallback 错误页）；
  - 与 lead → customer → case 主链路严重冲突：刚 convert 出来的客户**永远进不去详情**；
  - 间接阻断 R-FLOW-F-1（BMV 解耦）的 UI 端到端验证；
  - 服务端写库正常，因此 PG 数据是干净的，回滚只需修 SQL，不会脏数据。
- **关联**：与 R-FLOW-G-1 的修复同 PR 引入；建议合并 R-FLOW2-A-1 / R-FLOW2-B-1 / R-FLOW2-C-1 三个 P0/P1 在同一 hotfix。

### R-FLOW2-B-1 [P1] `case_templates` 口径与 admin caseTypeCode 错配 → 新建 case 永远拿不到 requirement_blueprint

- **页面**：`/cases/:id?tab=documents`
- **重现**：
  1. 跑 `npm run db:seed-dev`，seed 把 2 条模板写入 `case_templates`：
     ```text
     family_stay                   (10 个 requirement items)
     engineer_humanities_intl_visa (11 个 requirement items)
     ```
  2. R-FLOW-02 路径建出 case `CASE-202605-0008 / case_type_code='dependent_visa'`；
  3. UI 资料清单 Tab 标签依旧是 `资料清单 0/0`，主体只显示「资料模板未配置 / 当前签证类型尚未配置资料模板，请联系管理员维护。」（**这是 R-FLOW-C-1 修好的空态文案**，方向 OK）；
  4. PG 直查：`select count(*) from document_items where case_id='defbc401-…' → 0`；
  5. 顺便对 R-FLOW-01 case `CASE-202605-0007 / case_type_code='work'` 也是 0（PG 同样验证）；
  6. 根因证据：admin `packages/admin/src/i18n/messages/_shared/businessTypes.ts:69` `BUSINESS_TYPE_TO_CASE_TYPE_CODE`：
     ```ts
     "highly-skilled": "highly_skilled",
     "work-visa": "work",
     "family-stay": "dependent_visa",
     "business-management-visa": "business_manager_visa",
     "company-setup": "company_setup",
     "permanent": "permanent",
     "other": "other",
     ```
     而 seed `packages/server/src/scripts/seedCaseTemplates.ts` 用的 case_type 是 `family_stay` 和 `engineer_humanities_intl_visa`；二者**没有一个**重合。
- **根因**：
  - `findActiveCaseTemplateByCaseType` 走的是 `where case_type = $1`，单字段精确匹配；
  - 二种正交命名：admin 端是面向终端用户的业务类型名，server 端 `case_templates.case_type` 用的是签证 enum；
  - 没有「签证 enum ↔ caseTypeCode」桥接表，也没有 alias 字段（`case_templates.aliases jsonb`）。
- **修复方向**：
  1. **数据**：把 seed 改成与 admin 端 caseTypeCode 一致的 7 个值（`work` / `dependent_visa` / `business_manager_visa` / `highly_skilled` / `company_setup` / `permanent` / `other`），首版至少把 `work` / `dependent_visa` / `business_manager_visa` 三类的 blueprint 写齐（与 P0 §1.2 「首版模板固定为」对齐）；
  2. **schema**：给 `case_templates` 加 `case_type_aliases text[]` 与 `case_type_label text`，并改 `findActiveCaseTemplateByCaseType` 走 `where case_type = $1 OR $1 = ANY(case_type_aliases)`；同步在 admin 端建 `caseTypeCode → templateCaseType` 映射 source-of-truth（避免再分裂）；
  3. **单测**：`cases.template.repository.test.ts` 新增 `caseType=dependent_visa → 命中 family_stay 模板（via alias）` 用例；`cases.service.create-flow.case-templates.focused.test.ts` 增 `dependent_visa case → document_items.length === 10`；
  4. **前端**：在 `CASE-CREATED` timeline event 上附 `templateMatchedCode`，case 详情页直接展示「使用模板：技人国 v1（11 个资料项）」，让命中状态可见。
- **影响面**：
  - R-FLOW-E-1 修复在 demo 数据下永远不会生效；admin 创建任何新 case 都拿不到资料清单；
  - Gate-A（S3 → S4）触发条件「资料项已有 approved」永远满足不了；
  - 与 P0/04-核心流程 §4.2 step 1 严重背离。
- **关联**：与 R-FLOW-E-1（第一轮）同源；建议在同一个 PR 一起补齐口径。

### R-FLOW2-C-1 [P1]（升级版 R-FLOW-B-1）`HEADER_BUTTON_PRESETS.signedNotConverted` 把 `convertCase` 设为 hidden → 顶部 + banner + Tab 三处入口同时失效

- **页面**：lead 详情（`signed` 状态、未建客户）
- **重现**：
  1. R-FLOW-02 推到 `signed`；
  2. 顶部 header 按钮区：`编辑信息 / 调整状态 / 标记流失 / 仅建客户档案`，**没有「签约并开始建档」**；
  3. banner（uid `38_1` warning 条）显示 `该线索已签约，下一步请直接开始建档并创建首个案件。`，**没有任何按钮**；
  4. 切到「转化信息」Tab：左侧卡片 `签约并开始建档 / 系统会先创建客户档案，再继续创建首个案件 / [按钮 disabled]`（uid `39_3`）；唯一可点的入口是右侧「仅建立客户档案」（uid `39_6`）；
  5. 与 banner 文案「直接开始建档并创建首个案件」语义直接矛盾。
- **根因**：
  - `packages/admin/src/views/leads/types-detail.ts:364-370`：
    ```ts
    signedNotConverted: {
      convertCustomer: "highlighted",
      convertCase:     "hidden",   // ← 这里
      ...
    },
    ```
  - `LeadDetailHeader` 与 `LeadConversionTab` 都按 `state==='hidden'` 不渲染或 disabled；
  - `LeadBannerStrip` 把 `enabled || highlighted` 才算可见，所以 banner 同样吞按钮：
    ```ts
    showConvertCaseButton = props.convertCaseState === "enabled" || props.convertCaseState === "highlighted";
    ```
  - 设计意图似乎是「signed → 必须先建客户档案 → 才能 convertCase」，与 R-FLOW（第一轮）报告里的 banner CTA enabled 不一致；同时 P0 §4.1 主链路明确写「一键签约并开始建档（先 convert-customer，再 convert-case）」，所以应该是 `signedNotConverted.convertCase = "highlighted"` 才对。
- **修复方向**：
  1. 把 preset 改为：
     ```ts
     signedNotConverted: {
       convertCustomer: "enabled",     // 备选入口（仅建客户）
       convertCase:     "highlighted", // 主入口（签约并开始建档，auto-chain 已能 swallow ALREADY_CONVERTED）
       markLost:        "enabled",
       editInfo:        "enabled",
       changeStatus:    "enabled",
     }
     ```
  2. `useLeadDetailModel.doConvertCase` 已经实现 auto-chain（先 convert-customer → swallow CUSTOMER_ALREADY_CONVERTED → convert-case），所以 `convertCase: highlighted` 在 `signed` 状态下安全；
  3. 单测：`useLeadDetailModel.test.ts` 已有 `convertCustomer === highlighted` 的 case，请同步加 `convertCase === highlighted` 断言；
  4. UI 单测：`LeadBannerStrip.test.ts` 新增 `bannerSignedNotConverted_highlighted_showsActionButton`。
- **影响面**：
  - 直接砍掉 P0 §4.1 「一键签约并开始建档」体验，admin 必须先点「仅建客户档案」+ 通过 dedup 弹窗 + 再点「签约并开始建档」 三步；
  - 与 banner 文案「下一步请直接开始建档」自相矛盾；
  - 与 R-FLOW（第一轮）观察到的「banner 上有 CTA」是回归（preset 在 R-FLOW2 周期被改），但目前 lint/单测没拦下；
  - 跟 R-FLOW2-A-1 联合：admin 在 family-stay 路径被卡两次（一次 dialog，一次 customer 详情 500），整体体验非常差。

### R-FLOW2-D-1 [P1] customer 列表 500 被前端静默吞掉 —— UI 显示「我的客户 0 位」但 PG 实际 21 条

- **页面**：`/customers`
- **重现**：
  1. 顶部 KPI `我的客户 0 / 本组客户 0 / 有活跃案件 0 / 无活跃案件 0`；
  2. 列表区域 `当前查看：我的 · 0 位` + `显示 0 - 0 条，共 0 条`，没有 toast、没有 inline alert、没有 retry 按钮；
  3. 网络面板：`GET /api/customers?scope=mine&page=1&limit=20 [500]`（响应 body 与 R-FLOW2-A-1 一样是 generic Internal server error）；
  4. PG 实际 `select count(*) from customers → 21`。
- **根因**：
  - `useCustomerListModel`（或同名 hook）对 5xx 走 `catch → items=[], total=0` 的兜底分支；
  - 列表错误态没有从 model 反向给 view，View 当成空列表正常渲染。
- **修复方向**：
  1. `useCustomerListModel` 暴露 `loadError: ErrorState | null`，View 顶部条幅化错误（与 cases 列表的 5xx 处理一致）；
  2. KPI 卡片在 loadError 时显示 skeleton + 「点击重试」，避免 admin 误以为「真的没有客户」；
  3. 单测：`useCustomerListModel.test.ts` 新增 `5xxResponse_keepsErrorAndDoesNotResetCount`。
- **影响面**：与 R-FLOW2-A-1 联合放大 P0 阻塞——既炸了，又静默；admin 看到的只有「0 位」一条线索，会误以为是数据问题去调权限/分组，浪费排查时间。

### R-FLOW2-E-1 [P2] dedup pre-check 把 lead 自身识别为「可能重复的记录」

- **页面**：lead 详情 → `仅建客户档案`（或「签约并开始建档」） dialog
- **重现**：
  1. 在 R-FLOW-02 lead 详情（电话 09033335555 / 邮箱 r-flow-02@example.com）点「仅建客户档案」 → 「确认创建客户」；
  2. 弹出 dedup 二次确认 dialog `检测到可能重复的记录 / 该线索的电话/邮箱与已有线索或客户匹配，确认继续转化吗？`，下面列的就是 lead 自己 `R-FLOW-02 田中花子 (09033335555 · r-flow-02@example.com)`；
  3. dedup pre-check（reqid `2295 GET /admin/leads/dedup?phone=…&email=…`）并未排除当前 leadId，把 lead 自己当成命中。
- **根因**：
  - 服务端 `LeadDedupController.precheck` 没有 `excludeLeadId` 参数；或 `LeadDedup.useCustomerCreateDedupModel` 没有把 `currentLead.id` 传给 endpoint；
  - 导致 admin 必须额外点一次「确认转化」，多一道无效步骤。
- **修复方向**：
  1. dedup pre-check 端点增加 `excludeLeadId` query param，SQL `where id <> $excludeLeadId`；
  2. admin 在调用前把 `lead.id` 传过去；
  3. 单测：`LeadDedupController.test.ts` 新增 `excludesProvidedLeadId`；`LeadConvertCustomerDialog.dedup.test.ts` 新增 `dialogDoesNotShowSelfAsDuplicate`。
- **影响面**：体验问题，多一次 click，影响转化率；不阻塞流程。

### R-FLOW2-E-2 [P2] lead 详情 URL `?tab=log` 不被 active tab 还原

- **页面**：`/leads/:id?tab=log`
- **重现**：
  1. 直接 navigate `http://localhost:5173/#/leads/9c73b274-…?tab=log` → 页面渲染默认 Tab 「基础信息」selected，URL 没有改写；
  2. 必须再点一次顶部「日志」 Tab；
  3. R-FLOW-FOLLOWUPS / R-FLOW-CONVERSION 等其它 Tab 的深链接也疑似不回填（snapshot 内只看到 `info` selected）。
- **根因**：`useLeadDetailModel.activeTab` 默认 `"info"`，没有读 `route.query.tab`。
- **修复方向**：
  1. `useLeadDetailModel` 初始化 activeTab 时读 `route.query.tab`，并在 `switchTab` 时同步写回；
  2. 单测：`useLeadDetailModel.tab-deep-link.test.ts`；
  3. URL `?tab=log` 必须与 LEAD_DETAIL_TABS 之一匹配，否则回退到 `info`。
- **影响面**：影响从外部链接（任务面板、日志告警邮件）跳进 lead 详情指定 Tab 的能力。

### R-FLOW2-F-1 [P2] 转化信息 Tab 在 `convertedCase` 状态下没切换为「已建案件 / 查看案件」展示

- **页面**：lead 详情 → 转化信息 Tab（converted_case 状态）
- **重现**：
  1. R-FLOW-02 进入 `已创建案件` 状态；
  2. 顶部按钮已切到 `编辑信息 / 查看客户 / 查看案件` ✅；
  3. 转化信息 Tab 内仍渲染 `签约并开始建档（按钮 enabled）` + `仅建立客户档案（按钮 enabled）` 两个卡片；
  4. 没有「已生成记录」区块（`leads.detail.conversionTab.recordsTitle`），admin 在该 Tab 看不到「客户/案件 已建好」的视觉确认。
- **根因**：
  - `LeadConversionTab.vue` 的卡片直接读 `buttonStates`，但没有按 `convertedCase` preset 切换为「已建案件 → 查看案件」link card；
  - 缺一个 `已生成记录` 区块（i18n key 已存在 `recordsTitle / viewCustomer / viewCase / historyTitle / typeCustomer / typeCase`）但实现没接上。
- **修复方向**：
  1. `LeadConversionTab.vue` 在 `buttonStates.convertCase === 'view-case'` 时渲染 `已建案件 / 客户编号 / 案件编号 / [跳转]` 卡片；
  2. 复用 `lead.conversion.records[]` 数据；
  3. 单测：`LeadConversionTab.test.ts` 新增 `convertedCase_showsRecordsCard_hidesActionCards`。
- **影响面**：admin 在 Tab 里看不到「转化已成功」的确认，容易再次误点动作。

### R-FLOW2-G-1 [P3] leads 列表对 `family_stay` 旧数据仍以 snake_case 直接渲染

- **页面**：`/leads`
- **重现**：
  - `デモ依頼者 — 王 小明` 行的「联系方式 / 咨询信息」第二段：`family_stay · web`；
  - 其它线索（R-FLOW-02 / R-FLOW-01 / 测试 001 / MCP-R3-B / MCP-R2-A2 / MCP-R2 周二）显示 `family-stay` / `work-visa` / `highly-skilled` / `business-management-visa`，全部 kebab-case；
  - PG 直查：portal-created lead `00000000-0000-4000-b000-000000000010` 的 `intended_case_type` 字段确实是 `family_stay`（snake_case，因 portal seed 直接写入历史值）。
- **根因**：列表 mapper 没有走 `normalizeBusinessType` 兼容旧值（`LEGACY_BUSINESS_TYPE_ALIAS` 仅 `business-manager → business-management-visa`，没把 `family_stay → family-stay` 或反向加进去）。
- **修复方向**：
  1. `LeadAdapterMappers` 在 `mapLeadSummaryRow` 阶段对 `intended_case_type` 走 `normalizeBusinessType`，未识别值原样保留但走 i18n 翻译降级；
  2. `LEGACY_BUSINESS_TYPE_ALIAS` 增加 `family_stay → family-stay`、`engineer_humanities_intl_visa → work-visa` 等 snake↔kebab 适配项；
  3. 单测：`LeadAdapterMappers.test.ts` 新增 `mapsLegacyBusinessTypes`。
- **影响面**：UI 字段口径不齐，但不阻塞流程。

### R-FLOW2-G-2 [P3] R-FLOW-H-1 转化日志 link 文案显示 UUID 前缀（应 `CUS-XXXX-XXXX` / `CASE-XXXX-XXXX`）

- **页面**：lead 详情 → 日志 Tab
- **重现**：
  - `已建案件：defbc401`（应为 `已建案件：CASE-202605-0008`）
  - `已转客户：0577eb14`（应为 `已转客户：CUS-202605-0011`）
- **根因**：
  - `LeadLogPayloadFormatter` 的 `converted_*` 分支当前只读 `payload.customerId / caseId`（UUID）→ 取前 8 位字符；
  - 没去查 `cases.case_no` / `customers.base_profile.customerNumber`。
- **修复方向**：
  1. 服务端 `lead-logs` 序列化时把 `payload.customerNumber / caseNumber` 一并写入（read time 即可）；或在 admin DTO 阶段 join；
  2. 前端格式化优先走 number，缺失时再 fallback UUID 前缀；
  3. 单测：`LeadLogPayloadFormatter.test.ts` 新增 `convertedCustomer_rendersCustomerNumber_whenAvailable`。
- **影响面**：链接虽然能用，但 number 比 UUID 前缀更易于人工沟通。

---

## 2. 已确认正常行为（保留为绿）

| 维度 | 行为 | 证据 |
|------|------|------|
| 新建线索 | 必填校验（姓名）+ 电话/邮箱 dedup pre-check + 201 + 列表 refetch | reqid `2238/2239 GET dedup`、`2240 POST /admin/leads 201`、`2241 GET list 200`，列表「我的 · 7 条」+1 |
| 状态白名单流转 | `new → following → pending_sign → signed` 严格按白名单弹下拉，每次只展示下一步 | reqid `2289/2291/2293 PATCH status 200` 三连，dialog 选项每次单值 |
| signed banner | 进入 signed 后顶部出现 `该线索已签约，下一步请直接开始建档并创建首个案件。` 文案 | snapshot uid `38_1/38_2`（**但 banner CTA 缺失**，见 R-FLOW2-C-1） |
| convert dialog 默认值映射 | lead `intended_case_type=family-stay` → dialog `案件类型=家族滞在` 默认选中 | snapshot uid `43_4 value="家族滞在"`，POST body `caseTypeCode:"dependent_visa"` |
| convert-customer auto-chain swallow | 第二次 convert-customer 400 swallow ✅，紧接着 convert-case 201 | reqid `2298 convert-customer 400`、`2299 convert-case 201` 无 toast 报错 |
| convert-case adapter 修复 | UI 立即从 `signedNotConverted` → `convertedCustomer` → `convertedCase`，无 toast 错误 | snapshot uid `42_0/42_1` → `48_4..48_6`（顶部按钮逐步切换） |
| 服务端 convert 事务 | convert-customer 写 customers + leads.converted_customer_id；convert-case 写 cases + leads.converted_case_id + leads.status=converted_case + 2 个默认任务 | PG `leads / customers / cases / tasks / lead_logs` 全部对齐 |
| 自动任务种子 | case 创建后落 `邀请客户上传基础资料` / `确认客户初次面谈` 两条 pending 任务 | PG `tasks count_for_new_case=2` |
| 案件阶段 | 新建案件直接进入 `S1 · 刚开始办案` | UI 顶部 `S1 · 刚开始办案`，PG `cases.status='S1'` |
| 案件名称合成 | `${customerName} · ${caseTypeLabel}`（`R-FLOW-02 田中花子 · 家族滞在`） | UI 案件详情 H1、cases 列表行 |
| 客户编号 | `CUS-202605-0011` 自动顺号 | PG `customers.base_profile.customerNumber` 顺号 |
| 案件编号 | `CASE-202605-0008` 自动顺号 | PG `cases.case_no` 顺号 |
| 转化日志分类 | 顶部分类 Tab 多了「转化」；converted_customer / converted_case 行渲染为「转化」类型 + clickable link | snapshot uid `49_6/49_7/49_11/49_17` |
| cases 列表 owner picker | 「全部负责人」 = Local Admin / R6走查成员 / ceshi001 / 测试 002（4 个真用户） | snapshot uid `51_31..51_36` |
| 资料清单空态 | 模板未配置时显示「资料模板未配置 / 当前签证类型尚未配置资料模板…」 | snapshot uid `46_0/46_1` |

---

## 3. 关键证据（PG / network）

### 3.1 PG 末态

```sql
-- 计数（基线 → 末态）
leads          | 6 → 7
customers      | 20 → 21
cases          | 29 → 30
case_templates | 0 → 2  -- npm run db:seed-dev 写入
document_items | 7 → 7  -- 没新增（R-FLOW2-B-1）
tasks          | 25 → 27 -- 默认任务 +2
lead_logs      | 30 → 36 -- created+3*status_change+converted_customer+converted_case

-- R-FLOW-02 lead
id=9c73b274-dc66-4765-a60a-1c595cbfadcb
status=converted_case
converted_customer_id=0577eb14-a8cf-4f76-a0e3-0b0b09732565
converted_case_id=defbc401-d2fe-42a6-a7e8-0f9dc4fed8f6
intended_case_type=family-stay   -- kebab-case（与 portal 旧 demo lead 用 family_stay 不同）

-- R-FLOW-02 customer
id=0577eb14-a8cf-4f76-a0e3-0b0b09732565
base_profile.customerNumber=CUS-202605-0011
base_profile.name_jp=R-FLOW-02 田中花子

-- R-FLOW-02 case
id=defbc401-d2fe-42a6-a7e8-0f9dc4fed8f6
case_no=CASE-202605-0008
case_type_code=dependent_visa  -- ← R-FLOW2-B-1：与 case_templates.case_type 不重合
status=S1, stage=S1, case_name=NULL  -- ← R-FLOW2-A-1：触发 buildCaseNamesExpr fallback 路径

-- 资料清单 / 任务
document_items count_for_new_case = 0  -- R-FLOW2-B-1
tasks         count_for_new_case = 2

-- case_templates 当前状态
case_type='family_stay'                   -- 10 items
case_type='engineer_humanities_intl_visa' -- 11 items
-- 与 admin 端 caseTypeCode（work / dependent_visa / business_manager_visa / …）不重合

-- lead_logs（按 created_at）
created            08:20:01  payload.sourceChannel="web"
status_change      08:20:35  new → following
status_change      08:20:55  following → pending_sign
status_change      08:21:09  pending_sign → signed
converted_customer 08:24:40  payload.customerId=0577eb14
converted_case     08:25:00  payload.caseId=defbc401, payload.isBmv=false, payload.caseTypeCode=dependent_visa
```

### 3.2 网络请求（关键路径）

| reqid | method | url | status | 说明 |
|-------|--------|-----|--------|------|
| 2238 | GET | `/admin/leads/dedup?phone=…` | 200 | 电话去重 |
| 2239 | GET | `/admin/leads/dedup?phone=…&email=…` | 200 | 电话+邮箱去重（debounced） |
| 2240 | POST | `/admin/leads` | 201 | 新建线索 |
| 2289 | PATCH | `/admin/leads/:id/status` | 200 | new → following |
| 2291 | PATCH | `/admin/leads/:id/status` | 200 | following → pending_sign |
| 2293 | PATCH | `/admin/leads/:id/status` | 200 | pending_sign → signed |
| 2295 | GET | `/admin/leads/dedup?phone=…&email=…` | 200 | dedup 把 lead 自己识别为重复（**R-FLOW2-E-1**） |
| 2296 | POST | `/admin/leads/:id/convert-customer` | 201 | 第一次成功；R-FLOW-D-1 修复后 UI 即时刷新 |
| 2297 | GET | `/admin/leads/:id` | 200 | 自动 refetch |
| 2298 | POST | `/admin/leads/:id/convert-customer` | 400 | 第二次 `Lead already has a converted customer`，auto-chain swallow ✅ |
| 2299 | POST | `/admin/leads/:id/convert-case` | 201 | 链路继续，UI 刷到 `convertedCase` |
| 2300 | GET | `/admin/leads/:id` | 200 | 最终 refetch |
| 2479 | GET | `/api/customers/0577eb14-…` | **500** | **R-FLOW2-A-1 P0 回归**：列查表达式引用 `cases.case_type_label` |
| —    | GET | `/api/customers/146d985a-…` | **500** | 同上，老 customer R-FLOW-01 也炸 |
| —    | GET | `/api/customers?scope=all&page=1&limit=5` | **500** | 同上，列表也炸 |

---

## 4. 修复路线（建议在同一 P0 hotfix 内闭合 R-FLOW2-A-1 + B-1 + C-1，并把 D-1 / E-1 / E-2 / F-1 一并扫掉）

| ID | 文件 | 动作 |
|----|------|------|
| R-FLOW2-A-1 | `packages/server/src/modules/core/customers/customers.query.ts:97-113` | 把 `ca.case_type_label` 替换为 `coalesce(nullif(ca.metadata->>'caseTypeLabel',''), ca.case_type_code)`；保留 case_name 优先级；新增针对真 PG 的 smoke test |
| R-FLOW2-A-1 | `packages/server/src/modules/core/customers/customers.query.detail-sql.smoke.test.ts`（新建） | 用 docker PG 跑 `getCustomerRowById`，断言无解析期错误，并对 `case_name=null / metadata.caseTypeLabel='X'` fixture 验证 caseNames 落到 fallback 分支 |
| R-FLOW2-B-1 | `packages/server/src/scripts/__data__/caseTemplateBlueprints/*.ts` + `seedCaseTemplates.ts` | 新增 `work` / `business_manager_visa` 模板 blueprint；把现有 `family_stay` rename 为 `dependent_visa`，或加 `case_type_aliases ['family_stay','dependent_visa']` 字段 |
| R-FLOW2-B-1 | `packages/server/src/modules/core/cases/cases.template.repository.ts` | `findActiveCaseTemplateByCaseType` 改为 `where case_type=$1 OR $1 = ANY(case_type_aliases)` |
| R-FLOW2-B-1 | `packages/server/src/modules/core/cases/cases.template.repository.test.ts` | 新增 `aliasMatch_returnsTemplate` 用例 |
| R-FLOW2-C-1 | `packages/admin/src/views/leads/types-detail.ts:364-370` | `signedNotConverted.convertCase` `"hidden"` → `"highlighted"`；同步保留 `convertCustomer: "enabled"`（备选） |
| R-FLOW2-C-1 | `packages/admin/src/views/leads/components/LeadBannerStrip.test.ts` / `LeadDetailHeader.test.ts` | 增 `signedNotConverted_rendersConvertCaseCta` 用例 |
| R-FLOW2-D-1 | `packages/admin/src/views/customers/model/useCustomerListModel.ts` | 5xx 时设置 `loadError`，list 不归 0；KPI 卡片在 loadError 显示骨架 + retry |
| R-FLOW2-E-1 | `packages/server/src/modules/core/leads/leads.dedup.controller.ts` 或 `LeadAdapter` | dedup 端点支持 `excludeLeadId`；admin 调用时传 `lead.id` |
| R-FLOW2-E-2 | `packages/admin/src/views/leads/model/useLeadDetailModel.ts` | activeTab 初值读 `route.query.tab`；switchTab 同步写回 |
| R-FLOW2-F-1 | `packages/admin/src/views/leads/components/LeadConversionTab.vue` | `convertCase === 'view-case'` 时换成「已建案件 / 客户编号 / 案件编号 / 跳转」记录卡片 |
| R-FLOW2-G-1 | `packages/admin/src/i18n/messages/_shared/businessTypes.ts` + `LeadAdapterMappers.ts` | `LEGACY_BUSINESS_TYPE_ALIAS` 加 snake↔kebab 兼容项；mapper 走 `normalizeBusinessType` |
| R-FLOW2-G-2 | `packages/server/src/modules/core/leads/leads.logs.serializer.ts`（或同名 mapper） + `LeadLogPayloadFormatter.ts` | payload 多带 `customerNumber/caseNumber`；前端优先 number，再 fallback UUID |

---

## 5. 附录：本轮端到端步骤序

1. baseline `leads=6 / customers=20 / cases=29 / case_templates=0 / document_items=7`，登录 admin@local.test；
2. 跑 `npm run db:seed-dev` → `case_templates=2`（`family_stay` 10 项 + `engineer_humanities_intl_visa` 11 项）；
3. `/leads` → `新建线索` dialog → 录入 `R-FLOW-02 田中花子 / 09033335555 / r-flow-02@example.com / 网站表单 / 家族滞在 / tokyo-1 / Local Admin / 日语`；
4. dedup 双发 + 201 + 列表 refresh +1（leads=7）；
5. lead 详情 → `调整状态` 三连（新咨询 → 跟进中 → 待签约 → 已签约），每步 PATCH 200；
6. signed 后：
   - 顶部 header 没有「签约并开始建档」按钮（**R-FLOW2-C-1**）
   - banner 文案有但**无按钮**（**R-FLOW2-C-1**）
   - 转化 Tab 内「签约并开始建档」**disabled**（**R-FLOW2-C-1**）
   - 唯一可点入口：「仅建立客户档案」
7. 点「仅建立客户档案」→ dedup 弹窗把 lead 自己列成「可能重复」（**R-FLOW2-E-1**）→ 点「确认转化」 → reqid `2296 POST convert-customer 201`；
8. UI 立即刷新到 `convertedCustomer`（**R-FLOW-D-1 修复确认**）：顶部 `编辑信息 / 查看客户 / 签约并开始建档`，转化 Tab 内「签约并开始建档」 enabled；
9. 点「签约并开始建档」→ dialog 默认 `案件类型=家族滞在 / 案件负责人=Local Admin / 所属组=tokyo-1` → 点「确认创建案件」 →
   - reqid `2298 POST convert-customer 400`（auto-chain 第一步失败 swallow）
   - reqid `2299 POST convert-case 201`
   - reqid `2300 GET 详情 200`（自动 refetch）
   - UI 刷到 `convertedCase`，顶部 `编辑信息 / 查看客户 / 查看案件`（**R-FLOW-D-2 修复确认**）；
10. 点「查看案件」→ 进入 `CASE-202605-0008` 详情：S1 ✅、关联客户 link、`资料清单 0/0`（**R-FLOW2-B-1**）、空态文案「资料模板未配置」（**R-FLOW-C-1 修复确认**）、`任务 待办 2` ✅；
11. 点关联客户 link → `/customers/0577eb14...` → **「暂时无法加载该客户」错误页**（**R-FLOW2-A-1 P0**）；
12. 浏览器内 `evaluate_script` 直查：R-FLOW-01 customer / R-FLOW-02 customer / customers 列表 三个端点全 500；
13. 跳 `/customers` 列表 → 顶部 KPI 全 0、列表 0 位（**R-FLOW2-D-1**），owner picker 仍是 7 个 fixture 名（**R-FLOW-G-2 cases 已修、customers 未修**）；
14. 跳 `/cases` 列表 → 28 条全部加载、owner picker 4 真用户（**R-FLOW-G-2 cases 已修**），R-FLOW-02 / R-FLOW-01 case 名称合成正确；
15. 回 lead 详情 → 日志 Tab → 6 条记录、转化分类 Tab、convert 事件渲染为「转化」+ clickable link（**R-FLOW-H-1 修复确认**）；
16. PG 末态校验：
    - lead `status=converted_case`、`converted_customer_id`、`converted_case_id` 全部正确；
    - case `case_type_code=dependent_visa`、`case_name=NULL`（触发 R-FLOW2-A-1 fallback）；
    - case_templates 仍是 2 条，但 `dependent_visa` 不在表里（**R-FLOW2-B-1**）；
    - lead_logs 6 条：`created` / `status_change × 3` / `converted_customer` / `converted_case`，payload schema 正确。
