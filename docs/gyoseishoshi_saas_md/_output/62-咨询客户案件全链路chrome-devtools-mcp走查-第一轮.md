# 咨询 → 客户 → 案件 全链路 chrome-devtools-mcp 走查（第一轮 / R-FLOW-01）

> 生成日期：2026-05-07
>
> 命题：以 admin（Local Admin）身份从 `/leads` 创建一条线索，依次推进
> `new → following → pending_sign → signed`，触发「签约并开始建档」自动
> 链路（先 convert-customer 再 convert-case），并跟到 `/customers/:id`、
> `/cases/:id` 验证 P0 主链路 §4.1（咨询转案件）端到端是否真的走通。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill_form / type_text / wait_for / evaluate_script /
> list_network_requests / get_network_request / list_console_messages）+
> 直连 PG 校验真实持久化、case_templates、document_items、tasks、lead_logs。
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）。本轮新增
> 1 条线索 `LEAD-202605-0005 / R-FLOW-01 王小红`（intended_case_type =
> `work-visa`，避开 BMV gate），convert 成功落库 1 个 customer
> `CUS-202605-0010 / 146d985a` 与 1 个 case `CASE-202605-0007 / 5bf4b2c9`。
> 末态 leads 6 条 / customers 20 条 / cases 29 条。
>
> 上游权威：
>
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md#41-咨询转案件)
> - [P0/04-核心流程与状态流转.md §4.2 资料收集与审核](../P0/04-核心流程与状态流转.md#42-资料收集与审核)
> - [P0/06-页面规格/咨询线索.md §4 关键动作](../P0/06-页面规格/咨询线索.md)
> - [P0/06-页面规格/客户.md §3 详情页 / §4 关键动作](../P0/06-页面规格/客户.md)
> - [P0/06-页面规格/案件.md](../P0/06-页面规格/案件.md)
> - [60-咨询模块chrome-devtools-mcp走查-第五轮.md](./60-咨询模块chrome-devtools-mcp走查-第五轮.md)
> - [ADR-admin-convert-split.md](./ADR-admin-convert-split.md)

---

## 0. 总结

### 0.1 一句话结论

**P0 主链路「咨询录入 → 客户建档 → 案件创建」在服务端事务上完全跑通
（lead → customer → case 三张表 + lead_logs 都正确落库），但客户端
`adaptLeadMutationResult` 把 `{lead, customerId}` / `{lead, caseId}` 当
作非法响应 → 整条「签约并开始建档」点击在 UI 看到的永远是『转案件失败，
请稍后重试。』，admin 必须 reload 才能看到刚建出来的客户/案件。** 同时
case 创建后「资料清单」永远是 0/0（`case_templates` 表 0 行，没有
`work` 模板的 `requirement_blueprint` 生效）；customer 详情把 BMV 承接
卡片当成全签证类型的全局门禁，导致非 BMV 客户（work-visa / 高度人才 /
永住等）从客户页发起的「开始办案」按钮永远 disabled，与 P0/06-页面规格
/客户.md §4 关键动作「从客户发起建案」彻底冲突。

> 净效果：lead 转案件 happy-path 在 PG 是绿的，但 UI 完全是红的——
> 服务端写完 customer + case 之后客户端立即丢失追踪，admin 看见
> 「转案件失败」，会习惯性地重试，导致重复 POST convert-customer 的 400
> 错误链；且 customer 详情页的 BMV 卡片把建案动作锁死在客户对象上。
> 整个 §4.1 流程在 UI 不可作业。

### 0.2 优先级分布

| 等级 | 个数 | 编号 | 主题 |
|------|------|------|------|
| P0 | 0 | — | — |
| P1 | 3 | R-FLOW-D-1 / R-FLOW-E-1 / R-FLOW-F-1 | convert 客户端 adapter 字段错位（成功 → 报失败）/ 案件资料清单永远空（case_templates 0 行）/ customer 详情 BMV 门禁对所有签证类型生效 |
| P2 | 4 | R-FLOW-D-2 / R-FLOW-G-1 / R-FLOW-G-2 / R-FLOW-H-1 | 转化失败后 UI 不刷新（需 reload）/ 客户摘要「案件名称」永远 `—` / 客户 owner picker 选项错源（仅 fixture 日本员工，不含 Local Admin）/ lead 日志把 convert 当成「状态变更」并把 customerId/caseId 写进 to_value |
| P3 | 3 | R-FLOW-A-1 / R-FLOW-B-1 / R-FLOW-C-1 | leads 列表 source_channel 列错位为「创建路径 source」/ 转化信息 Tab `签约并开始建档` 按钮长期 disabled 但 banner 同名按钮 enabled / case 资料 Tab 在 `本地资料根目录未配置` alert 与「暂无资料登记」叠加 |

### 0.3 R3 / R4 / R5 历史修复回归矩阵（与本链路相关）

| 编号 | 主题 | R-FLOW 验证 | 证据 |
|------|------|-------------|------|
| R5-E-1 | convert-case 弹窗 owner picker 仅 1 选项 | ✅ 已修复 | dialog `案件负责人` dropdown 现 4 个选项（Local Admin / R6走查成员 / ceshi001 / 测试 002） |
| R5-A-3 | lead 详情基础信息 Tab 不渲染 tags | ✅ 已修复 | 基础信息 Tab 末尾出现「标签」row，新建 lead 显示 `—`，与列表 chip 一致 |
| R4-A-2 | 详情 Tab 显示 UUID 当线索编号 | ✅ 仍生效 | `线索编号 = LEAD-202605-0005` |
| R4-A-3 | `web (web)` 重复渲染 | ⚠️ 详情 Tab 已修复（`网站表单 （创建路径：管理员后台）`），**列表「联系方式 / 咨询信息」列仍把 source_channel 错位**（**R-FLOW-A-1**） | demo lead 列表行：`work-visa · admin`（应是 `work-visa · web`，或更显式拆成 业务 + 来源 两段） |
| R3-D-2 | 编辑信息「来源」dropdown 回填 | ⏸️ 未本轮触发（dialog 未打开） | — |
| R5-D-2 | convert auto-chain `CUSTOMER_ALREADY_CONVERTED` swallow | ⚠️ swallow 已实装（reqid=414 400 后链路继续走 reqid=415 convert-case 201）；**但因 R-FLOW-D-1 adapter bug，UI 仍报「转案件失败」** | 见 §1 R-FLOW-D-1 |
| R3-F-2 | bulk-tags 持久化 + audit | ⏸️ 未本轮触发 | — |

---

## 1. 新发现缺陷明细（R-FLOW-A …… R-FLOW-H）

### R-FLOW-D-1 [P1] convert-customer / convert-case 客户端 adapter 字段错位 —— 服务端 201 但 UI 报「转案件失败，请稍后重试。」

- **页面**：lead 详情 → 「签约并开始建档」 dialog
- **重现**：
  1. 创建一条 `signed` 线索 `LEAD-202605-0005`，`intended_case_type=work-visa`（无 BMV gate）；
  2. 顶部 banner 点「签约并开始建档」 → dialog 默认 `案件类型=技人国 / 案件负责人=Local Admin / 所属组=tokyo-1` → 点「确认创建案件」；
  3. 第一次点击：网络面板观察到 `POST /admin/leads/:id/convert-customer` **201**（响应 body 含 `lead.id` + `customerId`）； UI 弹通用 toast `转案件失败 → 转案件失败，请稍后重试。`； dialog 依然打开； **完全没有触发后续 `convert-case` 与 `fetchDetail` 的网络请求**；
  4. 直查 PG：`leads.converted_customer_id = 146d985a…` ✅、`customers` 表新增 `CUS-202605-0010`，与 UI 报错明显矛盾；
  5. reload 页面后顶部按钮变为 `查看客户` + `签约并开始建档`，再点「签约并开始建档」 → `POST convert-customer` **400** `Lead already has a converted customer` → 内层 `CUSTOMER_ALREADY_CONVERTED` swallow ✅ → 继续 `POST convert-case` **201**（响应 body 含 `lead.id` + `caseId=5bf4b2c9…`）； **UI 仍弹同一通用 toast `转案件失败，请稍后重试。`**；PG 直查 case `CASE-202605-0007` 已 `S1`、`leads.converted_case_id=5bf4b2c9…`、`leads.status=converted_case` 全部正常落库。
- **根因**：
  - `packages/admin/src/views/leads/model/LeadAdapterMappers.ts:471-478` `adaptLeadMutationResult`：
    ```ts
    export function adaptLeadMutationResult(value: unknown): LeadMutationResult | null {
      const record = asRecord(value);
      if (!record) return null;
      const id = readString(record, "id");
      return id ? { id } : null;
    }
    ```
  - 服务端 `packages/server/src/modules/core/leads/leads.admin.service.ts:413` / `:436` 返回的是
    ```ts
    Promise<{ lead: Lead; customerId: string }>   // convert-customer
    Promise<{ lead: Lead; caseId: string }>       // convert-case
    ```
    根级别没有 `id` 字段；
  - 客户端 `LeadRepository.createConvertCustomer` / `createConvertCase` 都用 `adapt: adaptLeadMutationResult`、`errorMessage: "Invalid convert customer/case response"`；
  - `LeadRepositorySupport.expectValid` 看 adapter 返回 `null` → 抛 `LeadRepositoryError({ code:"BAD_RESPONSE", status: response.status, message })`；
  - `useLeadDetailModel.doConvertCase` 内层 try 只 swallow `serverErrorCode === "CUSTOMER_ALREADY_CONVERTED"`，对 `BAD_RESPONSE` 直接 rethrow；
  - 外层 catch → `toConvertCaseFailure(error)` → `kind="generic"` + `messageKey="leads.errors.convertCaseFailed"` → View 弹通用 toast。
  - 注意 `LeadAdapterTypes.ts` 已经留有「`adaptLeadMutationResult` 在合法响应上误判为格式错误」的 backlog 注释（line 100-101），bulk endpoints 已自带专用 adapter，但 convert-customer / convert-case 仍未对齐。
- **修复方向**：
  1. 把 convert-customer / convert-case 单独适配，新增 `adaptLeadConvertCustomerResult` / `adaptLeadConvertCaseResult`，从 `record.lead.id || record.customerId || record.caseId` 拿 ID，并把 customerId / caseId 一并透传到 model state（用于 UI 立即跳「查看客户」/「查看案件」）；
  2. 或最小修：让 `adaptLeadMutationResult` 兼容三种 shape：`record.id || record.lead?.id || record.customerId || record.caseId`；
  3. `useLeadDetailModel.doConvertCase` 在 convert-case 成功后把返回的 `{lead, caseId}` 写回 state，避免依赖随后的 fetchDetail；
  4. 单测：
     - `LeadAdapterMappers.test.ts` 新增 `mapsServerConvertCustomerShape` / `mapsServerConvertCaseShape` 用例（输入 `{lead:{id:"…"}, customerId:"…"}` → 期望 adapter 返 `{id, customerId}`）；
     - `useLeadDetailModel.convertCase-auto-chain.test.ts` 新增 `convert-customer + convert-case 双 201 happy-path` 用例（mock 返 server 真 shape），断言：`failure === null`、view dialog 关闭、不弹 toast；
- **影响面**：
  - `signed` lead 走 happy-path（非 BMV）= 100% UI 失败；
  - admin 看到 toast 后会习惯性重试，引发 reqid=414 那种 `Lead already has a converted customer` 400 错误链；
  - 与 `customers` / `cases` 列表统计不一致（PG 增长，但用户在 UI 看不到「成功」反馈）；
  - 是 R5-D-2 修复（`CUSTOMER_ALREADY_CONVERTED` swallow）的延伸——R5-D-2 让 auto-chain 能继续到 convert-case，但 convert-case 自己也踩同样的 adapter bug。
- **关联**：
  - `LeadAdapterTypes.ts:100` 「`adaptLeadMutationResult` 在合法响应上误判为格式错误」backlog 应在本 PR 关闭；
  - 与 R5-D-2 同源（auto-chain），需要一起在「转案件 P1」工单合并修；
  - 依赖此修复的下游：customer 详情的「关联案件 Tab」、案件详情的 `S1` UI、lead 详情的 banner 切换。

### R-FLOW-E-1 [P1] case 创建后「资料清单」永远是 0/0 —— `case_templates` 表 0 行，无 `work` 模板的 requirement_blueprint 生效

- **页面**：`/cases/:id?tab=documents`
- **重现**：
  1. R-FLOW-D-1 修复路径打通后，PG 实测有 `CASE-202605-0007 / S1 / case_type_code=work / customer_id=146d985a`；
  2. UI 进入案件详情 → Tab 标题 `资料清单 0/0`；
  3. 点开 Tab → 顶部红色 alert `本地资料根目录未配置 / 尚未设置本地归档根目录。请联系管理员先完成配置，之后才能登记资料。`； 主体空态 `暂无资料登记 / 该案件尚未添加任何资料需求。请通过「登记资料」或「手动添加」开始建立资料清单。`；
  4. 直查 PG：`select count(*) from document_items where case_id='5bf4b2c9-…';` → **0**；
  5. 直查 PG：`select count(*) from case_templates;` → **0**（**整张 `case_templates` 表都是空的**，说明任何 case_type 创建出来的案件都不会自动展开资料清单）。
- **根因**：
  - 服务端 `runConvertCase`（与 `runConvertCustomer` 配套）写了 `cases` 行 + 2 条默认 `tasks`（`邀请客户上传基础资料` / `确认客户初次面谈`），但**没有读 `case_templates.requirement_blueprint` 并展开成 `document_items`**；
  - `case_templates` 表 schema 已经准备好（`requirement_blueprint jsonb` / `default_tasks_blueprint jsonb` / `validation_ruleset_ref jsonb`），但 demo seed 没有写任何模板（CASE-DEV-001 / 002 / 003 也是 0 个 document_items，全凭手动 `登记资料` 录入）；
  - 与 P0/04-核心流程 §4.2 step 1「案件创建后，系统根据『签证类型 × 申请类型』匹配模板并生成资料清单」严重背离。
- **修复方向**：
  1. **数据**：把首版需要的两类模板（家族滞在 / 技人国，按 P0 §1.2 「首版模板固定为」）写成 seed 脚本，覆盖 `case_templates(case_type, requirement_blueprint)`；
  2. **服务端**：`runConvertCase` 在写完 `cases` 行后，立即根据 `case_type_code` 查到 `case_templates`，把 `requirement_blueprint` 展平为 `document_items`（保留 `provided_by_role / required_flag / category` 三字段）；
  3. 单测：
     - `cases.create.service.test.ts` 新增 `documentItemsExpandedFromTemplate`（fixture: 一份 work 模板 → expect 3 个 document_items）；
     - `LeadConvertCaseService.test.ts` 新增 e2e（mock case_templates → 期望 case 落库后 document_items.count > 0）；
  4. UI：在 templates 缺失时，给一条 inline `当前签证类型尚未配置资料模板，请联系管理员维护` 提示，避免误以为是空案件正常态；
- **影响面**：
  - 整个 §4.2 「资料收集与审核」流程从一开始就是空的，admin 没有催办对象；
  - Gate-A（S3 → S4）触发条件「资料项已有 approved」永远满足不了，整条 P0 主链路实际卡在 S1；
  - case 详情概览的「资料完成率 0%」、「按提供方完成率」无意义；
  - 与 R5 走查范围不重叠，是本轮新发现。
- **关联**：
  - 应作为「P0 案件主链路 happy-path」最高优先级 fix，与 R-FLOW-D-1 配对放进同一 PR 才能让「咨询 → 客户 → 案件 → 资料清单」打通。

### R-FLOW-F-1 [P1] customer 详情顶部 BMV 承接卡片 + 「开始办案」按钮门禁对所有签证类型生效

- **页面**：`/customers/:id`
- **重现**：
  1. R-FLOW-D-1 路径建出的 customer `CUS-202605-0010 / R-FLOW-01 王小红`，对应 lead `intended_case_type = work-visa`；
  2. 顶部按钮区域：
     - `批量开始办案` disabled
     - `开始办案` disabled（且 hint 文案：`经营管理签客户需先完成签约，才可进入建案流程。`）
  3. 基础信息 Tab 顶部立即显示一张 `经营管理签承接` 卡片（uid `经营管理签承接卡片`）：
     - 状态：`未开始`
     - 下一步：`发送问卷，启动承接流程`
     - 建案门禁：`签约完成前仍不可建案`
     - 三步状态：`问卷=未发送 / 报价=待生成 / 签约=未开始`
     - 三个动作按钮：`发送问卷` 可点 / `生成报价 disabled` / `记录签约 disabled`
  4. 即使是 work-visa 客户，要从客户详情页发起「批量建案」也必须先完成 BMV 问卷 → 报价 → 签约，逻辑严重错误。
- **根因**：
  - `customers/components/CustomerBmvIntakeCard`（或同名）作为客户详情顶部的全局组件，没有按 `customer.intended_case_type` / `customer.bmv_required` 做条件渲染；
  - `批量开始办案` / `开始办案` 按钮的 disabled 逻辑直接读 BMV intake stage，而不是判定「customer 是否需要 BMV」；
  - 与 P0/06-页面规格/客户.md §3 详情页（顶部概览 + 5 个 Tab，无 BMV 卡片）、§4 关键动作「从客户发起建案」+「批量建案（家族签向导）」彻底冲突——P0 文档把 BMV 承接定义为经营管理签独有的前置流程，不应作为全客户类型的通用门禁。
- **修复方向**：
  1. `CustomerBmvIntakeCard` 与「开始办案 disabled」逻辑统一抽到 `customer.businessTypeRequiresBmv = customer.intendedCaseType === 'business-management-visa' || hasBmvCase`；
  2. 当 `requiresBmv === false`：
     - 不渲染 BMV 卡片；
     - 「开始办案」按钮按 P0/06-页面规格/客户.md §4 行权限直接 enabled，点击进入「选择案件类型 / 主申请人 / 负责人」dialog；
  3. 当 `requiresBmv === true`：
     - 维持现有 BMV 卡片 + 门禁文案；
  4. 单测：
     - `CustomerDetailHeader.test.ts` 新增 `nonBmvCustomer_doesNotShowBmvCard`、`nonBmvCustomer_startCaseButtonEnabled` 两条用例；
     - `CustomerBmvIntakeCard.test.ts` 新增 `nonBmvCustomer_isHidden` 用例。
- **影响面**：
  - 所有非 BMV 客户（high-skilled / work-visa / family-stay / company-setup / permanent / other）从客户页发起建案在 UI 永远 disabled；
  - 与 P0/06-页面规格/客户.md §4 关键动作「客户发起建案 主办人/助理可执行」直接冲突；
  - lead → customer 之后 admin 在 customer 详情找不到合规入口，被迫走 lead 详情或 cases 列表 `新建案件`，破坏「从客户发起建案」的产品语义。
- **关联**：
  - 与 R-FLOW-D-1 + R-FLOW-E-1 配对，组成「P0 主链路 §4.1 → §4.2 客户视角不可作业」一组 P1。

### R-FLOW-D-2 [P2] convert 失败 toast 后 UI 不刷新——必须 reload 才能看到 `查看客户` / `查看案件`

- **页面**：lead 详情 → 「签约并开始建档」 dialog
- **重现**：
  1. R-FLOW-D-1 第一次点击 → 服务端 `POST /convert-customer 201` 完成，但客户端 adapter 抛 BAD_RESPONSE → toast 错误；
  2. 此时 UI 顶部按钮仍是 `编辑信息 / 调整状态 / 标记流失 / 仅建客户档案`、banner 仍是 `该线索已签约，下一步请直接开始建档并创建首个案件。`；
  3. 关闭 dialog、切到其他 Tab、回到「基础信息」均不刷新；
  4. 必须按 `Cmd+R` reload，UI 才更新为 `编辑信息 / 查看客户 / 签约并开始建档`、banner 消失。
- **根因**：
  - `useLeadDetailModel.doConvertCase` 在 convert-customer rethrow 后立即外层 catch，**没有调 `refs.fetchDetail()` 兜底**；
  - 即使服务端实际写入完成，model state 仍用 dialog 打开前的 lead 快照；
  - 与 R-FLOW-D-1 修复方向耦合，但即使保留 adapter 错位，也应当在 catch 分支调一次 fetchDetail，避免数据泄漏。
- **修复方向**：
  1. `doConvertCase` finally 块或 catch 分支无条件触发 `await refs.fetchDetail()`，确保 UI 永远反映服务端真值；
  2. 单测：`useLeadDetailModel.convertCase-error.test.ts` 新增 `errorThrown_stillRefetchesDetail` 用例。
- **影响面**：
  - 与 R-FLOW-D-1 联合，admin 在 toast 出现后误以为没建出客户/案件 → 重试 → 二次 400 错误链；
  - 即便 R-FLOW-D-1 修好，本条仍需独立保证「失败也要刷新」的 UX 兜底。

### R-FLOW-G-1 [P2] customer 详情顶部「案件名称」永远 `—`，关联案件 Tab 案件列没有 case 名称

- **页面**：`/customers/:id?tab=cases`
- **重现**：
  1. R-FLOW-D-1 路径建出的 customer `CUS-202605-0010` 关联 1 个案件 `CASE-202605-0007 / R-FLOW-01 王小红 · 工作签证`；
  2. 顶部 region「案件摘要」字段：`累计案件 1 / 活跃案件 1 / 归档数 0 / 案件名称 — / 最近建案 2026/05/07 15:27`；
  3. 「关联案件」Tab 表格列：`编号=CASE-202605-0007 / 案件=（仅 button『打开案件 5bf4b2c9...』，没有可见 case 名称）/ 类型=工作签证 / 阶段=刚开始办案 / 状态=主办：Local Admin / 活跃 / 2026/05/07 15:27`；
  4. 案件名称 = customer name + case_type_code 在案件详情已经合成成功（`R-FLOW-01 王小红 · 工作签证`），customer 视角直接复用即可。
- **根因**：
  - customer 详情聚合接口 `/admin/customers/:id` 返回的 `relatedCases[]` 没有 `name` 字段，UI 只读 `caseId`；
  - `CustomerOverviewSection.vue` 的「案件名称」始终走 fallback `—`；
  - `CustomerCasesTab.vue` 表格首列只渲染 `<button @click="open(caseId)">打开案件 {{caseId}}</button>`，没有渲染案件名称。
- **修复方向**：
  1. 服务端 customer detail 聚合补 `relatedCases[].name = `${customerName} · ${caseTypeLabel}` `；
  2. UI 把表格首列拆成两行：上行 `案件名称 link → /cases/:id`，下行 `编号小字`；
  3. 顶部 region 「案件名称」用第 1 个案件名称，多于 1 个时后跟 `+N` 折叠 popover（与 P0/06-页面规格/客户.md 顶部概览描述一致）；
- **影响面**：admin 在 customer 详情看不到该客户名下案件的可读名称，只能凭 UUID 分辨多案件；与「主体客户 → 多案件」的 P0 设计意图不一致。

### R-FLOW-G-2 [P2] customer 详情 owner picker 选项错源——仅 fixture 日本员工，不含 Local Admin

- **页面**：`/customers/:id` 基础信息 Tab → `客户负责人` combobox
- **重现**：customer `R-FLOW-01 王小红` 负责人 dropdown 选项：
  - `铃木 / 田中 / 李 / 佐藤 / 山田翔太 / 高桥健太 / 铃木明里`（全部是 fixture 日本姓名，无 ID 后缀）
  - **缺**：`Local Admin / R6走查成员 / ceshi001 / 测试 002`（admin 端 `GET /api/users` 实际返回的真用户）
- **同一页对比**：
  - lead detail 的 reassign / convert-case dialog owner picker（R5-E-1 修复后）= 4 个真用户；
  - customer 列表「负责人」筛选 = 7 个 fixture 名（与本条同源 mock）；
  - cases 列表「全部负责人」 = 7 个 fixture 名 + 这次的 Local Admin。
- **根因**：customer / cases 模块未走 `useOrgUserOptions / getActiveUserOptions`，而是消费了某个 fixture mock。  即便 lead / convert dialog 已修，customer 详情、cases 列表、客户列表筛选还有同源退化。
- **修复方向**：
  1. 让 `customers/components/CustomerInfoTab.vue` + `cases/components/CaseListFilters.vue` 切换到 `useOrgUserOptions`；
  2. 单测：`CustomerInfoTab.test.ts` 新增 `ownerOptionsMatchActiveUsers` 用例。
- **影响面**：admin 无法把客户 owner / case owner 指给真实成员；与 R5-E-1 同源（lead/会话已修，但 customer/cases 仍残留）。

### R-FLOW-H-1 [P2] lead 详情 日志 Tab 把 convert 事件渲染为「状态变更」并把 customerId/caseId 写进 to_value

- **页面**：lead 详情 → 「日志」 Tab
- **重现**：
  1. R-FLOW-01 lead 6 条 log 实际持久化为：`created / status_change × 3 / converted_customer / converted_case`（PG `lead_logs.log_type` 直查）；
  2. UI 渲染所有 6 条均显示「状态变更」；
  3. `converted_customer` 行渲染：`已签约 → 146d985a-5763-4132-a6e5-1d1f793ea9ac`（把 `payload.customerId` 当作 `to_value` 显示）；
  4. `converted_case` 行渲染：`已签约 → 5bf4b2c9-fd7d-4048-bc65-11d13e810f75`（把 `payload.caseId` 当作 `to_value` 显示）；
  5. 顶部分类 Tab 仅 `全部 / 状态变更 / 人员变更 / 所属组变更 / 其他`，convert 事件没有归到「其他」或独立的「转化」分类。
- **根因**：
  - `LeadLogPayloadFormatter.ts` 对 `log_type` 没有分支，统一按 status_change 模板渲染（读 `payload.from / payload.to`），convert 类型的 payload 实际是 `{customerId}` / `{caseId}`，落到模板里就当成 `to`；
  - `LeadLogTabFilter.vue` 的过滤维度也没把 `converted_customer / converted_case` 列入。
- **修复方向**：
  1. `LeadLogPayloadFormatter` 加 `converted_customer` / `converted_case` 分支，分别渲染 `已转客户：CUS-XXXX-XXXX 链接` / `已建案件：CASE-XXXX-XXXX 链接`；
  2. 顶部分类 Tab 增加「转化」 Tab；
  3. 单测：`LeadLogPayloadFormatter.test.ts` 新增对应用例（已存在文件）。
- **影响面**：admin 在日志 Tab 看不到转化里程碑，且 UUID 直接暴露在状态文案上，可读性差。

### R-FLOW-A-1 [P3] leads 列表「联系方式 / 咨询信息」列把 `source_channel` 错位为 `source`（创建路径）

- **页面**：`/leads` 列表
- **重现**：
  - R-FLOW-01 lead 行第二列下半段：`work-visa · admin`；
  - PG 实际：`source_channel='web'`（用户选「网站表单」）+ `source='admin'`（legacy 字段，表示通过 admin UI 录入）；
  - 详情 Tab 已正确渲染：`来源 = 网站表单 （创建路径：管理员后台）`；列表却把 legacy `source` 当成「来源」展示，与 R4-A-3 的修复方向不一致。
- **根因**：`LeadTableRow.vue` 的 `咨询信息` 二级行用 `${intendedCaseType} · ${source}`，但 R4-A-3 的修复只覆盖了 detail Tab，列表渲染没同步。
- **修复方向**：
  1. 列表第二列下半段统一改为 `${businessTypeLabel} · ${sourceChannelLabel}`，与详情 Tab 口径一致；
  2. i18n key：复用 `leads.options.businessType.*` + `leads.options.sourceChannel.*`；
  3. 单测：`LeadTableRow.test.ts` 新增 `rendersSourceChannel_notLegacySource`。
- **影响面**：列表 `web (web)` → 已修，但 `web → admin` 这条新错位会让 admin 误以为客户来源是后台录入，造成销售归因失真。

### R-FLOW-B-1 [P3] 转化信息 Tab `签约并开始建档` 按钮 disabled，但顶部 banner 同名按钮 enabled —— 同一动作 UI 两态

- **页面**：lead 详情 → `转化信息` Tab
- **重现**：
  - signed lead 进入 Tab，左侧卡片 `签约并开始建档 / 系统会先创建客户档案，再继续创建首个案件 / [按钮 disabled]`；
  - 顶部 banner `该线索已签约，下一步请直接开始建档并创建首个案件。 / [按钮 enabled]`；
  - 同一动作两个入口、显示状态相反（一个可点一个不可点）。
- **根因**：Tab 内按钮的 disabled 逻辑读 `convertedCustomerId !== null`，banner 的不读；二者门禁条件应统一，或 Tab 内变成「再次创建案件（disabled 时显示原因）」。
- **修复方向**：
  1. 让 Tab 内卡片的 disabled 与 banner 一致（依据 `status === "signed" && !convertedCaseId`）；
  2. 当 `convertedCaseId` 已存在，Tab 内卡片改成「已创建案件 → 跳转 `查看案件`」；
- **影响面**：admin 在 Tab 内看到 disabled 按钮会以为不能继续操作，明显的状态/语义不一致。

### R-FLOW-C-1 [P3] 案件详情 资料清单 Tab 顶部 `本地资料根目录未配置` alert 与「暂无资料登记」 同时叠加

- **页面**：`/cases/:id?tab=documents`
- **重现**：刚 convert 出来的案件，资料清单 Tab 顶部红色 alert `本地资料根目录未配置 / 尚未设置本地归档根目录。请联系管理员先完成配置，之后才能登记资料。`，下方主体空态 `暂无资料登记 / 该案件尚未添加任何资料需求。请通过「登记资料」或「手动添加」开始建立资料清单。`，且 `登记资料` 按钮 disabled、`手动添加` 可点。
- **根因**：alert 与空态各自独立渲染，无主从关系；当模板未生效（R-FLOW-E-1）时，admin 同时看到「目录没配 + 没数据」两条噪声。
- **修复方向**：
  1. 模板未生效时，主空态文案改为「当前签证类型尚未配置资料模板，请联系管理员维护」，与 alert 串行展示；
  2. 配置完目录但仍 0 条时，再回到「暂无资料登记」当前文案。
- **影响面**：纯文案噪声，不阻塞作业，但 onboarding 体验差。

---

## 2. 已确认正常行为（保留为绿）

| 维度 | 行为 | 证据 |
|------|------|------|
| 新建线索 | 必填校验（姓名）+ 电话/邮箱 dedup pre-check + 201 + 列表 refetch | reqid `182/183 GET dedup`、`184 POST /admin/leads 201`、`185 GET list 200`，列表「我的 · 6 条」+1 |
| dedup 防重复 | 输入电话同时触发去重，无命中时正常通过 | 转化信息 Tab `未检测到重复记录` |
| 状态白名单流转 | `new → following → pending_sign → signed` 严格按白名单弹下拉，每次只展示下一步 | reqid `232/234/236 PATCH status 200` 三连，dialog 选项每次单值 |
| signed banner | 进入 signed 后顶部出现 `该线索已签约，下一步请直接开始建档并创建首个案件。` + CTA | snapshot uid `12_2/12_3` |
| convert dialog 默认值映射 | lead `intended_case_type=work-visa` → dialog `案件类型=技人国` 默认选中（kebab→snake → i18n label 链路一致） | snapshot uid `14_4 value="技人国"`，POST body `caseTypeCode:"work"` |
| owner picker（convert-case dialog） | dropdown 4 选项（Local Admin / R6走查成员 / ceshi001 / 测试 002） | snapshot uid `14_13` 4 个 option |
| 服务端 convert 事务 | convert-customer 201 写 customers + leads.converted_customer_id；convert-case 201 写 cases + leads.converted_case_id + leads.status=converted_case + 2 个默认任务 | PG 直查 `leads / customers / cases / tasks / lead_logs` 全部对齐 |
| 自动任务种子 | case 创建后落 `邀请客户上传基础资料` / `确认客户初次面谈` 两条 pending 任务，assignee_user_id = 案件 owner | PG `tasks` 2 行，UI Tab `任务 待办 2` |
| 案件阶段 | 新建案件直接进入 `S1 · 刚开始办案`（与 P0 §0.2 / §2 一致） | UI 顶部 `S1 · 刚开始办案`，PG `cases.status='S1'` |
| 案件名称合成 | `${customerName} · ${caseTypeLabel}`（`R-FLOW-01 王小红 · 工作签证`） | UI 案件详情 H1、列表行 |
| 客户编号 | `CUS-202605-0010` 自动顺号 | PG `customers.id` 顺号 |
| 案件编号 | `CASE-202605-0007` 自动顺号 | PG `cases.case_no` 顺号 |
| reload 后状态恢复 | reload 后 lead 详情正确切到 `已创建案件 / 查看客户 / 查看案件` 三按钮 | snapshot uid `25_46/25_47/25_48` |

---

## 3. 关键证据（PG / network）

### 3.1 PG 末态

```sql
-- 计数
leads     | 6
customers | 20
cases     | 29

-- R-FLOW-01 lead
id=32876bba-77e3-4e17-b538-e878d91cc13b
status=converted_case
converted_customer_id=146d985a-5763-4132-a6e5-1d1f793ea9ac
converted_case_id=5bf4b2c9-fd7d-4048-bc65-11d13e810f75

-- R-FLOW-01 customer
id=146d985a-5763-4132-a6e5-1d1f793ea9ac  CUS-202605-0010

-- R-FLOW-01 case
id=5bf4b2c9-fd7d-4048-bc65-11d13e810f75  CASE-202605-0007  status=S1  case_type_code=work

-- 资料清单 / 任务
document_items  count=0  ← R-FLOW-E-1
tasks           count=2  ← happy-path 默认任务

-- lead_logs
created                                  06:18:56
status_change new→following              06:19:57
status_change following→pending_sign     06:20:25
status_change pending_sign→signed        06:20:42
converted_customer customerId=146d985a   06:21:16
converted_case     caseId=5bf4b2c9       06:27:15

-- case_templates 整张表 0 行（R-FLOW-E-1 根因）
```

### 3.2 网络请求（关键路径）

| reqid | method | url | status | 说明 |
|-------|--------|-----|--------|------|
| 182 | GET | `/admin/leads/dedup?phone=…` | 200 | 电话去重 |
| 183 | GET | `/admin/leads/dedup?phone=…&email=…` | 200 | 电话+邮箱去重（debounced） |
| 184 | POST | `/admin/leads` | 201 | 新建线索 |
| 232 | PATCH | `/admin/leads/:id/status` | 200 | new → following |
| 234 | PATCH | `/admin/leads/:id/status` | 200 | following → pending_sign |
| 236 | PATCH | `/admin/leads/:id/status` | 200 | pending_sign → signed |
| 238 | POST | `/admin/leads/:id/convert-customer` | **201** | 第一次签约建档点击；body `{lead, customerId}`；客户端 adapter 抛 BAD_RESPONSE → R-FLOW-D-1 |
| 414 | POST | `/admin/leads/:id/convert-customer` | 400 | reload 后第二次点击；`Lead already has a converted customer`；auto-chain swallow ✅ |
| 415 | POST | `/admin/leads/:id/convert-case` | **201** | body `{lead, caseId}`；客户端 adapter 抛 BAD_RESPONSE → R-FLOW-D-1（仍弹同一 toast） |

---

## 4. 修复路线（建议在同一个 PR 闭合 R-FLOW-D-1 + R-FLOW-D-2 + R-FLOW-E-1）

| ID | 文件 | 动作 |
|----|------|------|
| D-1 | `packages/admin/src/views/leads/model/LeadAdapterMappers.ts` | 拆 `adaptLeadConvertCustomerResult` / `adaptLeadConvertCaseResult`，从 `record.lead.id` + `record.customerId/caseId` 取值；同步更新 `LeadAdapterTypes` `LeadMutationResult` |
| D-1 | `packages/admin/src/views/leads/model/LeadRepository.ts` | `createConvertCustomer` / `createConvertCase` 切到新 adapter |
| D-1 | `packages/admin/src/views/leads/model/useLeadDetailModel.ts` | `doConvertCase` 成功后把 `customerId` / `caseId` 写回 state，并 `await refs.fetchDetail()` |
| D-2 | 同上 | `doConvertCase` finally 块兜底 `await refs.fetchDetail()` |
| E-1 | `packages/server/src/seed/case-templates.seed.ts`（新建） | 写入 `family-stay` / `work` 两套 `requirement_blueprint` + `default_tasks_blueprint` |
| E-1 | `packages/server/src/modules/core/cases/cases.create.service.ts` | convert-case + 手动 create 都展开 `case_templates → document_items` |
| F-1 | `packages/admin/src/views/customers/components/CustomerBmvIntakeCard.vue` | 加 `requiresBmv` 计算属性；非 BMV 时不渲染 |
| F-1 | `packages/admin/src/views/customers/CustomerDetailView.vue` | 「开始办案」disabled 逻辑解耦 BMV |
| 单测 | `LeadAdapterMappers.test.ts` / `useLeadDetailModel.convertCase-auto-chain.test.ts` / `cases.create.service.test.ts` / `CustomerBmvIntakeCard.test.ts` | 各自覆盖新增分支 |

---

## 5. 附录：本轮端到端步骤序

1. baseline `leads=5 / customers=19 / cases=28`，登录 admin@local.test；
2. `/leads` 列表 → 「新建线索」 dialog → 录入 `R-FLOW-01 王小红 / 09011112222 / r-flow-01@example.com / 网站表单 / 技人国 / tokyo-1 / Local Admin / 中文`；
3. dedup 双发 + 201 + 列表 refresh +1（leads=6）；
4. lead 详情 → `调整状态` 三连（新咨询 → 跟进中 → 待签约 → 已签约），每步 PATCH 200；
5. 转化信息 Tab → 顶部 banner CTA「签约并开始建档」 → dialog（业务类型/owner/group 默认正确）→「确认创建案件」 →
   - 第一次：convert-customer 201 但 UI toast「转案件失败」（**R-FLOW-D-1**），auto-chain 没继续；
6. 取消 dialog → reload → lead 详情顶部按钮变为「查看客户 / 签约并开始建档」；
7. 再点「签约并开始建档」 → convert-customer 400 swallow ✅ → convert-case 201 → UI 仍弹同一 toast（**R-FLOW-D-1**）；
8. 直查 PG：customers +1（`CUS-202605-0010`），cases +1（`CASE-202605-0007 / S1 / case_type_code=work`），lead `status=converted_case`，`document_items count=0`（**R-FLOW-E-1**），`case_templates count=0`（**R-FLOW-E-1 根因**），tasks +2（默认任务正常）；
9. 跳客户详情 → 顶部 BMV 卡片 + 「开始办案」disabled（**R-FLOW-F-1**），「案件名称」`—`（**R-FLOW-G-1**），owner picker 仅 fixture 日本员工（**R-FLOW-G-2**）；
10. 关联案件 Tab → CASE-202605-0007 行只见编号无可读名称（**R-FLOW-G-1**）；
11. 跳 case 详情 → S1 ✅ + 资料清单 0/0（**R-FLOW-E-1**） + 「本地资料根目录未配置」叠「暂无资料登记」（**R-FLOW-C-1**）+ 任务 2 条 ✅；
12. 回 lead 详情 → 日志 Tab 6 条均显示「状态变更」，convert 事件 `to_value` 显示 UUID（**R-FLOW-H-1**）。
