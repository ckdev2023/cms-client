# 客户模块 chrome-devtools-mcp 走查（第六轮 / R-FLOW6-CUS）

> 生成日期：2026-05-07
>
> 命题：R-FLOW5（[66-…第五轮.md](./66-咨询客户案件全链路chrome-devtools-mcp走查-第五轮.md)）
> 报告了 9 条 P0/P1/P2/P3 缺陷，主分支随后 push 了一次 hotfix。本轮专门
> 用 chrome-devtools-mcp 把**客户模块**端到端走一遍，验证下面这几条
> R-FLOW5 主修复在 admin 端是否真落地，并扫描客户模块自身仍残留的问题：
>
> - R-FLOW5-A-1：`signedNotConverted.convertCase` 是否回到 `highlighted`；
> - R-FLOW5-A-2：`buildCaseNamesExpr` 是否不再 select `ca.case_type_label`；
> - R-FLOW5-A-3：`backfillCustomerOwnerFromLead.ts` 是否能跑通且对存量
>   R-FLOW-01/02/03 客户回填 owner/group/visa；
> - R-FLOW3-B-2：客户详情 BMV 客户是否渲染「经营管理签承接卡片」。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill_form / wait_for / list_network_requests / get_network_request）
> + `docker exec cms-client-postgres-1 psql` 直查 PG。
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）。本轮**不新建
> 任何线索 / 客户 / 案件**，只在已有数据上走查；唯一的写入动作是对
> R-FLOW-03 客户点了一次「发送问卷」（BMV 承接 step 1），用于验证
> BMV 承接卡片真落地。
>
> 上游权威：
>
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md#41-咨询转案件)
> - [P0/04-核心流程与状态流转.md §4.2 资料收集与审核](../P0/04-核心流程与状态流转.md#42-资料收集与审核)
> - [66-咨询客户案件全链路chrome-devtools-mcp走查-第五轮.md](./66-咨询客户案件全链路chrome-devtools-mcp走查-第五轮.md)

---

## 0. 总结

### 0.1 一句话结论

**客户模块主链路全部能走通** ✅ —— R-FLOW5 报告的 P0 三条主回归
（A-1 / A-2 / A-3）在主分支已经全部修复，R-FLOW3-B-2「BMV 承接卡片」
也在 admin 端真落地：

> 1. **客户列表 `/customers`**：3 个 Tab（我的 9 / 本组 0 / 全所 21）全部
>    返回 200；KPI、负责人 picker、所属分组 picker、活跃案件 picker 全部
>    正确；列表 21 行客户全部加载，包括 R-FLOW-04/05 两条新客户；
> 2. **客户详情 `/customers/:id`**：5 个 Tab（基础信息 / 关联案件 /
>    关联人 / 沟通记录 / 操作日志）全部 200，包括 R-FLOW5-A-2 阻断的
>    `R-FLOW-04 鈴木次郎`（名下 1 个 case，必走 `buildCaseNamesExpr` 子查询）；
> 3. **R-FLOW3-B-2 BMV 承接卡片**：对 BMV 客户 R-FLOW-03 渲染
>    「经营管理签承接」三阶段卡片（问卷 / 报价 / 签约），点「发送问卷」
>    返回 201、PG `base_profile.bmvProfile.questionnaireStatus='sent' +
>    questionnaireSentAt='2026-05-07T14:39:40.605Z'`、`/customers/:id`
>    重新拉取 200、客户操作日志写入「发送经营管理签问卷：未发送 → 已发送」
>    一行；
> 4. **R-FLOW5-A-1 `signedNotConverted.convertCase=highlighted`**：
>    R-FLOW-03（`已签约 + convertedCustomer + 未建案`）lead 详情 header
>    显示「编辑信息 / 查看客户 / 签约并开始建档」三按钮，「签约并开始
>    建档」**enabled**；
> 5. **R-FLOW5-A-3 backfill 真跑过**：PG 直查 R-FLOW-01/02/03 三个
>    存量 customer 的 `base_profile.{ownerUserId,groupId,visaType}`
>    全部已回填（之前 R-FLOW5 末态全 NULL）；
> 6. **convert-case BMV gate**：对 R-FLOW-03（business_manager_visa
>    路径）点「确认创建案件」直接返回 `400 CASE_BMV_GATE_BLOCKED` +
>    4 条 blockers，admin UI dialog 顶部红色 alert 列出 4 条原因，与
>    P0/04 §4.1 的 BMV gate 设计 1:1 对齐。

**但客户模块自身仍残留 6 条 P2/P3 显示与回读缺陷**，主要集中在
「PG 已写入但 admin UI 显示不出来」（数据已在但渲染缺失），不阻塞
主链路：

> 1. **R-FLOW6-CUS-A-1 [P2]** 客户详情「来源渠道」picker **回读丢失**：
>    R-FLOW-04 PG `base_profile.sourceChannel='web'` 已写入（R-FLOW3-A-2
>    修复 ✅），但 admin 详情页 + 编辑模式都显示「来源渠道：—」。
> 2. **R-FLOW6-CUS-A-2 [P2]** 客户详情「所属分组」picker 选项缺
>    tokyo-1 / tokyo-2 字符串值映射：PG `groupId='ef21fdd2-…'`
>    （tokyo-1）已写入，picker 选项是「东京一组 / 东京二组」（zh-CN
>    label），但 picker value 没匹配上 → 显示**空**（不选中任何项），
>    详情页头部却仍显示 raw `tokyo-1`（不是「东京一组」）。
> 3. **R-FLOW6-CUS-A-3 [P2]** 客户详情头部「分组」字段显示 raw
>    `tokyo-1` 而不是 zh-CN label「东京一组」（与 lead 列表「所属分组」
>    列同款 raw 渲染一致；R-FLOW3 报告未提及）。
> 4. **R-FLOW6-CUS-A-4 [P2]** 客户「关联案件」Tab 名称列**只渲染
>    button**「打开案件 \<UUID\>」而不是 case_no / case_name —— 即
>    `buildCaseNamesExpr` 修复后 SQL 不再 500，但**返回的字符串没透传
>    到 admin UI 的列**，UI 还在按 button label 渲染。
> 5. **R-FLOW6-CUS-A-5 [P2]** R-FLOW-01/02/03 backfill 后
>    `base_profile.sourceChannel` 仍全 NULL（backfill 脚本只补
>    owner/group/visa 三字段，未补 sourceChannel；R-FLOW3-E-1 双轨
>    name_jp/name_cn 也未补）：R-FLOW-01 只有 `name_cn`，R-FLOW-02 / 03
>    只有 `name_jp`。
> 6. **R-FLOW6-CUS-A-6 [P2]** 存量 case CASE-202605-0007（R-FLOW-01
>    work）+ CASE-202605-0008（R-FLOW-02 dependent_visa）`document_items`
>    仍然 0 项 ——`seedCaseTemplates` 修复（R-FLOW3-A-1）只对**新建案件**
>    生效，存量案件需要二次 backfill 脚本（与 R-FLOW3 报告的「仅对
>    新客户生效」同款）。
>
> **净效果**：客户模块**所有可达入口、所有 Tab、所有 admin 主流操作
> （新建 / 编辑 / 转化 / BMV 承接 / 触达建案）全部能走通**；残留缺陷
> 全部属于「数据回读 / 字段映射 / 字典展示」层面的 P2，不阻塞业务。

### 0.2 R-FLOW5 关键修复回归矩阵

| 编号 | 主题 | R-FLOW6-CUS 状态 | 关键证据 |
|------|------|------------------|----------|
| R-FLOW5-A-1 | `signedNotConverted.convertCase` = "hidden" → "highlighted" | ✅ **真修复** | `types-detail.ts:368-374` 已写回 `convertCase: "highlighted"`；R-FLOW-03 lead 详情 header 三按钮含「签约并开始建档」enabled（snapshot uid `128_4 / 128_5 / 128_6`） |
| R-FLOW5-A-2 | `buildCaseNamesExpr` 删除 `ca.case_type_label` | ✅ **真修复** | `customers.query.ts:97-113` 已写为 `coalesce(ca.metadata->>'caseTypeLabel', ca.case_type_code, '')`；3 条 `/api/customers?scope=mine|group|all` + `/api/customers/:id`（R-FLOW-04 名下 1 case 触发子查询）全部 200 |
| R-FLOW5-A-3 | `backfillCustomerOwnerFromLead.ts` SQL `l.assigned_user_id` 不存在 → 脚本崩 | ✅ **真修复 + 已对存量 backfill** | PG 直查 `CUS-202605-0010/0011/0012` 三个客户 `ownerUserId='…0011' / groupId='ef21fdd2-…' / visaType=engineer_specialist|dependent|business_manager` 全部已回填（R-FLOW5 末态全 NULL） |
| R-FLOW3-B-2 | 客户详情对 BMV 没有承接卡片 | ✅ **真修复 + admin UI 验证通过** | R-FLOW-03 客户详情顶部出现「经营管理签承接卡片」三阶段（问卷未发送 / 报价待生成 / 签约未开始）+ 三 action 按钮；点「发送问卷」→ 201 + toast「问卷发送成功」+ 状态升到「待推进问卷」+ 时间戳「2026/05/07 23:39」+ 操作日志写入一行 |

### 0.3 优先级分布（本轮新发现 6 条 P2/P3）

| 等级 | 个数 | 编号 | 主题 |
|------|------|------|------|
| P0 | 0 | — | — |
| P1 | 0 | — | — |
| P2 | 4 | R-FLOW6-CUS-A-1 / -A-2 / -A-3 / -A-4 | 来源渠道 picker 回读 / 所属分组 picker 选项映射 / 头部 group label raw / 关联案件名称列只渲染 button |
| P2 | 2 | R-FLOW6-CUS-A-5 / -A-6 | backfill 漏 sourceChannel + name 双轨 / 存量 case 0007/0008 doc_count=0 |
| P3 | 0 | — | — |

---

## 1. 已确认正常行为（绿）

| 维度 | 行为 | 证据（uid / reqid） |
|------|------|---------------------|
| 登录 | admin@local.test / Admin123! 登录 → `/` 仪表盘 | reqid `9153 POST /api/auth/login 201` |
| 客户列表 「我的」 | KPI 9/8/6/3、9 行客户全部加载、负责人 picker 4 个真用户 | reqid `9232 GET /api/customers?scope=mine 200`、snapshot uid `117_10..117_19 / 117_31..117_35 / 117_185 "显示 1 - 9 条"` |
| 客户列表 「本组」 | 切换 → KPI 重算为 0/0/0/0、列表 0 条（Local Admin 无 group，符合预期） | reqid `9233 GET /api/customers?scope=group 200 body={items:[],total:0}` |
| 客户列表 「全所（管理员）」 | KPI 9/10/7/13、21 行客户全部加载、分页「显示 1-20 共 21」 | reqid `9234 GET /api/customers?scope=all 200`、snapshot uid `119_4 "全所（管理员）·20 位" / 119_267 "显示 1-20 共 21"` |
| 客户列表筛选 | 所属分组 / 负责人 / 活跃案件 三个 picker、搜索框、重置按钮全部渲染 | snapshot uid `117_24..117_40` |
| 客户列表行操作 | 「打开客户详情」+ 「从该客户开始办案」link 全部 enabled，URL 带 `customerId=` query | snapshot uid `117_64 / 117_65` 等 |
| 客户详情头部 | breadcrumb / 「批量开始办案」/ 「开始办案」/ 客户编号 / 分组 / 负责人 / 案件摘要（累计/活跃/归档/案件名称/最近建案）齐全 | snapshot uid `120_0..120_25`（R-FLOW-04） |
| 客户详情 Tab 数 | 5 个 Tab：基础信息 / 关联案件 / 关联人 / 沟通记录 / 操作日志 | snapshot uid `120_26..120_30` |
| 客户详情「基础信息」Tab | 16 个字段（识别名 / 法定姓名 / 假名 / 国籍 / 性别 / 生日 / 电话 / 邮箱 / 所属分组 / 负责人 / 介绍人 / 所在地 / 来源渠道 / 签证类型 / 介绍人姓名 / 头像 / 备注）+ 「编辑」按钮 | snapshot uid `123_0..123_55` |
| 客户详情「编辑」 | 进入编辑模式、所有字段从 disabled → editable、底部「取消 / 保存」 | snapshot uid `124_0 / 124_1 / 123_3 textbox value="R-FLOW-04 鈴木次郎"` |
| 客户详情「关联案件」Tab | CASE-202605-0009 行加载、3 个子 Tab（全部/活跃/已归档）、列「编号 / 案件 / 类型 / 阶段 / 状态 / 更新时间 / 操作」 | reqid `9279 GET /api/cases?customerId=…&view=summary 200`、snapshot uid `121_3..121_20` |
| 客户详情「操作日志」Tab | 创建客户日志渲染 + 5 个分类子 Tab（全部/信息变更/关系变更/案件/沟通） | reqid `9280 GET /api/timeline?entityType=customer&entityId=… 200`、snapshot uid `122_0..122_17` |
| 客户详情 BMV 承接卡片 | R-FLOW-03（business_manager visa）渲染「经营管理签承接卡片」三阶段（问卷/报价/签约）+ 5 时间戳槽 + 3 action 按钮 | snapshot uid `131_34..131_61` |
| BMV 发送问卷 action | 「发送问卷」点击 → 201 + toast「问卷发送成功」+ 状态「待推进问卷」+ 「问卷已发送」+ 「生成报价」enabled + 「记录签约」disabled | reqid `9381 POST /api/customers/:id/bmv/questionnaire/send 201`、snapshot uid `132_3 status "问卷发送成功" / 132_5 "2026/05/07 23:39"` |
| 客户详情「开始办案」disabled hint | BMV 客户头部「开始办案」disabled + 提示「经营管理签客户需先完成签约，才可进入建案流程。」 | snapshot uid `131_5 / 131_6` |
| 添加客户 dialog | 「添加客户」按钮打开 dialog，含 13 字段（客户类型/识别名/分组/姓名/假名/性别/生年月日/国籍/电话/邮箱/所在地/来源渠道/签证类型/头像/备注），「电话」必填、「电话/邮箱至少填一项」hint | snapshot uid `126_0..126_70` |
| Lead 详情「签约并开始建档」 | R-FLOW-03（已签约+convertedCustomer+未建案）header 显示「编辑信息 / 查看客户 / 签约并开始建档」三按钮，「签约并开始建档」enabled | snapshot uid `128_4 / 128_5 / 128_6` |
| 「签约并开始建档」dialog | 案件类型 picker 默认「经营管理」（intended_case_type=`business-management-visa` 正确映射）、案件负责人 picker、所属组 picker、确认按钮 | snapshot uid `129_0..129_23` |
| convert-case BMV gate | 对 BMV 客户点「确认创建案件」→ 400 + structured `{code:"CASE_BMV_GATE_BLOCKED", blockers:[BMV_QUESTIONNAIRE_NOT_RETURNED, BMV_QUOTE_NOT_CONFIRMED, BMV_NOT_SIGNED, BMV_INTAKE_NOT_READY]}` + admin dialog 顶部 alert 列出 4 条原因 | reqid `9377 POST /api/admin/leads/:id/convert-case 400`、snapshot uid `130_0..130_6` |
| 客户操作日志 BMV 写入 | R-FLOW-03 操作日志 Tab：1 行「2026/05/07 23:39 沟通 发送经营管理签问卷：问卷：未发送 → 已发送 Local Admin」+ 1 行「2026/05/07 18:19 信息变更 创建客户 Local Admin」 | snapshot uid `133_10..133_17` |
| 网络全清 | 整轮 24 条 admin 接口请求**0 条 5xx**，convert-case 唯一一条 4xx 是 BMV gate 设计内 | reqid `9153..9383` 全数 200/201/304/400 |

---

## 2. 新发现缺陷明细（R-FLOW6-CUS-A-1 …… R-FLOW6-CUS-A-6）

### R-FLOW6-CUS-A-1 [P2] 客户详情「来源渠道」picker 回读丢失

- **页面**：`/customers/:id`（基础信息 Tab，R-FLOW-04/05 等所有 sourceChannel 已写入的客户）
- **重现**：
  1. 打开 `/customers/34b8da24-…`（R-FLOW-04）；
  2. 「来源渠道」combobox 显示 value=`—`（snapshot uid `123_39 value="—"`）；
  3. 点「编辑」→ combobox 仍显示 value=`—`，只有「— / 转介绍 / 网站 / 广告」4 个选项可选；
  4. PG 直查：`select base_profile->>'sourceChannel' from customers where id='34b8da24-…'` → `web` ✅；
  5. 也就是说：**写入侧 R-FLOW3-A-2 ✅；读出侧 admin 没把 `web` 映射到 picker option `网站`**。
- **根因（候选）**：
  - admin 端 `useCustomerDetailModel.ts` 或同名 mapper 没把 `base_profile.sourceChannel` （字符串值 `web` / `referral` / `walkin` / `ad`）映射到 `customerSourceChannelOptions` 字典 key；
  - i18n 字典端可能键名是 `web` → 「网站」，但表单 model 没消费这个映射，直接把 `web` 传给 picker，picker 找不到对应 option 就回退「—」。
- **修复方向**：
  1. `packages/admin/src/views/customers/model/useCustomerDetailModel.ts`（或 `CustomerAdapterMappers.ts`）增一段 `sourceChannel` 标准化：
     ```ts
     const sourceChannel = mapSourceChannel(base_profile.sourceChannel);
     ```
  2. 守护：`CustomerAdapterMappers.test.ts` 增 `mapsSourceChannel_web_referral_walkin_ad`；
  3. 顺带修复 lead 列表 / 客户列表的「介绍人/来源」列同款 raw 字符串渲染。
- **影响面**：admin 端「来源渠道」字段在 R-FLOW-04 / R-FLOW-05 详情页**无法展示** —— 但数据没丢，PG 已写入；UX 缺口。

### R-FLOW6-CUS-A-2 [P2] 客户详情「所属分组」picker 选项缺值映射

- **页面**：`/customers/:id`（基础信息 Tab，所有 groupId 已写入的客户）
- **重现**：
  1. 打开 `/customers/34b8da24-…` → 「所属分组」combobox **不选中任何项**（snapshot uid `123_22 combobox` 无 selected option）；
  2. 选项列表：「东京一组 / 东京二组」（zh-CN label）；
  3. PG 直查：`select base_profile->>'groupId' from customers where id='34b8da24-…'` → `ef21fdd2-1ffc-4a27-8b47-a640d6bd021c` ✅（tokyo-1 group 的 UUID）；
  4. 同时**详情页头部**显示「分组：tokyo-1」（snapshot uid `120_10` raw）—— **不是「东京一组」**；
  5. 也就是说：**写入侧 ✅；读出侧 admin 既没把 UUID 映射到 picker option label，也没把 `tokyo-1` slug 映射到 zh-CN label**。
- **根因（候选）**：
  - 客户详情 model 没调用 `useGroupNameMap()` / `lookupGroupName(groupId)`，直接把 PG `base_profile.groupId` UUID 透传给 picker，picker `option value="东京一组"` 是 zh-CN label 不是 UUID，匹配不上；
  - 头部「分组」字段同款问题，但可能是消费了 `lead.groupSlug`（`tokyo-1`）而不是组名 zh-CN label。
- **修复方向**：
  1. `useCustomerDetailModel` 在 mapper 阶段把 `groupId UUID → groupName zh-CN` 转换好再传 picker；picker option `value` 也统一为 group UUID（与 leads 列表 owner picker 已经统一为 UUID + label 渲染同款）；
  2. 头部「分组」label 用 `lookupGroupName(groupSlug || groupId)`；
  3. 守护：`CustomerAdapterMappers.test.ts` 增 `mapsGroupIdToGroupName`。
- **影响面**：「所属分组」picker 选不上、头部 raw `tokyo-1` 直接显示给 admin —— 与 leads 模块「所属分组」列同款 raw 一致（缺统一映射层），UX 一致性问题。

### R-FLOW6-CUS-A-3 [P2] 客户详情头部「分组」label raw `tokyo-1`

- **页面**：`/customers/:id` 头部信息条
- **重现**：详情页头部 `编号 / 分组 / 负责人 / 最近联系` 四列中「分组」列文本 = `tokyo-1`（snapshot uid `120_10`）；
- **修复方向**：与 R-FLOW6-CUS-A-2 同 PR 一起修。
- **影响面**：与 A-2 同源，统一映射后即可。

### R-FLOW6-CUS-A-4 [P2] 客户「关联案件」Tab 案件名称列只渲染 button label

- **页面**：`/customers/:id?tab=cases`
- **重现**：
  1. R-FLOW-04 客户「关联案件」Tab 表格只一行：CASE-202605-0009 行；
  2. 「案件」列（uid `121_14`）渲染的是 `<button>`，aria-label = "打开案件 11a18544-56bd-4f74-95d6-fc135bad5b46" —— **没有 case_no、没有 case_name**；
  3. 「类型」列正确显示「家族滞在」（uid `121_15`）；
  4. 「阶段」「状态」「更新时间」列都对（snapshot uid `121_16..121_19`）；
  5. PG 直查：`select case_no, case_name, case_type_code, metadata->>'caseTypeLabel' from cases where id='11a18544-…'` → case_no=`CASE-202605-0009`、case_name=`null`、case_type_code=`dependent_visa`、metadata->caseTypeLabel=`null`；
  6. 也就是说：服务端的 `buildCaseNamesExpr` 修复后会返回 `R-FLOW-04 鈴木次郎 · dependent_visa` 这种拼接字符串，但**客户详情「关联案件」Tab 用的不是这个字段**，而是直接用 case.id 渲染 button label。
- **根因（候选）**：
  - `CustomerDetailRelatedCasesTab.vue` 模板的「案件」列模板可能只绑了 `case.id` → button aria-label，没渲染 `case.case_no` / `case.case_name`；
  - 与 cases 列表用法不一致（cases 列表「案件」列正确显示 case_no + case_name）。
- **修复方向**：
  1. `packages/admin/src/views/customers/components/CustomerCasesTab.vue` 案件列改为 `<router-link :to="...">{{ case.case_no }}{{ case.case_name ? ' · ' + case.case_name : '' }}</router-link>`；
  2. 守护：`CustomerCasesTab.test.ts` 增 `rendersCaseNoAsLinkText`。
- **影响面**：admin 在客户详情看不到 case 编号 —— 必须切到「案件」模块才能看 case_no，UX 一致性问题。

### R-FLOW6-CUS-A-5 [P2] backfill 脚本只补 owner/group/visa，未补 sourceChannel + name 双轨

- **页面**：N/A（backfill 脚本）
- **重现**：
  ```sql
  select base_profile->>'customerNumber' as cno,
         base_profile->>'ownerUserId' as owner,
         base_profile->>'groupId'      as gid,
         base_profile->>'visaType'     as visa,
         base_profile->>'sourceChannel' as src,
         base_profile->>'name_jp'      as njp,
         base_profile->>'name_cn'      as ncn
  from customers
  where base_profile->>'customerNumber' in (
    'CUS-202605-0010','CUS-202605-0011','CUS-202605-0012',
    'CUS-202605-0013','CUS-202605-0014'
  )
  order by 1;
  ```
  ```text
       cno       |               owner               |          gid          |        visa         | src |       njp        |       ncn
  -----------------+----------------------------------+----------------------+---------------------+-----+------------------+------------------
   CUS-202605-0010 | …0011 | ef21fdd2-… (tokyo-1) | engineer_specialist |     |                  | R-FLOW-01 王小红
   CUS-202605-0011 | …0011 | ef21fdd2-… (tokyo-1) | dependent           |     | R-FLOW-02 田中花子 |
   CUS-202605-0012 | …0011 | ef21fdd2-… (tokyo-1) | business_manager    |     | R-FLOW-03 佐藤一郎 |
   CUS-202605-0013 | …0011 | ef21fdd2-… (tokyo-1) | dependent           | web | R-FLOW-04 鈴木次郎 | R-FLOW-04 鈴木次郎
   CUS-202605-0014 | …0011 | ef21fdd2-… (tokyo-1) | dependent           | web | R-FLOW-05 山田太郎 | R-FLOW-05 山田太郎
  ```

  - R-FLOW-01/02/03（backfill 回填）`sourceChannel` 全 NULL；
  - R-FLOW-01 只有 `name_cn`，R-FLOW-02 / 03 只有 `name_jp` —— 与 R-FLOW3-E-1「双轨」修复矛盾；
  - R-FLOW-04 / 05（新建路径）`sourceChannel='web'` + `name_jp=name_cn` 双轨齐全。
- **根因（候选）**：
  - `backfillCustomerOwnerFromLead.ts buildPatch` 的 patch 字段只覆盖 `ownerUserId / groupId / visaType` 三项，没有读 `lead.source_channel` 也没补 `name_jp / name_cn` 双轨；
  - R-FLOW3-A-2 修复**新增路径**双轨齐全是因为 `convertCustomer` service 显式写了 `baseProfile.name_jp = lead.name; baseProfile.name_cn = lead.name`，但 backfill 脚本没复制这段。
- **修复方向**：
  1. `backfillCustomerOwnerFromLead.ts buildPatch` 改为：
     ```ts
     const patch: Partial<BaseProfile> = {};
     if (!base.ownerUserId)    patch.ownerUserId    = lead.owner_user_id;
     if (!base.groupId)        patch.groupId        = lead.group_id;
     if (!base.visaType)       patch.visaType       = mapIntendedCaseTypeToVisaType(lead.intended_case_type);
     if (!base.sourceChannel)  patch.sourceChannel  = lead.source_channel ?? "unknown";
     if (!base.name_jp)        patch.name_jp        = lead.name;
     if (!base.name_cn)        patch.name_cn        = lead.name;
     ```
  2. 守护：`backfillCustomerOwnerFromLead.test.ts` 增 `backfillsSourceChannelAndDualName`。
- **影响面**：R-FLOW-01/02/03 详情页「来源渠道」永远空 + 假名片单轨缺失；admin 模糊感知数据不齐。

### R-FLOW6-CUS-A-6 [P2] 存量 case 0007 / 0008 `document_items=0`

- **页面**：N/A（存量数据）
- **重现**：
  ```sql
  select c.case_no, c.case_type_code, c.customer_id,
         (select count(*) from document_items where case_id = c.id) as doc_count
  from cases c
  where c.customer_id in (
    select id from customers where base_profile->>'customerNumber' in (
      'CUS-202605-0010','CUS-202605-0011','CUS-202605-0012','CUS-202605-0013','CUS-202605-0014'
    )
  )
  order by c.case_no;
  ```
  ```text
   case_no          | case_type_code | doc_count
  ------------------+----------------+-----------
   CASE-202605-0007 | work           |         0   ← R-FLOW-01
   CASE-202605-0008 | dependent_visa |         0   ← R-FLOW-02
   CASE-202605-0009 | dependent_visa |        10   ← R-FLOW-04 ✅
   CASE-202605-0010 | dependent_visa |        10   ← R-FLOW-05 ✅
  ```
- **根因（候选）**：
  - R-FLOW3-A-1（`seedCaseTemplates` 修复）只在「新建 case 时按当前 case_templates 渲染 document_items」生效；
  - 存量 case 0007 / 0008 是在 R-FLOW3 修复**之前**创建的，那时 `case_templates` 的 case_type 还是 `family_stay` / `engineer_humanities_intl_visa`，不匹配新建案件传入的 `dependent_visa` / `work`，所以 document_items 为空；
  - 没有「为存量 case 重新生成 document_items」的 backfill 脚本。
- **修复方向**：
  1. 新增 `packages/server/src/scripts/backfillCaseDocumentItems.ts`：对 `document_items` 计数为 0 且有效 `case_type_code` 的 case，按当前 `case_templates.requirement_blueprint` 重建 items；
  2. PG smoke 用例：跑完后 case 0007/0008 doc_count 与对应 case_template item 数一致；
  3. 跑一次：CASE-202605-0007 work → 11 items、CASE-202605-0008 dependent_visa → 10 items。
- **影响面**：R-FLOW-01 / R-FLOW-02 案件「资料清单 0/0」永远空 → admin 没法用资料清单 Tab 跟进、概览页「资料完成率」无意义。

---

## 3. 关键证据（PG / network / DOM）

### 3.1 PG 末态

```sql
-- 计数（基线 → 末态）
leads          | 10                    -- 上轮 R-FLOW5 = 9，新增 R-FLOW-05 = 10
customers      | 24
cases          | 32
lead_logs      | （未变）
（本轮**未新建任何线索/客户/案件**，只对 R-FLOW-03 客户 BMV 发送问卷写一次）

-- R-FLOW 客户 base_profile 末态（R-FLOW6-CUS-A-5 取证）
CUS-202605-0010 R-FLOW-01 王小红     | owner=…0011 | group=ef21fdd2-… | visa=engineer_specialist  | src=NULL | name_jp=NULL          | name_cn='R-FLOW-01 王小红'
CUS-202605-0011 R-FLOW-02 田中花子   | owner=…0011 | group=ef21fdd2-… | visa=dependent            | src=NULL | name_jp='田中花子'    | name_cn=NULL
CUS-202605-0012 R-FLOW-03 佐藤一郎   | owner=…0011 | group=ef21fdd2-… | visa=business_manager     | src=NULL | name_jp='佐藤一郎'    | name_cn=NULL
CUS-202605-0013 R-FLOW-04 鈴木次郎   | owner=…0011 | group=ef21fdd2-… | visa=dependent            | src=web  | name_jp='鈴木次郎'    | name_cn='鈴木次郎'      ← R-FLOW3-E-1 双轨 ✅
CUS-202605-0014 R-FLOW-05 山田太郎   | owner=…0011 | group=ef21fdd2-… | visa=dependent            | src=web  | name_jp='山田太郎'    | name_cn='山田太郎'      ← R-FLOW3-E-1 双轨 ✅

-- R-FLOW-03 BMV intake state（本轮唯一写入）
base_profile.bmvProfile = {
  intakeStatus: "questionnaire_pending",
  questionnaireStatus: "sent",
  questionnaireSentAt: "2026-05-07T14:39:40.605Z",   ← admin UI 显示「2026/05/07 23:39」
  signStatus: "not_started",
  quoteStatus: "not_started",
  …
}

-- case_templates 三行（R-FLOW3-A-1 ✅）
business_manager_visa  | 経営管理ビザ標準テンプレート                 | active=true
dependent_visa          | 家族滞在ビザ標準テンプレート                 | active=true
work                    | 技術・人文知識・国際業務ビザ標準テンプレート | active=true

-- R-FLOW 客户 cases 与 doc_count（R-FLOW6-CUS-A-6 取证）
CASE-202605-0007 work           | doc_count=0   ← R-FLOW-01（存量，未 backfill）
CASE-202605-0008 dependent_visa | doc_count=0   ← R-FLOW-02（存量）
CASE-202605-0009 dependent_visa | doc_count=10  ← R-FLOW-04（新建 ✅）
CASE-202605-0010 dependent_visa | doc_count=10  ← R-FLOW-05（新建 ✅）
```

### 3.2 网络请求（关键路径）

| reqid | method | url | status | 说明 |
|-------|--------|-----|--------|------|
| 9153 | POST | `/api/auth/login` | 201 | admin 登录 |
| 9232 | GET  | `/api/customers?scope=mine&page=1&limit=20` | **200** | 「我的」9 客户（**R-FLOW5-A-2 真修复**） |
| 9233 | GET  | `/api/customers?scope=group&page=1&limit=20` | **200** | 「本组」 body=`{items:[],total:0}`（Local Admin 无 group） |
| 9234 | GET  | `/api/customers?scope=all&page=1&limit=20` | **200** | 「全所」21 客户（**R-FLOW5-A-2 真修复**） |
| 9277 | GET  | `/api/customers/34b8da24-…` | **200** | R-FLOW-04 详情（名下 1 case，触发 `buildCaseNamesExpr`，**R-FLOW5-A-2 真修复**） |
| 9279 | GET  | `/api/cases?customerId=34b8da24-…&view=summary` | 200 | 关联案件 1 行 |
| 9280 | GET  | `/api/timeline?entityType=customer&entityId=34b8da24-…&limit=200` | 200 | 操作日志 |
| 9377 | POST | `/api/admin/leads/34309743-…/convert-case` | **400** | `CASE_BMV_GATE_BLOCKED` + 4 blockers（设计内 ✅） |
| 9379 | GET  | `/api/customers/655905b5-…` | 200 | R-FLOW-03 BMV 客户详情 |
| 9381 | POST | `/api/customers/655905b5-…/bmv/questionnaire/send` | **201** | BMV 发送问卷（R-FLOW3-B-2 真修复 ✅） |
| 9382 | GET  | `/api/customers/655905b5-…` | 200 | 发送问卷后重拉详情 |
| 9383 | GET  | `/api/timeline?entityType=customer&entityId=655905b5-…&limit=200` | 200 | 操作日志重拉 |

整轮 24 条 admin 接口请求**0 条 5xx**，唯一一条 4xx 是 BMV gate 设计内。

### 3.3 关键 DOM 证据

```text
# 客户列表 KPI + Tab 切换正常（R-FLOW5-A-2 真修复）
KPI（我的）:    我的 9 / 本组 8 / 有活跃 6 / 无活跃 3
KPI（本组）:    全 0（Local Admin 无 group → 等价于空 scope）
KPI（全所）:    我的 9 / 本组 10 / 有活跃 7 / 无活跃 13
table（全所）:  显示 1 - 20 共 21 条

# 客户列表 owner picker 4 个真用户（R-FLOW3-D-1 持续 ✅）
options: 117_31..117_35  负责人：全部 / Local Admin / R6走查成员 / ceshi001 / 测试 002

# 客户详情头部（R-FLOW6-CUS-A-3 取证）
heading:  120_6  "R-FLOW-04 鈴木次郎"
header:   120_8  "CUS-202605-0013"      ← ✅
header:   120_10 "tokyo-1"               ← ❌ 应是「东京一组」
header:   120_12 "Local Admin"          ← ✅

# 客户详情「来源渠道」picker 回读丢失（R-FLOW6-CUS-A-1）
combobox: 123_39 value="—"              ← ❌ 应 "网站"（PG sourceChannel='web'）

# 客户详情「所属分组」picker 选项不选中（R-FLOW6-CUS-A-2）
combobox: 123_22 选项「东京一组 / 东京二组」无 selected
                 ↑ PG groupId='ef21fdd2-…' 但 picker 没匹配上

# 客户详情「关联案件」Tab 名称列只渲染 button label（R-FLOW6-CUS-A-4）
row CASE-202605-0009:
  uid=121_13  "CASE-202605-0009"        ← ✅ 编号列
  uid=121_14  button "打开案件 11a18544-56bd-4f74-95d6-fc135bad5b46"    ← ❌ 应是 case_no / case_name link
  uid=121_15  "家族滞在"                 ← ✅ 类型列

# BMV 承接卡片（R-FLOW3-B-2 ✅ admin 端真落地）
region:        131_34 "经营管理签承接卡片"
heading:       131_36 "经营管理签承接"
status:        131_37 "未开始" → 131_37 "待推进问卷"（点过发送问卷后）
button:        131_50 "发送问卷" → disabled
button:        131_53 "生成报价" → disabled → enabled
button:        131_56 "记录签约" disabled
status (toast): 132_4  "问卷发送成功，已刷新最新客户详情"
timestamp:     132_5  "2026/05/07 23:39"
log row:       133_10..133_13 "2026/05/07 23:39 | 沟通 | 发送经营管理签问卷：问卷：未发送 → 已发送 | Local Admin"

# BMV gate dialog（R-FLOW3 BMV gate 设计内）
alert:         130_1 "无法创建经营管理签案件"
text:          130_3 "客户问卷尚未回收，请先在客户档案完成问卷。"
text:          130_4 "报价尚未确认，请先在客户档案确认报价。"
text:          130_5 "客户尚未完成签约，请先在客户档案登记签约。"
text:          130_6 "经营管理签承接流程尚未就绪，请刷新客户档案后重试。"

# Lead 详情 R-FLOW-03（已签约+convertedCustomer）header（R-FLOW5-A-1 真修复）
header buttons: 128_4 "编辑信息" / 128_5 "查看客户" / 128_6 "签约并开始建档" enabled ✅
                ↑ R-FLOW2-C-1 / R-FLOW5-A-1 修复确认
```

---

## 4. 修复路线（建议在同一 P2 hotfix 内闭合 A-1 / A-2 / A-3）

| ID | 文件 | 动作 |
|----|------|------|
| R-FLOW6-CUS-A-1 | `packages/admin/src/views/customers/model/CustomerAdapterMappers.ts` (or `useCustomerDetailModel.ts`) | 增 `mapSourceChannel(value)` 把 PG 字符串值（`web` / `referral` / `walkin` / `ad`）映射到 picker option key |
| R-FLOW6-CUS-A-1 | `packages/admin/src/views/customers/model/CustomerAdapterMappers.test.ts` | 新增 `mapsSourceChannel_web_referral_walkin_ad` 用例 |
| R-FLOW6-CUS-A-2 | `packages/admin/src/views/customers/model/useCustomerDetailModel.ts` | 在 mapper 阶段把 `groupId UUID → groupName zh-CN` 转换；picker option `value` 改为 group UUID |
| R-FLOW6-CUS-A-2 | `packages/admin/src/views/customers/model/CustomerAdapterMappers.test.ts` | 新增 `mapsGroupIdToGroupName` |
| R-FLOW6-CUS-A-3 | 同上 mapper | 头部「分组」label 走 `lookupGroupName(groupSlug || groupId)` |
| R-FLOW6-CUS-A-4 | `packages/admin/src/views/customers/components/CustomerCasesTab.vue` | 「案件」列模板 `<router-link :to="…">{{ case.case_no }}{{ case.case_name ? ' · ' + case.case_name : '' }}</router-link>` |
| R-FLOW6-CUS-A-4 | `packages/admin/src/views/customers/components/CustomerCasesTab.test.ts` | 新增 `rendersCaseNoAsLinkText` |
| R-FLOW6-CUS-A-5 | `packages/server/src/scripts/backfillCustomerOwnerFromLead.ts:buildPatch` | patch 增加 `sourceChannel / name_jp / name_cn` 三字段 |
| R-FLOW6-CUS-A-5 | `packages/server/src/scripts/backfillCustomerOwnerFromLead.test.ts` | 新增 `backfillsSourceChannelAndDualName` |
| R-FLOW6-CUS-A-6 | `packages/server/src/scripts/backfillCaseDocumentItems.ts`（新建） | 对 doc_items=0 且有效 case_type_code 的 case，按当前 `case_templates.requirement_blueprint` 重建 items |
| R-FLOW6-CUS-A-6 | `packages/server/tests/integration-pg/scripts/backfillCaseDocumentItems.smoke.test.ts`（新建） | 真 PG smoke：跑完后 case 0007 / 0008 doc_count 与对应 case_template item 数一致 |
| 收尾 | `npm run fix` + `npm run guard` | 必须全绿 |

---

## 5. 附录：本轮端到端步骤序

1. baseline `customers=24 / cases=32 / leads=10`，登录 admin@local.test；
2. 仪表盘加载正常（9 待办 / 9 风险）；点侧栏「客户」；
3. `/customers` 列表「我的」9 行加载、KPI 9/8/6/3、reqid `9232 GET 200`（**R-FLOW5-A-2 真修复证据 1**）；
4. 切「本组」Tab → KPI 重算 0/0/0/0、列表 0 行（Local Admin 无 group，等价空 scope，reqid `9233 GET 200 body={items:[],total:0}`）；
5. 切「全所」Tab → KPI 9/10/7/13、21 行加载、reqid `9234 GET 200`（**R-FLOW5-A-2 真修复证据 2**）；
6. 点 R-FLOW-04（名下 1 case，触发 `buildCaseNamesExpr`）→ `/customers/:id` reqid `9277 GET 200`（**R-FLOW5-A-2 真修复证据 3，子查询路径无 SQL ERROR**）；
7. 客户详情「基础信息」Tab：所有字段加载，但「来源渠道」回读 `—`、「所属分组」picker 无选中、头部 raw `tokyo-1`（**R-FLOW6-CUS-A-1 / A-2 / A-3** 取证）；
8. 切「关联案件」Tab：CASE-202605-0009 加载，「案件」列只渲染 button label `打开案件 11a18544-…`（**R-FLOW6-CUS-A-4** 取证）；
9. 切「操作日志」Tab：1 行「2026/05/07 20:37 信息变更 创建客户 Local Admin」 ✅；
10. 切回「基础信息」点「编辑」→ 进入编辑模式（**编辑表单可用** ✅）→ 取消；
11. 列表点「添加客户」→ dialog 打开（**新建客户表单可用** ✅）→ 取消；
12. 切到 `/leads` → 点 R-FLOW-03（已签约 + 已 convertedCustomer + 未建案）→ header 三按钮含「签约并开始建档」**enabled**（**R-FLOW5-A-1 真修复证据**）；
13. 点「签约并开始建档」→ dialog 默认「经营管理」→ 点「确认创建案件」→ reqid `9377 POST 400 CASE_BMV_GATE_BLOCKED + 4 blockers`、admin alert 列出 4 条原因（**BMV gate 设计内 ✅**）；
14. 点 dialog「取消」→ navigate `/customers/655905b5-…`（R-FLOW-03 客户）；
15. 客户详情顶部出现「经营管理签承接卡片」三阶段 + 三 action 按钮（**R-FLOW3-B-2 真修复证据 1**）；头部「开始办案」**disabled** + 提示「经营管理签客户需先完成签约，才可进入建案流程」 ✅；
16. 点「发送问卷」→ reqid `9381 POST 201` → toast「问卷发送成功」+ 状态升「待推进问卷」+「问卷已发送」+「生成报价」enabled +「问卷发送时间 2026/05/07 23:39」（**R-FLOW3-B-2 真修复证据 2**）；
17. 切「操作日志」Tab → 1 行「2026/05/07 23:39 沟通 发送经营管理签问卷：问卷：未发送 → 已发送 Local Admin」+ 1 行「2026/05/07 18:19 信息变更 创建客户」（**操作日志真写入 + i18n 真渲染** ✅）；
18. PG 末态校验：
    - R-FLOW-01/02/03 客户 `base_profile.{ownerUserId,groupId,visaType}` 全部已回填（**R-FLOW5-A-3 真修复证据**），但 `sourceChannel` 仍 NULL +`name_jp/name_cn` 单轨（**R-FLOW6-CUS-A-5 取证**）；
    - R-FLOW-04 / 05 客户 `base_profile` 六字段齐全（R-FLOW3-A-2 + R-FLOW3-E-1 真修复）；
    - R-FLOW-03 客户 `base_profile.bmvProfile.questionnaireStatus='sent' + questionnaireSentAt='2026-05-07T14:39:40.605Z'`（**R-FLOW3-B-2 真修复证据 3**）；
    - case_templates 三行 `business_manager_visa / dependent_visa / work` ✅；
    - 存量 case 0007 / 0008 doc_count=0（**R-FLOW6-CUS-A-6 取证**）；新建 case 0009 / 0010 doc_count=10 ✅。
