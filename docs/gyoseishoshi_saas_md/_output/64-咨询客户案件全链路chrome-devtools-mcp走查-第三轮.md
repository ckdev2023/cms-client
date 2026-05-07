# 咨询 → 客户 → 案件 全链路 chrome-devtools-mcp 走查（第三轮 / R-FLOW3）

> 生成日期：2026-05-07
>
> 命题：在 R-FLOW2（第二轮）发现的三件 P0/P1 修复均已落库（`customers.query.ts`
> 不再引用 `cases.case_type_label`、`HEADER_BUTTON_PRESETS.signedNotConverted.convertCase`
> 改为 `highlighted`、`case_templates` seed 改为 `dependent_visa` /
> `work` / `business_manager_visa` 三套 blueprint）之后，再以 admin
> 身份走一次 `new → following → pending_sign → signed → convert-customer →
> convert-case` 全链路；这一轮特意把意向类型切到 **「経営管理（BMV）」**
> （caseTypeCode = `business_manager_visa`），覆盖与第一/二轮不同的 P0
> 业务路径，验证：
>
> 1. R-FLOW2-A-1 / R-FLOW2-C-1 / R-FLOW2-D-1 / R-FLOW2-E-1 / R-FLOW2-E-2 /
>    R-FLOW2-F-1 / R-FLOW2-G-1 / R-FLOW2-G-2 是否在 BMV 路径上同样成立。
> 2. R-FLOW2-B-1（`case_templates` 与 admin caseTypeCode 错配）的修复是否
>    真的把 `dependent_visa` / `work` / `business_manager_visa` 三类 blueprint
>    全部接通到 `findActiveCaseTemplateByCaseType`。
> 3. R-FLOW-F-1（BMV gate 解耦）在 `business_manager_visa` 路径上是否仍然
>    工作，convert-case 阻断后 UI / lead.conversion 是否一致。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill / fill_form / wait_for / evaluate_script /
> list_network_requests / get_network_request）+ `docker exec
> cms-client-postgres-1 psql` 直查 PG。
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）。本轮新增 1
> 条线索 `LEAD-202605-0007 / R-FLOW-03 佐藤一郎`（intended_case_type =
> `business-management-visa`，admin → caseTypeCode 映射为
> `business_manager_visa`），convert-customer 成功落库 1 个 customer
> `CUS-202605-0012 / 655905b5`，convert-case **被 BMV gate 正确阻断**（PG
> `cases` 计数无变化）。基线 leads 7 / customers 21 / cases 30 →
> 末态 leads 8 / customers 22 / cases 30。本轮跑了 `npm run db:seed-dev`
> 把第三套 BMV blueprint（`business_manager_visa` 10 项）写入
> `case_templates`，但发现 seed UPSERT 不刷新已有行的 `case_type` /
> `template_name`（详见 R-FLOW3-A-1）。
>
> 上游权威：
>
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md#41-咨询转案件)
> - [P0/04-核心流程与状态流转.md §4.2 资料收集与审核](../P0/04-核心流程与状态流转.md#42-资料收集与审核)
> - [P0/06-页面规格/咨询线索.md §4 关键动作](../P0/06-页面规格/咨询线索.md)
> - [P0/06-页面规格/客户.md §3 详情页 / §4 关键动作](../P0/06-页面规格/客户.md)
> - [P0/06-页面规格/案件.md](../P0/06-页面规格/案件.md)
> - [62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md](./62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md)
> - [63-咨询客户案件全链路chrome-devtools-mcp走查-第二轮.md](./63-咨询客户案件全链路chrome-devtools-mcp走查-第二轮.md)

---

## 0. 总结

### 0.1 一句话结论

**R-FLOW2 报告里所有 P0/P1（A-1 / B-1 / C-1 / D-1）+ 一半 P2/P3（E-1 /
E-2 / F-1 / G-1 / G-2 cases 部分）已经在 admin 端可观察到生效：客户列表 /
详情都不再 500；signed 状态下 header / banner / 转化 Tab **三处** 都重新
显示「签约并开始建档」高亮按钮；客户列表 KPI 不再为 0；dedup
预检查不再把 lead 自身识别为重复；`?tab=log` 深链接落到日志 Tab；
转化日志渲染为 `已转客户：CUS-202605-0012` / `已建案件：CASE-…` 的
完整编号；leads 列表对 `family_stay` 旧值已显示为 `family-stay`
kebab-case；cases 列表 owner picker 也已经是 4 个真用户。**

**但 R-FLOW3 同一条 BMV 主链路同时把以下五条 P1/P2 推到了红线，并且
R-FLOW2-B-1 的修复在数据库层只完成了 1/3：**

> 1. **R-FLOW3-A-1 [P1]** `seedCaseTemplates` 的 `ON CONFLICT (id) DO
>    UPDATE` 只刷新 `requirement_blueprint` / `updated_at`，不刷新
>    `case_type` / `template_name` —— 已经存在的 700/701 两行还是
>    上一轮的 `family_stay` / `engineer_humanities_intl_visa`，跟新版
>    seed 期望的 `dependent_visa` / `work` 完全错位；
>    `findActiveCaseTemplateByCaseType('dependent_visa')` /
>    `('work')` 仍然 miss，admin 端 R-FLOW-01（`work`）/ R-FLOW-02
>    （`dependent_visa`）案件 `document_items` 依旧 0/0；R-FLOW2-B-1 的
>    修复在 BMV 路径走通了（new id 702 / `business_manager_visa`），但在
>    家族滞在 + 技人国 两条路径仍然没有闭环。
> 2. **R-FLOW3-A-2 [P1]** `convert-customer` 写入 `customers.base_profile`
>    时**没有把 lead.ownerUserId 同步到 `ownerUserId` 字段**（整张
>    R-FLOW-01/02/03 三个新客户 `base_profile` 里都不含 `ownerUserId`），
>    导致 admin 在 `/customers` Tab「我的」永远看不到自己刚刚 convert 出来的
>    客户：本轮 21 个客户里，admin 名下「我的」只能看到 2 个 fixture，
>    新建的 3 个 R-FLOW 客户都进了「全所」之后才能找到，且行内「负责人」
>    列也是空的；与 P0 §4.1「转化后客户由当前 admin 接手」直接冲突。
> 3. **R-FLOW3-B-1 [P2]** `/admin/leads/:id` 返回的 `convertedCustomer`
>    仅含 `{id, name:null}`，丢了 `customerNo`、`displayName`、
>    `groupName`、`convertedAt`；UI 转化 Tab 「已生成记录」卡片渲染
>    成 `655905b5-0200-4fa8-85a8-2f8956ab78dd · ·`（**两个空 `·`**），
>    R-FLOW2-F-1 修复方向 1 落地了（卡片出现、动作卡片正确隐藏）但
>    数据契约还没接齐。注意服务端 `lead_logs` 已经携带
>    `payload.customerNo='CUS-202605-0012'`（R-FLOW2-G-2 修复确认），
>    缺的只是把它向 `lead.conversion.convertedCustomer` DTO 透传。
> 4. **R-FLOW3-B-2 [P2]** 客户详情顶部「签证类型」对 R-FLOW-03 BMV 客户
>    显示 `—`，且没有 BMV 承接卡片（问卷 / 报价 / 签约 / 承接进度），
>    与 R-FLOW-F-1 的修复目标「客户详情顶部 BMV 卡片对所有签证类型生效」
>    在 UI 端没有兑现：admin 在客户详情页**完全看不到**为什么自己回头
>    点 convert-case 会被 4 条 BMV blocker 拦截，必须返回 lead 才能看到
>    错误。
> 5. **R-FLOW3-C-1 [P3]（R-FLOW2-G-1 cases 侧）** cases 列表对老 fixture
>    `CASE-DEV-001 家族滞在 — 田中太郎` / `CASE-DEV-002 技人国 — 田中太郎`
>    依旧渲染 raw `family_stay` / `prepare`（其它新案件都是中文 label），
>    R-FLOW2-G-1 修复只覆盖了 leads 列表，cases 列表的 case_type_code →
>    label 翻译还没接 `normalizeBusinessType` / 字典 fallback。

> 净效果：服务端 lead → customer 事务、auto-chain swallow（虽然本轮没触
> 发，但 R-FLOW2 已验证）、BMV gate 阻断、`case_templates` 三套 blueprint
> 全部存在，PG 数据干净；admin 客户模块 500 全部消失；
> `signedNotConverted` preset 与 banner 一致；但
> **`case_templates.case_type` 因 seed UPSERT 不全量刷新，导致 R-FLOW-01 /
> R-FLOW-02（work / dependent_visa）案件 document_items 仍 0**（**R-FLOW3-A-1**）+
> **convert-customer 不写 `ownerUserId`，新客户全员脱组**（**R-FLOW3-A-2**）+
> **「已生成记录」卡片缺数据 + 客户详情缺 BMV 承接卡片**（**R-FLOW3-B-1 /
> R-FLOW3-B-2**） 三件事任意一件都阻断 §4.1 → §4.2 主链路的 admin
> 体验。建议把 R-FLOW3-A-1 / A-2 放进同一个 P1 hotfix（数据修复 + DTO
> 修复一次性闭环），并补 `customers.base_profile.ownerUserId` 的迁移
> 脚本与单测，避免再次出现「PG 干净但 admin 自己看不到客户」的回归。

### 0.2 优先级分布

| 等级 | 个数 | 编号 | 主题 |
|------|------|------|------|
| P1 | 2 | R-FLOW3-A-1 / R-FLOW3-A-2 | seed UPSERT 不刷新 case_templates.case_type → 老行错位 / convert-customer 不写 customers.base_profile.ownerUserId → 新客户脱组 |
| P2 | 3 | R-FLOW3-B-1 / R-FLOW3-B-2 / R-FLOW3-D-1 | `/admin/leads/:id`.convertedCustomer 缺 customerNo/displayName/group/convertedAt → 已生成记录卡片显示 `UUID · ·` / 客户详情对 BMV 没有承接卡片 / customers 列表「负责人」picker 仍是 7 个 fixture 名 |
| P3 | 2 | R-FLOW3-C-1 / R-FLOW3-E-1 | cases 列表对 `family_stay` / `prepare` 旧值仍 raw 渲染 / R-FLOW3-A-1 触发的 lead.intendedCaseType → customer.visaType 没有派生 |

### 0.3 R-FLOW2（第二轮）修复回归矩阵

| 编号 | 主题 | R-FLOW3 验证 | 证据 |
|------|------|-------------|------|
| R-FLOW2-A-1 | `customers.query.ts` 引用不存在的 `cases.case_type_label` 列，导致 `/api/customers` 全 500 | ✅ 已修复 | 浏览器内 `evaluate_script` 直查：`/api/customers/146d985a... → 200`、`/api/customers/0577eb14... → 200`、`/api/customers/655905b5... → 200`、`/api/customers?scope=mine → 200/total=2`、`/api/customers?scope=all → 200/total=19`；`buildCaseNamesExpr` 已改为 `coalesce(nullif(ca.metadata->>'caseTypeLabel',''), ca.case_type_code)` |
| R-FLOW2-B-1 | `case_templates` 口径与 admin caseTypeCode 错配 | ⚠️ **半修复**：BMV 路径已通（新 row 702 / `business_manager_visa` 10 项 OK），但 family-stay / work-visa **仍 miss** —— 700/701 row 的 `case_type` 还是上轮的 `family_stay` / `engineer_humanities_intl_visa`（**R-FLOW3-A-1**） | PG `select case_type from case_templates`：`business_manager_visa` / `engineer_humanities_intl_visa` / `family_stay`；`seedCaseTemplates.ts:67-69` 的 `ON CONFLICT (id) DO UPDATE SET requirement_blueprint=…, updated_at=…` 不更新 case_type；R-FLOW-01 case `case_type_code='work'` document_items=0；R-FLOW-02 case `case_type_code='dependent_visa'` document_items=0 |
| R-FLOW2-C-1 | `signedNotConverted.convertCase = "hidden"` 三处入口同时失效 | ✅ 已修复 | snapshot uid `63_0` (header「签约并开始建档」)、`63_3` (banner 同名按钮)、`64_3` (转化 Tab 同名按钮 enabled)；`types-detail.ts:364-370` `convertCase: "highlighted"` |
| R-FLOW2-D-1 | customer 列表 5xx 被静默吞掉 | ✅ 已修复（且 5xx 已经不复存在） | `/customers` 顶部 KPI = 我的客户 2 / 本组客户 1 / 有活跃案件 2 / 无活跃案件 0（不再 0/0/0/0），列表「我的 · 2 位」可见 |
| R-FLOW2-E-1 | dedup pre-check 把 lead 自身识别为「可能重复」 | ✅ 已修复 | reqid 3120 GET `/admin/leads/dedup?phone=09044446666&email=r-flow-03%40example.com` 返回 `{leads:[],customers:[]}`；转化 Tab 文案 `未检测到重复记录。此线索的电话/邮箱未匹配到已有线索或客户。`（snapshot uid `64_0`） |
| R-FLOW2-E-2 | lead 详情 URL `?tab=log` 不被 active tab 还原 | ✅ 已修复 | navigate `http://localhost:5173/#/leads/34309743…?tab=log` → 日志 Tab 直接 selected（snapshot uid `70_17 selected`），无需再点击；切到转化 Tab URL 自动改写 `?tab=conversion` |
| R-FLOW2-F-1 | 转化 Tab 在 `convertedCustomer` 后不切换为「已生成记录」卡片 | ⚠️ **半修复**：卡片出现、动作卡片隐藏 ✅；但卡片正文 `655905b5-0200-4fa8-85a8-2f8956ab78dd · ·` 缺 customerNo / 名称 / convertedAt（**R-FLOW3-B-1**） | snapshot uid `66_1/66_2/66_3` heading「已生成记录」+ 残文本 + 「查看客户」按钮；模板 `LeadConvertedRecords.vue:50-62` 渲染 `name / id · group · convertedAt`，API 返回 `convertedCustomer:{id, name:null}` 而无其它字段 |
| R-FLOW2-G-1 | leads 列表对 `family_stay` 旧数据仍 snake_case 渲染 | ✅ 已修复（leads 侧）；❌ cases 列表 fixture 行未覆盖（**R-FLOW3-C-1**） | leads 列表「デモ依頼者 — 王 小明」第二段已显示 `family-stay · web`（snapshot uid `53_147`）；businessTypes.ts `LEGACY_BUSINESS_TYPE_ALIAS` 已加 `family_stay → family-stay` 等映射；cases 列表 CASE-DEV-001/002 仍是 `family_stay` raw（snapshot uid `52_148/52_161`） |
| R-FLOW2-G-2 | 转化日志 link 文案显示 UUID 前缀 | ✅ 已修复 | 日志 Tab 第一行渲染 `已转客户：CUS-202605-0012`（snapshot uid `70_29`）+ 跳转 link，不再是 UUID 前缀 8 位；`lead_logs[0].payload.customerNo='CUS-202605-0012'` 服务端已写入 |

---

## 1. 新发现缺陷明细（R-FLOW3-A …… R-FLOW3-E）

### R-FLOW3-A-1 [P1] `seedCaseTemplates` 的 `ON CONFLICT` 不刷新 `case_type` → R-FLOW2-B-1 在 family-stay / work-visa 路径上**未真修复**

- **页面**：`/cases/:id?tab=documents`（R-FLOW-01 work / R-FLOW-02 family-stay 案件）
- **重现**：
  1. 跑 `npm run db:seed-dev` → terminal 提示 `3 case templates`，PG `case_templates` 升到 3 行；
  2. `select case_type, template_name, jsonb_array_length(requirement_blueprint->'items') from case_templates order by case_type` 返回：

     ```text
     business_manager_visa | 経営管理ビザ標準テンプレート       | 10
     engineer_humanities_intl_visa | 技術・人文知識・国際業務ビザ標準テンプレート | 11
     family_stay           | 家族滞在ビザ標準テンプレート         | 10
     ```

     —— 第三行 BMV ✅ 已用新 case_type；但前两行仍是上一轮的 `family_stay` / `engineer_humanities_intl_visa`，**没有变成新 seed 期望的 `dependent_visa` / `work`**；
  3. 同步直查 cases 表，R-FLOW-01 `CASE-202605-0007` `case_type_code='work'` document_items=0；R-FLOW-02 `CASE-202605-0008` `case_type_code='dependent_visa'` document_items=0；
  4. `git diff packages/server/src/scripts/seedCaseTemplates.ts:62-79`：

     ```sql
     ON CONFLICT (id) DO UPDATE SET
       requirement_blueprint = EXCLUDED.requirement_blueprint,
       updated_at = now()
     ```

     —— `case_type` / `template_name` 不在 DO UPDATE 列表中。
- **根因**：
  - `CASE_TEMPLATE_SEEDS` 用固定 id（700/701/702）做 idempotent upsert，但 700/701 在第二轮（旧 seed 时代）已经写入 `family_stay` / `engineer_humanities_intl_visa`；
  - 新版 seed 写入意图是 `dependent_visa` / `work`，但 ON CONFLICT 分支只覆盖 blueprint 内容；
  - 数据库 row 处于「id 是新版的、`case_type` / `template_name` 是旧版的」错位态；
  - `findActiveCaseTemplateByCaseType($1)` 走 `where case_type=$1`，admin 端
    `case_type_code='dependent_visa'` 永远 miss → 资料清单空。
- **修复方向**：
  1. **数据修复（最小代价）**：把 `ON CONFLICT (id) DO UPDATE` 扩展为：

     ```sql
     ON CONFLICT (id) DO UPDATE SET
       template_name         = EXCLUDED.template_name,
       case_type             = EXCLUDED.case_type,
       application_type      = EXCLUDED.application_type,
       requirement_blueprint = EXCLUDED.requirement_blueprint,
       active_flag           = EXCLUDED.active_flag,
       updated_at            = now()
     ```

  2. **冗余兜底**：上线 hotfix 后，**直接在生产 PG 跑一次 `npm run db:seed-dev`** 强制刷盘；本地 demo 也按这个步骤走；
  3. **schema 增强（可选）**：给 `case_templates` 加 `case_type_aliases text[]`，
     `findActiveCaseTemplateByCaseType` 改 `where case_type=$1 OR $1 = ANY(case_type_aliases)` 防止以后再分裂；
  4. **测试护栏**：新增 `seedCaseTemplates.idempotent.test.ts`，先插入 `case_type='family_stay'` 的旧 row（id=700），再跑一次 seed，断言 `case_type` 升级为 `dependent_visa`；当前 `cases.template.repository.test.ts` 没覆盖这条路径。
- **影响面**：
  - 直接堵死「家族滞在 / 技人国」两条主流签证类型的 §4.2 资料清单 —— admin 创建 case 后看到的依然是 `资料模板未配置 / 资料清单 0/0`；
  - 间接放大 Gate-A（S3 → S4）风险：清单为 0 → 永远没有 approved item → 永远不能进入下一阶段；
  - 与 R-FLOW2-B-1 的修复目标完全错位：**修了代码 + seed 字面量，但没修存量 PG**。
- **关联**：与 R-FLOW2-B-1 / R-FLOW-E-1 同源；建议 hotfix 同时把 SQL 与 seed
  一并修齐。

### R-FLOW3-A-2 [P1] `convert-customer` 不向 `customers.base_profile` 写 `ownerUserId` → 新客户全员脱组、admin 看不到自己

- **页面**：`/customers`（我的 Tab）+ `/customers/:id`
- **重现**：
  1. R-FLOW-03 路径建出 customer `CUS-202605-0012 / 655905b5`；
  2. PG 直查 `select base_profile from customers where id='655905b5-…'`：

     ```json
     {
       "email": "r-flow-03@example.com",
       "phone": "09044446666",
       "name_jp": "R-FLOW-03 佐藤一郎",
       "customerNumber": "CUS-202605-0012",
       "name_default_locale": "ja"
     }
     ```

     —— **完全没有 `ownerUserId` / `owner_user_id` 字段**；
  3. R-FLOW-01 / R-FLOW-02 三个 R-FLOW 客户全部相同情况；
  4. fixture 客户 `CUS-202604-0005` / `0004`：

     ```text
     base_profile.ownerUserId = '00000000-0000-4000-8000-000000000011'  -- Local Admin
     ```

     ✅ 有；
  5. UI 表现：`/customers` 「我的」Tab 仅显示 2 条 fixture（CUS-202604-0005 / 0004）；新建的 R-FLOW-01/02/03 客户**全部进不了「我的」**；切到「全所」才能看到，行内「负责人」列显示空（snapshot uid `69_12 / 69_24 / 69_36` 都是 `—`）；
  6. lead 自身：`leads.assigned_user_id = '0000…0011'`、`leads.owner_user_id = '0000…0011'`（Local Admin），都正确，所以问题在 convert-customer adapter / mapper。
- **根因**：
  - `convertLeadToCustomerService` / 对应 mapper 在拼装 `customers.base_profile` 时没有把 `lead.assignedUserId` / `lead.ownerUserId` 落到 `customers.base_profile.ownerUserId`；
  - 列表 SQL `buildOwnerNameExpr` 已实现 `customer_alias.base_profile->>'owner_user_id' OR ->>'ownerUserId'` 的 OR 兼容（`customers.query.ts:122-145`），数据写入侧偷工。
- **修复方向**：
  1. `LeadConvertCustomerService.buildBaseProfilePatch` 增加：

     ```ts
     baseProfile.ownerUserId = lead.assignedUserId ?? lead.ownerUserId;
     baseProfile.groupId     = lead.groupId;        // 同步缺位的 group
     baseProfile.sourceChannel = lead.sourceChannel ?? null;
     ```

  2. **存量数据修复脚本**：补一个 `scripts/migrate-customer-owner-from-lead.ts`，
     `update customers c set base_profile = c.base_profile || jsonb_build_object('ownerUserId', l.assigned_user_id, 'groupId', l.group_id) from leads l where l.converted_customer_id = c.id and (c.base_profile->>'ownerUserId') is null`；
  3. **单测**：`leads.admin.convert.service.test.ts` 增 `convertCustomer_writesOwnerUserIdToBaseProfile` 用例，断言写入后 PG row `base_profile->>'ownerUserId' = lead.assignedUserId`；
  4. **UI 端兜底**：`useCustomerListModel` / `CustomerListView.vue` 在 owner 缺失时显示 `—` 并允许 admin 一键「认领」（与 cases 列表 BUG-089 / BUG-146 同款逻辑）。
- **影响面**：
  - 直接砍掉 P0 §4.1「转化后客户由当前 admin 接手」这一前提，admin 无法在「我的」首屏看到自己刚转出来的客户；
  - 对组协作场景：customer 没有 groupId → 组长「本组客户」KPI 也漏数；本轮 admin 看到`本组客户 1`、`全所 19` —— 但实际 R-FLOW-01/02/03 三个客户在「东京一组」语义上应该归 tokyo-1，统计被低估；
  - 与 R-FLOW3-A-1 联合：admin 既看不到清单 0/0 的根因，也看不到自己的客户名单，**P0 主链路在 admin 端工作流完全断掉**。

### R-FLOW3-B-1 [P2] `/admin/leads/:id` 返回的 `convertedCustomer` 字段不全 → 「已生成记录」卡片渲染 `UUID · ·`

- **页面**：lead 详情 → 转化信息 Tab（`convertedCustomer` 状态）
- **重现**：
  1. R-FLOW-03 完成 convert-customer（reqid `3176 POST 201`）后顶部按钮切到 `编辑信息 / 查看客户 / 签约并开始建档`，转化 Tab 出现 `已生成记录` heading + 1 张卡片；
  2. 卡片正文（snapshot uid `71_2`）：

     ```text
     655905b5-0200-4fa8-85a8-2f8956ab78dd · ·
     ```

     —— 无名称、无组名、无 `convertedAt`，只有 UUID + 两个空 `·`；
  3. 浏览器内 `evaluate_script` 直接拉 `/admin/leads/34309743-…`，关键字段：

     ```json
     "convertedCustomer": { "id": "655905b5-…", "name": null }
     ```

     —— 服务端 DTO 只塞了 `id` + `name=null`；同时 logs 里同源数据已经存了完整 `customerNo`：

     ```json
     "logs[0].payload": { "customerId": "655905b5-…", "customerNo": "CUS-202605-0012" }
     ```

     —— **R-FLOW2-G-2 修复（log payload 加 customerNo）确认生效**，只是 lead 详情 DTO 还没接同款逻辑。
- **根因**：
  - `LeadAdminController.fetchLeadDetail` / 对应 mapper 在拼 `convertedCustomer` block 时只 select 了 `customers.id` 和 `customers.base_profile->>'displayName'`（后者本轮也没写入 → null）；
  - 没 join `customers.base_profile->>'customerNumber'` / `name_jp` / `name_cn`；
  - 没有 join `groups.label`；
  - 没有取 `customers.created_at` 当作 `convertedAt`；
  - `LeadConvertedRecords.vue:50-62` 模板按 `name / id · group · convertedAt` 渲染，三个字段全空 → 视觉残缺。
- **修复方向**：
  1. 服务端 DTO 增加：

     ```ts
     convertedCustomer = {
       id:            customer.id,
       customerNo:    customer.base_profile.customerNumber,
       name:          customer.base_profile.name_jp || customer.base_profile.name_cn || customer.base_profile.displayName,
       group:         { id: customer.base_profile.groupId, name: lookupGroupName(customer.base_profile.groupId) },
       convertedAt:   customer.created_at,
     };
     ```

  2. `LeadConvertedRecords.vue` 把第二行模板改成：

     ```vue
     {{ conversion.convertedCustomer.customerNo || conversion.convertedCustomer.id }}
     · {{ resolveGroupLabel(...) }}
     · {{ formatDateTime(conversion.convertedCustomer.convertedAt) }}
     ```

     —— 优先 customerNo，无则 fallback id；
  3. 单测：`leads.admin.controller.test.ts` 新增 `getLeadDetail_returnsConvertedCustomer_withCustomerNo`；`LeadConvertedRecords.test.ts` 新增 `rendersCustomerNoWhenAvailable`；
  4. 与 R-FLOW3-B-2（客户详情缺 BMV 卡片）相邻，但相互独立。
- **影响面**：
  - admin 在转化 Tab 看到「已生成记录」但没有任何可读信息；想跳客户详情只能点按钮；
  - 与日志 Tab 文案不一致（日志已经显示 `CUS-202605-0012`），增加 admin 心智负担；
  - 不阻塞主链路。

### R-FLOW3-B-2 [P2] 客户详情对 `business_manager_visa` 没有 BMV 承接卡片 → admin 看不到 4 条 blocker 的入口

- **页面**：`/customers/655905b5-…`（R-FLOW-03 BMV 客户）
- **重现**：
  1. lead 详情点「签约并开始建档」 → auto-chain：`convert-customer 201` 成功，`convert-case 400 CASE_BMV_GATE_BLOCKED` 阻断；
  2. dialog 上下文出现 4 条 blocker：

     ```text
     客户问卷尚未回收，请先在客户档案完成问卷。
     报价尚未确认，请先在客户档案确认报价。
     客户尚未完成签约，请先在客户档案登记签约。
     经营管理签承接流程尚未就绪，请刷新客户档案后重试。
     ```

  3. admin 关闭 dialog → 顶部 header 切到 `查看客户` ，点击进客户详情；
  4. 客户详情顶部只有「批量开始办案 / 开始办案」 + 「累计案件 0 / 活跃案件 0 / 归档数 0 / 案件名称 — / 最近建案 —」KPI（snapshot uid `67_4..67_23`）；
  5. 「签证类型」字段（snapshot uid `67_73/67_74`）显示 `—`，下方提示「从经营管理签方案自动获取」（uid `67_75`）；
  6. **页面通屏没有 BMV 承接卡片 / 问卷状态 / 报价状态 / 签约状态 / 承接进度的任何 UI**；
  7. PG `customers.base_profile`：

     ```json
     {"customerNumber":"CUS-202605-0012","email":"…","phone":"…","name_jp":"R-FLOW-03 佐藤一郎"}
     ```

     —— 没有 `visaType` / 任何 BMV 状态字段（理论上应该由 lead.intendedCaseType 派生）。
- **根因**：
  - `customers.controller` / `customer.detail.dto` 没有把 lead.intendedCaseType → customer.visaType 派生写入 `base_profile`；
  - admin UI `CustomerDetailView.vue` 没有 BMV 承接卡片组件 (`CustomerBmvIntakeCard.vue`)；
  - 之前 R-FLOW2-F-1 的 hook `useCustomerCreateCaseGateModel.customerRequiresBmv` 已经实现，但只在 `LeadConvertCaseDialog` 内消费，客户详情自身没接。
- **修复方向**：
  1. 服务端 `convertLeadToCustomerService` 派生：

     ```ts
     baseProfile.visaType = mapBusinessTypeToCaseTypeCode(lead.intendedCaseType);
     ```

     仅当 lead.intendedCaseType 非 null 时；
  2. 客户详情新增 `CustomerBmvIntakeCard.vue`：当 `visaType==='business_manager_visa'` 时显示 4 个步骤的灰阶 chip（问卷 / 报价 / 签约 / 承接），对应 `BMV_QUESTIONNAIRE_NOT_RETURNED` 等 4 条 blocker；点击 chip 跳到对应小弹窗；
  3. 把 `CASE_BMV_GATE_BLOCKED.blockers[]` 直接渲染到客户详情（来自 `useCustomerCreateCaseGateModel`），让 admin 在客户档案里就能闭环；
  4. 单测：`useCustomerCreateCaseGateModel.test.ts` 已存在，补 `bmvVisaType_rendersIntakeCard`；UI 端 `CustomerBmvIntakeCard.test.ts` 新增。
- **影响面**：
  - admin 必须**反复在 lead 详情 → 客户详情 → lead 详情**之间来回切，才能看到 BMV blocker；
  - 与 P0 §4.1「BMV 经营管理签承接流程：在客户档案中推进」直接冲突；
  - 不阻塞数据，只伤体验。

### R-FLOW3-C-1 [P3] cases 列表对 `family_stay` / `prepare` 等老 fixture 仍 raw 渲染（R-FLOW2-G-1 cases 侧未修）

- **页面**：`/cases`
- **重现**：
  - `CASE-DEV-001` 行（snapshot uid `52_148`）显示 `家族滞在 — 田中太郎` (case_name) ／ 阶段 `刚开始办案` ／ 状态 `prepare` ／ **类型 `family_stay`**；
  - `CASE-DEV-002` 行（uid `52_161`）同样：状态 `prepare` ／ 类型 `family_stay`；
  - 其它 fixture 案件如 `CASE-202605-0006` 类型显示 `经营管理签 · 认定 4 个月`（中文，正确）；
  - PG 直查：`select case_type_code from cases where case_no='CASE-DEV-001' → family_stay`；状态 `prepare`（snake）。
- **根因**：
  - cases 列表前端没有走 `BUSINESS_TYPE_TO_CASE_TYPE_CODE` 反向字典做 i18n label；
  - 状态 `prepare` 在 `cases.status` 与 `cases.stage` 之间也有口径差；
  - `LEGACY_BUSINESS_TYPE_ALIAS` 已经覆盖 `family_stay → family-stay` (R-FLOW2-G-1 leads 侧已修)，但 cases mapper 没引用同款 helper。
- **修复方向**：
  1. `CaseAdapterMappers.mapCaseSummaryRow`（或同名 mapper）走 `normalizeBusinessType` + `t('shared.businessType.<value>.label')`；
  2. 状态字段同样走 `CASE_STAGE_LABEL` 字典，缺失 fallback；
  3. 单测：`CaseAdapterMappers.test.ts` 新增 `mapsLegacyBusinessTypeAndStage`。
- **影响面**：
  - admin 看到 `family_stay` 这种内部枚举名，与其它案件中文展示不一致；不阻塞流程，但是审美 / 一致性问题。

### R-FLOW3-D-1 [P2] customer 列表「负责人」picker 仍是 7 个 fixture 名（R-FLOW-G-2 customers 侧未修）

- **页面**：`/customers`
- **重现**：
  - 「负责人：全部」 dropdown 仍然是：`铃木 / 田中 / 李 / 佐藤 / 山田翔太 / 高桥健太 / 铃木明里`（snapshot uid `68_31..68_38`）；
  - 顶部 header 已经显示 `LA Local Admin (admin@local.test)`，列表却没把 Local Admin 列入 picker；
  - cases 列表「全部负责人」是真用户 `Local Admin / R6走查成员 / ceshi001 / 测试 002`（4 个 ✅，R-FLOW2-G-2 cases 侧已修）。
- **根因**：
  - `useCustomerListModel.ownerOptions` 走 fixture（同 R-FLOW-G-2 cases 侧旧实现）；
  - 没替换为 `useUsersStore.list()` / `/api/users` 拉真用户。
- **修复方向**：
  1. `useCustomerListModel.ownerOptions` 改为从 `usersStore` 拉，与 cases 列表逻辑共享一个 helper；
  2. 单测：`useCustomerListModel.test.ts` 新增 `ownerOptions_resolvesFromUsersStore`；
  3. 验收：admin UI 切到 `Local Admin` filter 应该能 hit R-FLOW-01/02/03 三个新客户（前提 R-FLOW3-A-2 也已修）。
- **影响面**：
  - admin 用「负责人」filter 永远找不到自己；
  - 与 cases 列表口径不一致；
  - 不阻塞流程。

### R-FLOW3-E-1 [P3] R-FLOW-01 customer.base_profile 缺 `name_jp` 导致客户名只能走 `name_cn` 兜底

- **页面**：`/customers`（全所 Tab，R-FLOW-01 行）
- **重现**：
  - PG `select base_profile from customers where id='146d985a-…'`：

    ```json
    {"email":"r-flow-01@example.com","phone":"…","name_cn":"R-FLOW-01 王小红","customerNumber":"CUS-202605-0010","name_default_locale":"zh"}
    ```

    —— **没有 `name_jp` 字段**，只有 `name_cn`；
  - R-FLOW-02 / R-FLOW-03 都用 `name_jp`；
  - admin UI 客户列表正确 fallback 到 `name_cn` 显示「R-FLOW-01 王小红」（snapshot uid `69_31`）；客户详情字段「假名（片假名）」「国籍」全空。
- **根因**：
  - convert-customer mapper 仅按 lead.language（中文）写 `name_cn`，未同时填 `name_jp` ；
  - 与 P0「客户档案默认 name_jp 为主显字段」存在偏差，但 fallback OK，前台没崩。
- **修复方向**：
  1. 服务端 mapper 总是写 `name_jp` 与 `name_cn` 双轨（缺一个时复制另一个）；
  2. UI 端「假名」字段在 name_jp 缺位时显示 fallback 提示；
  3. 单测：`leads.admin.convert.service.test.ts` 增 `convert_writesBothNameJpAndNameCn_evenWhenLanguageIsZh`。
- **影响面**：纯字段口径，影响搜索与排序的 fallback 链。

---

## 2. 已确认正常行为（保留为绿）

| 维度 | 行为 | 证据 |
|------|------|------|
| 新建线索 | 必填校验（姓名）+ 电话/邮箱 dedup pre-check + 201 + 列表 +1 | reqid `3119/3120 GET dedup`、`3121 POST /admin/leads 201`、`3122 GET list 200`，列表「我的 · 8 条」+1 |
| 状态白名单流转 | `new → following → pending_sign → signed` 三连，每次 dropdown 单值 | reqid `3170/3172/3174 PATCH status 200` 三连 |
| signed banner（CTA） | 进入 signed 后顶部 banner `该线索已签约，下一步请直接开始建档并创建首个案件。` + **可点的「签约并开始建档」按钮** | snapshot uid `63_1/63_2/63_3`（R-FLOW2-C-1 修复确认） |
| signed header | 顶部按钮区出现 `编辑信息 / 调整状态 / 标记流失 / 仅建客户档案 / 签约并开始建档` 五项 | snapshot uid `57_4..63_0`（R-FLOW2-C-1 修复确认） |
| signed 转化 Tab | 转化 Tab 显示「未检测到重复记录」+「签约并开始建档」**enabled** + 「仅建立客户档案」**enabled** 两张卡 | snapshot uid `64_0..64_6`（R-FLOW2-C-1 + R-FLOW2-E-1 修复确认） |
| convert dialog 默认值映射 | lead `intended_case_type=business-management-visa` → dialog `案件类型=经营管理` 默认选中 | snapshot uid `65_4 value="经营管理"`，POST body `caseTypeCode:"business_manager_visa"` |
| convert-customer auto-chain | 第一步 convert-customer 201，第二步 convert-case 400（**正确被 BMV gate 拦截**） | reqid `3176 POST convert-customer 201`、`3178 POST convert-case 400` body=`{"code":"CASE_BMV_GATE_BLOCKED","blockers":[…4 项]}` |
| BMV gate 4 条 blocker | dialog 内 alert 标题「无法创建经营管理签案件」+ 4 条阻塞文案展开 | snapshot uid `66_4..66_10`，blocker code `BMV_QUESTIONNAIRE_NOT_RETURNED / BMV_QUOTE_NOT_CONFIRMED / BMV_NOT_SIGNED / BMV_INTAKE_NOT_READY` |
| convert-customer 事务 | `customers` +1 / `leads.converted_customer_id` 写入 / `lead_logs` +1（converted_customer，payload 含 customerNo） | PG `customers count 21→22`、`leads.converted_customer_id='655905b5-…'`、`lead_logs.payload.customerNo='CUS-202605-0012'` |
| convert-case 阻断后 lead 状态 | lead.status 维持 `signed`，lead.converted_case_id 仍为 NULL，无 phantom case | PG `leads.status='signed' / converted_case_id IS NULL`、`cases count 30 不变` |
| 客户详情可访问 | `/customers/:id` 不再 500，所有 R-FLOW-01/02/03 三条 detail endpoint 均 200 | 浏览器内 evaluate_script 三连 200（R-FLOW2-A-1 修复确认） |
| customer 列表 KPI | KPI 不再全 0：我的 2 / 本组 1（mine=2 由 fixture 客户撑住） / 有活跃案件 2 / 无活跃案件 0；scope=all → 19 位 | snapshot uid `68_10/68_13/68_16/68_19`（R-FLOW2-D-1 修复确认） |
| 转化日志分类 | 顶部分类 Tab 多了「转化」 ✅；转化行渲染为 `已转客户：CUS-202605-0012` + clickable link 到客户详情 | snapshot uid `70_19..70_30`（R-FLOW2-G-2 修复确认） |
| 日志 Tab 深链接 | navigate `?tab=log` 直接选中日志 Tab，无需手点 | snapshot uid `70_17 selected`（R-FLOW2-E-2 修复确认） |
| dedup 排除自身 | dedup 端点对 lead 自身电话/邮箱返回 `{leads:[],customers:[]}` | reqid `3120` Response Body `{"leads":[],"customers":[]}`（R-FLOW2-E-1 修复确认） |
| leads 列表 family_stay | 旧 lead `デモ依頼者` 第二段已显示 `family-stay · web` kebab-case | snapshot uid `53_147/53_148`（R-FLOW2-G-1 leads 侧修复确认） |
| cases 列表 owner picker | 「全部负责人」= Local Admin / R6走查成员 / ceshi001 / 测试 002 ✅ | snapshot uid `52_73..52_77`（R-FLOW2-G-2 cases 侧修复确认） |
| 案件名称合成（R-FLOW-02 历史） | `R-FLOW-02 田中花子 · 家族滞在` 在 cases 列表正常渲染（R-FLOW2-A-1 fallback 路径 OK） | snapshot uid `52_103/52_104` |

---

## 3. 关键证据（PG / network / DOM）

### 3.1 PG 末态

```sql
-- 计数（基线 → 末态）
leads          | 7 → 8         -- +1: R-FLOW-03
customers      | 21 → 22       -- +1: CUS-202605-0012
cases          | 30 → 30       -- 无新增（BMV gate 阻断）
case_templates | 2 → 3         -- +1: business_manager_visa（new id 702）
document_items | 7 → 7         -- 无新增（无新 case；老 case 也仍是 0/0）
tasks          | 27 → 27       -- 无新增（无新 case）
lead_logs      | 36 → 41       -- +5: created + 3*status_change + converted_customer

-- R-FLOW-03 lead
id=34309743-9f4e-4331-8b30-bb31ec443770
leadNo=LEAD-202605-0007
status=signed                          -- 注意：不是 converted_case，因为 BMV gate 阻断
converted_customer_id=655905b5-…
converted_case_id=NULL                 -- ← BMV gate 拦下
intended_case_type=business-management-visa
assigned_user_id=00000000-0000-4000-8000-000000000011  -- Local Admin
group_id=ef21fdd2-1ffc-4a27-8b47-a640d6bd021c          -- tokyo-1

-- R-FLOW-03 customer
id=655905b5-0200-4fa8-85a8-2f8956ab78dd
base_profile.customerNumber=CUS-202605-0012
base_profile.name_jp=R-FLOW-03 佐藤一郎
base_profile.ownerUserId  = (缺位)     -- ← R-FLOW3-A-2
base_profile.groupId      = (缺位)     -- ← R-FLOW3-A-2
base_profile.visaType     = (缺位)     -- ← R-FLOW3-B-2

-- case_templates 现状
case_type='business_manager_visa'        | 経営管理ビザ標準テンプレート         | 10 items   -- ✅ 新行
case_type='engineer_humanities_intl_visa'| 技術・人文知識・国際業務ビザ標準… | 11 items   -- ❌ 老值（id=701）
case_type='family_stay'                  | 家族滞在ビザ標準テンプレート         | 10 items   -- ❌ 老值（id=700）
-- ↑ R-FLOW3-A-1：seed UPSERT DO UPDATE 不刷新 case_type / template_name

-- 关键 cases 的 document_items 落库
CASE-202605-0008 case_type_code=dependent_visa            document_items count=0  -- ❌ 模板 miss
CASE-202605-0007 case_type_code=work                      document_items count=0  -- ❌ 模板 miss
CASE-202605-0006 case_type_code=biz_mgmt_cert_4m          document_items count=1  -- 🟡 旧 fixture 不在统计目标里
CASE-202605-0005..01 case_type_code=biz_mgmt_cert_4m      document_items count=0

-- R-FLOW-03 lead_logs（按 created_at 倒序）
converted_customer 18:19:19  payload.customerId=655905b5, customerNo=CUS-202605-0012
status_change      18:18:38  pending_sign → signed
status_change      18:18:17  following → pending_sign
status_change      18:17:56  new → following
created            18:17:11  payload.sourceChannel=web, ownerUserId=…0011, name=R-FLOW-03 佐藤一郎
```

### 3.2 网络请求（关键路径）

| reqid | method | url | status | 说明 |
|-------|--------|-----|--------|------|
| 3119 | GET | `/admin/leads/dedup?phone=09044446666` | 200 | 电话去重 |
| 3120 | GET | `/admin/leads/dedup?phone=…&email=r-flow-03%40example.com` | 200 | 电话+邮箱去重，body=`{"leads":[],"customers":[]}` |
| 3121 | POST | `/admin/leads` | 201 | 新建线索 |
| 3170 | PATCH | `/admin/leads/:id/status` | 200 | new → following |
| 3172 | PATCH | `/admin/leads/:id/status` | 200 | following → pending_sign |
| 3174 | PATCH | `/admin/leads/:id/status` | 200 | pending_sign → signed |
| 3176 | POST | `/admin/leads/:id/convert-customer` | 201 | 第一步成功；UI 即时刷新到 `convertedCustomer` |
| 3177 | GET | `/admin/leads/:id` | 200 | 自动 refetch |
| 3178 | POST | `/admin/leads/:id/convert-case` | **400** | **CASE_BMV_GATE_BLOCKED** + 4 条 blocker（**正确行为**） |
| 3179 | GET | `/admin/leads/:id` | 304 | 最终 refetch（数据未变） |

注意：本轮没有像 R-FLOW2 那样出现 `convert-customer 400`（auto-chain
swallow）→ 因为本轮 lead 是新建，convert-customer 第一次就成功，第二步
直接走 convert-case；上一轮的 swallow 路径在本轮没被触发（但代码层 R-FLOW-D-2
仍生效，只是没机会演示）。

### 3.3 关键 DOM 证据

```text
# signed 状态：三处 convertCase 入口同时高亮（R-FLOW2-C-1）
header:        uid=63_0  button "签约并开始建档"
banner:        uid=63_3  button "签约并开始建档"
conversion Tab uid=64_3  button "签约并开始建档" (enabled)

# convertedCustomer 状态：转化 Tab 已生成记录卡片（R-FLOW2-F-1 / R-FLOW3-B-1）
heading:       uid=71_1  "已生成记录"
card body:     uid=71_2  "655905b5-0200-4fa8-85a8-2f8956ab78dd · ·"   ← 缺 customerNo / name / convertedAt
button:        uid=71_3  "查看客户"

# 日志 Tab：转化日志使用 customerNo（R-FLOW2-G-2）
log entry:     uid=70_29 link "已转客户：CUS-202605-0012"

# 客户列表：负责人 picker 仍是 fixture（R-FLOW3-D-1）
options:       uid=68_32..68_38  铃木 / 田中 / 李 / 佐藤 / 山田翔太 / 高桥健太 / 铃木明里
                                 （没有 Local Admin / R6走查成员 / ceshi001 / 测试 002）

# 客户详情：BMV 客户没有承接卡片（R-FLOW3-B-2）
visa type:     uid=67_74 textbox "签证类型" disabled value="—"
hint:          uid=67_75 StaticText "从经营管理签方案自动获取"
（无任何 BMV intake card UI）

# cases 列表：fixture 仍 raw snake_case（R-FLOW3-C-1）
row CASE-DEV-002: uid=52_148 StaticText "family_stay"   ← 应渲染为 "家族滞在"
row CASE-DEV-001: uid=52_161 StaticText "family_stay"
row CASE-DEV-002 stage: uid=52_146 StaticText "prepare" ← 与新 case 阶段命名口径不一致
```

---

## 4. 修复路线（建议在同一 P1 hotfix 内闭合 R-FLOW3-A-1 + A-2，并把 B-1 / B-2 / C-1 / D-1 / E-1 一并扫掉）

| ID | 文件 | 动作 |
|----|------|------|
| R-FLOW3-A-1 | `packages/server/src/scripts/seedCaseTemplates.ts:62-79` | `ON CONFLICT DO UPDATE` 增加 `template_name = EXCLUDED.template_name, case_type = EXCLUDED.case_type, application_type = EXCLUDED.application_type, active_flag = EXCLUDED.active_flag`；同时在 PR 描述里要求生产 / 各 demo 实例跑一次 `npm run db:seed-dev` |
| R-FLOW3-A-1 | `packages/server/src/scripts/seedCaseTemplates.idempotent.test.ts`（新建） | 模拟「DB 已有 case_type='family_stay', id=700 的旧 row」，运行 seed 后断言 `case_type='dependent_visa'` |
| R-FLOW3-A-1 | `packages/server/src/modules/core/cases/cases.template.repository.test.ts` | 新增 `findActiveCaseTemplateByCaseType('dependent_visa')` 与 `('work')` 命中用例（依赖 A-1 数据修复） |
| R-FLOW3-A-2 | `packages/server/src/modules/core/leads/leads.admin.convert.ts` 或同名 service | `convert-customer` 时把 `lead.assignedUserId / lead.ownerUserId / lead.groupId / lead.sourceChannel` 写入 `customers.base_profile.ownerUserId / groupId / sourceChannel`；同时把 `lead.intendedCaseType → mapBusinessTypeToCaseTypeCode → visaType` 一并写入（顺便修 R-FLOW3-B-2 的服务端部分） |
| R-FLOW3-A-2 | `packages/server/src/scripts/migrate-customer-owner-from-lead.ts`（新建） | 一次性 backfill 已转化但 base_profile.ownerUserId 缺位的 customers |
| R-FLOW3-A-2 | `packages/server/src/modules/core/leads/leads.admin.convert.service.test.ts` | 新增 `convert_writesOwnerUserIdAndGroupIdAndVisaType` |
| R-FLOW3-B-1 | `packages/server/src/modules/core/leads/leads.admin.controller.ts` 或同名 mapper | `convertedCustomer` DTO 增加 `customerNo / displayName / group / convertedAt` 字段 |
| R-FLOW3-B-1 | `packages/admin/src/views/leads/components/LeadConvertedRecords.vue:50-62` | 模板按 `customerNo || id` 与 `formatDateTime(convertedAt)` 渲染；name 缺失时回退到 customerNo |
| R-FLOW3-B-1 | `packages/admin/src/views/leads/components/LeadConvertedRecords.test.ts` | 增 `rendersCustomerNoAndConvertedAt` |
| R-FLOW3-B-2 | `packages/admin/src/views/customers/components/CustomerBmvIntakeCard.vue`（新建） | 新建组件；按 `useCustomerCreateCaseGateModel.blockers[]` 渲染 4 步骤 chip |
| R-FLOW3-B-2 | `packages/admin/src/views/customers/CustomerDetailView.vue` | 顶部插入 `<CustomerBmvIntakeCard v-if="visaType === 'business_manager_visa'" />` |
| R-FLOW3-C-1 | `packages/admin/src/views/cases/model/CaseAdapterMappers.ts`（或同名 mapper） | 走 `normalizeBusinessType + i18n('shared.businessType.<value>.label')`；同步 `CASE_STAGE_LABEL` 对 `prepare` 等旧值 fallback |
| R-FLOW3-D-1 | `packages/admin/src/views/customers/model/useCustomerListModel.ts` | `ownerOptions` 改为从 `usersStore` 拉，与 cases 列表共享 helper |
| R-FLOW3-E-1 | `packages/server/src/modules/core/leads/leads.admin.convert.ts`（与 A-2 同 PR） | 同时写 `name_jp` 与 `name_cn` 双轨，单边缺失时复制另一边 |

---

## 5. 附录：本轮端到端步骤序

1. baseline `leads=7 / customers=21 / cases=30 / case_templates=2 / document_items=7 / tasks=27 / lead_logs=36`，登录 admin@local.test；
2. 跑 `npm run db:seed-dev` →
   - terminal: `3 case templates`；
   - PG `case_templates=2 → 3`：
     - id=702 `business_manager_visa` ← 新插入；
     - id=701 case_type **仍是** `engineer_humanities_intl_visa`（**R-FLOW3-A-1** 取证）；
     - id=700 case_type **仍是** `family_stay`（**R-FLOW3-A-1** 取证）；
3. `/leads` → `新建线索` dialog → 录入 `R-FLOW-03 佐藤一郎 / 09044446666 / r-flow-03@example.com / 网站表单 / 经营管理 / tokyo-1 / Local Admin / 日语` → `创建线索`；
4. dedup 双发 + 201 + 列表 refresh +1（leads 7→8）；
5. lead 详情 → `调整状态` 三连（新咨询 → 跟进中 → 待签约 → 已签约），每步 PATCH 200；
6. signed 后：
   - 顶部 header 出现「签约并开始建档」按钮 ✅（**R-FLOW2-C-1 修复确认**）；
   - banner 文案 + 同名按钮 ✅（**R-FLOW2-C-1 修复确认**）；
   - 转化 Tab 内「签约并开始建档」 enabled ✅（**R-FLOW2-C-1 修复确认**）；
   - 「未检测到重复记录」 ✅（**R-FLOW2-E-1 修复确认**）；
7. 点 header「签约并开始建档」→ dialog 默认 `案件类型=经营管理 / 案件负责人=Local Admin / 所属组=tokyo-1` → `确认创建案件`；
8. auto-chain：
   - reqid `3176 POST convert-customer 201` ✅ → UI 立即刷新到 `convertedCustomer`：顶部 `编辑信息 / 查看客户 / 签约并开始建档`；
   - reqid `3178 POST convert-case 400 CASE_BMV_GATE_BLOCKED` + 4 条 blocker（**预期行为，正确**）；
   - dialog 内 alert 渲染 `无法创建经营管理签案件` + 4 条文案 ✅；
9. 关闭 dialog → 转化 Tab 已切到 `convertedCustomer` 状态：动作卡片消失 ✅，「已生成记录」heading 出现 ✅，但卡片正文 `655905b5-… · ·` 残缺（**R-FLOW3-B-1**）；
10. 点 header「查看客户」→ `/customers/655905b5-…` 200 加载 ✅（**R-FLOW2-A-1 修复确认**）：
    - 顶部 KPI 累计 0 / 活跃 0 / 归档 0；
    - 「签证类型」字段显示 `—`，无 BMV 承接卡片（**R-FLOW3-B-2**）；
11. 跳 `/customers` 列表：
    - KPI 我的 2 / 本组 1 / 有活跃案件 2 / 无活跃案件 0 ✅（**R-FLOW2-D-1 修复确认**）；
    - 「我的」Tab 仅 2 条 fixture，R-FLOW-01/02/03 三个新客户没有出现（**R-FLOW3-A-2**）；
    - 「全所」Tab 显示 19 条，R-FLOW-01/02/03 行内「负责人」列空（**R-FLOW3-A-2**）；
    - 负责人 picker 仍是 7 个 fixture 名（**R-FLOW3-D-1**）；
12. 跳 `/cases` 列表：
    - R-FLOW-02 案件「R-FLOW-02 田中花子 · 家族滞在」名称合成正确 ✅；
    - 负责人 picker 4 个真用户 ✅（**R-FLOW2-G-2 cases 侧修复确认**）；
    - CASE-DEV-001/002 类型仍 raw `family_stay`（**R-FLOW3-C-1**）；
13. 回 lead 详情 → `?tab=log` 直链 → 日志 Tab 直接 selected ✅（**R-FLOW2-E-2 修复确认**）；
14. 日志 Tab 顶部分类多了「转化」 ✅，转化行渲染 `已转客户：CUS-202605-0012` + clickable link ✅（**R-FLOW2-G-2 修复确认**）；
15. PG 末态校验：
    - lead `status=signed`、`converted_customer_id=655905b5-…`、`converted_case_id IS NULL`（BMV gate 阻断不留 phantom case）；
    - customer `base_profile.customerNumber=CUS-202605-0012`、`base_profile.ownerUserId IS MISSING`（**R-FLOW3-A-2**）；
    - case_templates 三行：`business_manager_visa(10)` / `engineer_humanities_intl_visa(11)` / `family_stay(10)`（**R-FLOW3-A-1**）；
    - lead_logs 5 条新增：`created` / `status_change × 3` / `converted_customer (payload.customerNo=CUS-202605-0012)`，无 `converted_case`（与 status=signed 一致）。
