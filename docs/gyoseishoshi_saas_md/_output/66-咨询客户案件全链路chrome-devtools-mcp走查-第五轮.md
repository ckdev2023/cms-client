# 咨询 → 客户 → 案件 全链路 chrome-devtools-mcp 走查（第五轮 / R-FLOW5）

> 生成日期：2026-05-07
>
> 命题：在 R-FLOW3 报告（[64-…第三轮.md](./64-咨询客户案件全链路chrome-devtools-mcp走查-第三轮.md)）
> 提出 7 条 P1/P2/P3 缺陷、R-FLOW4 静态回归（[65-…第四轮.md](./65-R-FLOW3修复回归验证-第四轮.md)）
> 判定全部仍 OPEN 之后，主分支已经在 commit `baef682` 把
> R-FLOW3 修复 + 守护测试 + backfill 脚本 + BmvIntakeCard 组件全部
> push 到 main。R-FLOW5 用 chrome-devtools-mcp 重跑一次完整端到端
> （**dependent_visa 路径**：`new → following → pending_sign → signed →
> convert-customer → convert-case`），实测验证 R-FLOW3 七条修复在
> admin 端是否真落地，并扫面新引入的回归。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill / fill_form / wait_for / evaluate_script /
> list_network_requests）+ `docker exec cms-client-postgres-1 psql` 直查
> PG + `npm run db:seed-dev` 强制刷盘 case_templates。
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）。本轮新增 1
> 条线索 `LEAD-202605-0008 / R-FLOW-04 鈴木次郎`（intended_case_type =
> `family-stay`，admin → caseTypeCode 映射为 `dependent_visa`），
> convert-customer 落库 1 个 customer `CUS-202605-0013 / 34b8da24`，
> convert-case **成功落库**为 case `CASE-202605-0009 / 11a18544`，
> case_type_code=`dependent_visa`，**document_items = 10 ✅**。基线
> leads 8 / customers 22 / cases 30 / case_templates 3 / document_items 7 →
> 末态 leads 9 / customers 23 / cases 31 / case_templates 3 / document_items 17。
> 本轮先跑 `npm run db:seed-dev` 把 `case_templates.case_type` 三行刷成
> `dependent_visa / work / business_manager_visa`（之前 R-FLOW3 末态是
> `family_stay / engineer_humanities_intl_visa / business_manager_visa`），
> 让 R-FLOW3-A-1 的 schema 修复在数据层也生效。
>
> 上游权威：
>
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md#41-咨询转案件)
> - [P0/04-核心流程与状态流转.md §4.2 资料收集与审核](../P0/04-核心流程与状态流转.md#42-资料收集与审核)
> - [62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md](./62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md)
> - [63-咨询客户案件全链路chrome-devtools-mcp走查-第二轮.md](./63-咨询客户案件全链路chrome-devtools-mcp走查-第二轮.md)
> - [64-咨询客户案件全链路chrome-devtools-mcp走查-第三轮.md](./64-咨询客户案件全链路chrome-devtools-mcp走查-第三轮.md)
> - [65-R-FLOW3修复回归验证-第四轮.md](./65-R-FLOW3修复回归验证-第四轮.md)

---

## 0. 总结

### 0.1 一句话结论

**R-FLOW3 的两条 P1 主修复（A-1 / A-2）+ E-1 + D-1 在 admin 端
真落地**：`case_templates` 在 `db:seed-dev` 之后已经升到
`dependent_visa / work / business_manager_visa` 三套；新建的
R-FLOW-04 客户 `CUS-202605-0013` 的 `base_profile` 终于**同时含
`ownerUserId / groupId / visaType / sourceChannel + name_jp + name_cn`
六个字段**；convert-case 一次性成功落库
`CASE-202605-0009 case_type_code='dependent_visa'`，**首批
`document_items = 10`**（之前 R-FLOW3 末态新建 dependent_visa 案件
`docs=0`）；admin UI Tab「资料清单 0/10」可见 ✅；customers / cases
列表的「负责人」picker 已经统一为 4 个真用户。

**但同一条 commit `baef682` 同时引入了 6 条新的 P0 / P1 / P2
回归**，把 R-FLOW2 已经修过的至少 4 件事推了回去 —— 净效果是 admin
端**主链路依然走不通**：

> 1. **R-FLOW5-A-1 [P0]** `HEADER_BUTTON_PRESETS.signedNotConverted.convertCase`
>    从 `"highlighted"` 被改回 `"hidden"`（**R-FLOW2-C-1 完全回归**）。
>    signed 状态下：header 区只剩 4 个按钮（编辑信息/调整状态/标记流失/
>    仅建客户档案），**没有「签约并开始建档」**；转化 Tab 内的
>    「签约并开始建档」**disabled** 且**无任何 tooltip 解释**；admin
>    只能走「仅建立客户档案」绕过去再点 header 二次的「签约并开始建档」
>    才能走完。
>
> 2. **R-FLOW5-A-2 [P0]** `customers.query.ts:105` 的
>    `buildCaseNamesExpr` 又开始 select 不存在的 `ca.case_type_label`
>    列（**R-FLOW2-A-1 完全回归**）。`/api/customers` 与
>    `/api/customers/:id` **只要客户名下有任何 case 就会 500**：
>    本轮 `?scope=mine`、`?scope=all`、`/customers/:id` 三条端点全部
>    `500 Internal server error`；UI 表现：客户列表 KPI 全 0、列表
>    0 条记录、客户详情页「暂时无法加载该客户」。这条直接砍掉了 P0
>    §4.1「转化后客户由当前 admin 接手」的可观察性。
>
> 3. **R-FLOW5-A-3 [P1]** `scripts/backfillCustomerOwnerFromLead.ts:67`
>    SQL 引用了不存在的 `l.assigned_user_id` 列（leads 表只有
>    `owner_user_id`），脚本一跑就 SQL crash。这条阻断了 R-FLOW3-A-2
>    对**存量 R-FLOW-01/02/03 三个客户**的 owner / group / visa
>    回填 —— admin 在「我的」Tab 仍然看不到这三个客户。
>
> 4. **R-FLOW5-A-4 [P2]** 「仅建立客户档案」dialog 在二次 dedup
>    校验时把 lead 自身识别为「可能重复」（**R-FLOW2-E-1 在另一触发点
>    回归**）—— 转化 Tab 顶部已显示「未检测到重复记录」，但 dialog
>    确认时又强制弹「检测到可能重复的记录 / R-FLOW-04 鈴木次郎
>    (09055556666 · r-flow-04@example.com)」，admin 必须再点「确认转化」
>    才能继续。
>
> 5. **R-FLOW5-A-5 [P2]** `?tab=log` 深链接不再激活日志 Tab
>    （**R-FLOW2-E-2 回归**）—— navigate 到 `?tab=log` 之后默认 Tab
>    仍是「基础信息」，必须手动点。
>
> 6. **R-FLOW5-A-6 [P2]** `lead_logs.payload` 的 `converted_customer`
>    与 `converted_case` 行**都没写 customerNo / caseNo**（**R-FLOW2-G-2
>    customer 侧 + 新增 case 侧两边都回归**）—— UI 端日志 Tab 的
>    link 文案变成「已转客户：**34b8da24**」「已建案件：**11a18544**」
>    （8 位 UUID 前缀），不再是 `CUS-202605-0013` / `CASE-202605-0009`。

> **净效果**：服务端 lead → customer → case 三步事务在 dependent_visa
> 路径上**真的能跑通**（PG 三张表都干净落库），R-FLOW3-A-1 / A-2 / E-1
> 三条 P1 修复的「**预期效果**」也在这条路径上首次被观察到（资料清单
> 10 项 + base_profile 六字段全 + name 双轨），但**Customers 模块整体
> 5xx**（A-2）+ **signed header 缺 convertCase 按钮**（A-1）+ **backfill
> 脚本崩**（A-3）+ **dedup / 深链接 / 日志文案三处 R-FLOW2 修复回归**
> （A-4 / A-5 / A-6）让本轮的体感比 R-FLOW3 末态**更糟**。建议立即把
> A-1 / A-2 当作 hotfix 第一时间扫掉，A-3 与 A-4 同 PR，A-5 / A-6 / A-7 / A-8
> 排在后面。

### 0.2 R-FLOW3（第三轮）修复回归矩阵

| 编号 | 主题 | R-FLOW5 状态 | 关键证据 |
|------|------|--------------|----------|
| R-FLOW3-A-1 | seedCaseTemplates ON CONFLICT 不刷新 case_type → R-FLOW-01/02 案件 docs=0 | ✅ **真修复** | `seedCaseTemplates.ts:62-72` ON CONFLICT 已扩展为 `template_name / case_type / application_type / active_flag` 全字段刷新 + seed 数组扩到 3 行；本轮跑 `npm run db:seed-dev` 后 PG `case_templates` 三行变为 `business_manager_visa(10) / dependent_visa(10) / work(11)` ✅；新建 `CASE-202605-0009 case_type_code='dependent_visa' docs=10` ✅；admin UI Tab「资料清单 **0/10**」可见 ✅ |
| R-FLOW3-A-2 | convert-customer 不写 ownerUserId / groupId / visaType / sourceChannel | ✅ **真修复（仅对新客户）** | `leads.admin.convert.ts:97-103` 已写入 `baseProfile.ownerUserId / groupId / sourceChannel / visaType`；新建 `CUS-202605-0013` PG 直查 `base_profile` 含 `ownerUserId='…0011' / groupId='ef21fdd2-…(tokyo-1)' / visaType='dependent' / sourceChannel='web'` ✅；🔴 **存量 R-FLOW-01/02/03 客户仍未回填**，因为 R-FLOW5-A-3 让 backfill 脚本崩了 |
| R-FLOW3-B-1 | `/admin/leads/:id`.convertedCustomer 缺 customerNo/displayName/group/convertedAt | ⚠️ **半修复** | 「已生成记录」customer 卡片显示 `R-FLOW-04 鈴木次郎 / CUS-202605-0013 · · 2026/05/07 20:37` ✅ —— customerNo + name + convertedAt **三项已接齐**；但中间 `· ·` 仍空（**group label 缺失**，详见 R-FLOW5-A-8）；🔴 case 卡片仍渲染 raw `11a18544-… · ·`（**case 侧 customerNo / caseNo 完全没接**） |
| R-FLOW3-B-2 | 客户详情对 BMV 没有承接卡片 | ⚠️ **无法在 UI 验证（被 A-2 阻断）** | `useCustomerCreateCaseGateModel.ts:46-50` `customerRequiresBmv` 已支持 `business_manager` 与 `business_manager_visa` 两种字面量；`CustomerBmvIntakeCard.vue` + `useCustomerBmvIntakeCardModel.ts` 已建并接入 `CustomerBasicInfoTab.vue:60-62`；🔴 但 R-FLOW5-A-2 已把 customers 详情 SQL 推 5xx，admin 在 UI 端**根本打不开任何 BMV 客户详情**，无法证伪卡片是否触发 |
| R-FLOW3-C-1 | cases 列表对 `family_stay` / `prepare` 老 fixture 仍 raw 渲染 | ⚠️ **type 列已修，stage/status 列未修** | cases 列表 type 列 CASE-DEV-001/002 已渲染「家族滞在」（中文）✅；CASE-202605-0009 渲染「家族滞在」✅；🔴 stage 列对 CASE-DEV-001/002 仍渲染 raw `prepare`（snapshot uid `90_118 / 90_131`）；type 字典侧补丁齐全，stage 字典侧仍有 fallback 缺口 |
| R-FLOW3-D-1 | customers 列表「负责人」picker 仍 7 个 fixture 名 | ✅ **真修复（但被 A-2 覆盖）** | `CustomerListView.vue` 已切到 `getActiveUserOptions()`，UI snapshot uid `89_30..89_35` 显示 picker = `负责人：全部 / Local Admin / R6走查成员 / ceshi001 / 测试 002` 4 个真用户 ✅；🔴 但 R-FLOW5-A-2 已让客户列表 KPI 全 0、0 条记录，picker 即使切对也没人可选 |
| R-FLOW3-E-1 | convert-customer 只写单边 name_jp 或 name_cn | ✅ **真修复** | `leads.admin.convert.ts:106-107` `baseProfile.name_jp = lead.name; baseProfile.name_cn = lead.name;` 双轨；新建 `CUS-202605-0013` PG 直查 `name_jp = name_cn = 'R-FLOW-04 鈴木次郎'` ✅；`deriveLocalizedNames` 同样 `{ ja: name, zh: name }` 双轨 |

### 0.3 优先级分布（本轮新发现 8 条 + R-FLOW3 仍开 1 条）

| 等级 | 个数 | 编号 | 主题 |
|------|------|------|------|
| P0 | 2 | R-FLOW5-A-1 / R-FLOW5-A-2 | signedNotConverted.convertCase=hidden 回归（R-FLOW2-C-1 退回）/ customers.query.ts 又引用 ca.case_type_label，列表+详情全 500（R-FLOW2-A-1 完全回归） |
| P1 | 1 | R-FLOW5-A-3 | backfillCustomerOwnerFromLead.ts SQL 引用不存在的 l.assigned_user_id 列，脚本一跑就崩，存量客户无法回填 |
| P2 | 3 | R-FLOW5-A-4 / R-FLOW5-A-5 / R-FLOW5-A-6 | 「仅建立客户档案」二次 dedup 把 lead 自身识别为重复（R-FLOW2-E-1 回归）/ ?tab=log 深链接不切日志 Tab（R-FLOW2-E-2 回归）/ lead_logs.payload 缺 customerNo/caseNo，UI 显示 8 位 UUID 前缀（R-FLOW2-G-2 双侧回归） |
| P3 | 3 | R-FLOW5-A-7 / R-FLOW5-A-8 / R-FLOW5-A-9（= R-FLOW3-C-1 半残） | 「签约并开始建档」disabled 时无 tooltip 解释 / 「已生成记录」卡片缺 group label & case 卡片缺 caseNo 与 convertedAt / cases 列表 stage 列 raw `prepare` |

---

## 1. 新发现缺陷明细（R-FLOW5-A-1 …… R-FLOW5-A-9）

### R-FLOW5-A-1 [P0] `signedNotConverted.convertCase = "hidden"` 回归 → R-FLOW2-C-1 修复**完全退回**

- **页面**：`/leads/:id`（任何 status=`signed` 且 `convertedCustomerId IS NULL` 的 lead）
- **重现**：
  1. R-FLOW-04 lead 走完 `new → following → pending_sign → signed`（PATCH 三连 200）；
  2. 页面顶部 header 区按钮列表（snapshot uid `75_4 / 75_5 / 75_6 / 81_0`）：

     ```text
     编辑信息 / 调整状态 / 标记流失 / 仅建客户档案
     ```

     —— **没有「签约并开始建档」按钮**（R-FLOW3 末态 BMV 路径下是 5 项含「签约并开始建档」）；
  3. banner 文案「该线索已签约，下一步请直接开始建档并创建首个案件。」 ✅ 在；
  4. 切到「转化信息」Tab：
     - 顶部「未检测到重复记录」 ✅；
     - 「签约并开始建档」action 卡片**仍显示**（uid `82_1 / 82_2`），但卡片底部按钮 `82_3` **disabled**；
     - 没有任何 tooltip / `aria-label` / `title` / `data-disabled-reason` 解释为什么 disabled（详见 R-FLOW5-A-7）；
  5. 唯一 enabled 的入口是「仅建立客户档案」（uid `82_6`）—— admin 必须先建客户、再点 header 二次出现的「签约并开始建档」(uid `85_1`) 才能补一个 case；
- **根因**：

  ```368:374:packages/admin/src/views/leads/types-detail.ts
    signedNotConverted: {
      convertCustomer: "highlighted",
      convertCase: "hidden",
      markLost: "enabled",
      editInfo: "enabled",
      changeStatus: "enabled",
    },
  ```

  R-FLOW2-C-1 修复（PR 时间在第二轮）已经把 `convertCase` 改成
  `"highlighted"`，git log -p 可以看到「`-    convertCase: "highlighted",` →
  `+    convertCase: "hidden"`」的反向变更。R-FLOW3 修复 commit
  `baef682` 把这一行又写回 `"hidden"`。

- **修复方向**：
  1. **直接回滚此一行**：`signedNotConverted.convertCase = "highlighted"`；
  2. **守护**：补 `types-detail.signedNotConverted-preset.test.ts` 用例：
     `expect(HEADER_BUTTON_PRESETS.signedNotConverted.convertCase).toBe("highlighted")`；
  3. **扩展**：`HEADER_BUTTON_PRESETS` 整个表加 type-level snapshot
     test，避免再次出现「单字段被静默改回 hidden」的回归。
- **影响面**：
  - 直接砍掉 P0 §4.1「signed → convert-case auto-chain」的入口；
  - admin 在 signed 状态下**完全看不到**「签约并开始建档」按钮，
    必须二次 (`仅建客户档案 → 查看客户 → 签约并开始建档`) 才能完成
    R-FLOW2 已经修过的同款主链路；
  - 与 R-FLOW2-C-1 报告里「signed 后顶部 header 出现 5 项按钮」直接矛盾。
- **关联**：与 R-FLOW2-C-1 100% 同源；建议 hotfix 同 PR。

### R-FLOW5-A-2 [P0] `customers.query.ts` 又引用不存在的 `ca.case_type_label` → customers 列表/详情**全 500**（R-FLOW2-A-1 完全回归）

- **页面**：`/customers`（所有 Tab）+ `/customers/:id`（任何客户名下有 case 时）
- **重现**：
  1. 浏览器内 `evaluate_script` 携带 admin Bearer token 拉四条端点：

     ```text
     GET /api/customers?scope=mine&page=1&limit=10  → 500
     GET /api/customers?scope=all&page=1&limit=10   → 500
     GET /api/customers/34b8da24-…(R-FLOW-04 新建)  → 500
     GET /api/customers/655905b5-…(R-FLOW-03 BMV)   → 500
     ```

     body 一律 `{"statusCode":500,"message":"Internal server error"}`；
  2. PG 直接复现 `coalesce(ca.case_type_label, '') = ''` →
     `ERROR:  column ca.case_type_label does not exist`；
  3. UI 表现 `/customers` 顶部 KPI 全 0（uid `89_10 / 89_13 / 89_16 / 89_19`），
     列表「我的 · 0 位」+ 「显示 0 - 0 条」；
  4. UI 表现 `/customers/34b8da24-…`：「暂时无法加载该客户。请求失败或返回异常，请稍后重试。」（uid `88_0..88_2`）+「重试 / 返回客户列表」按钮；
  5. 注意触发条件：**只要客户名下有任何 case** 就 500（buildCaseNamesExpr
     子查询会 select `ca.case_type_label`）；R-FLOW3 末态因为本轮三个
     R-FLOW 客户都还没 convert-case，没触发，所以当时 list 200。本轮
     R-FLOW-01 / R-FLOW-02 / R-FLOW-03 都先后被 convert-case 推到了
     `已创建案件`，所有客户都至少 1 个 case → list / detail 全部 500。
- **根因**：

  ```97:113:packages/server/src/modules/core/customers/customers.query.ts
  function buildCaseNamesExpr(customerAlias: string): string {
    return `(select coalesce(jsonb_agg(resolved_name order by created_at desc, id desc), '[]'::jsonb)
      from (
        select distinct on (ca.id)
          coalesce(
            nullif(trim(coalesce(ca.case_name, '')), ''),
            concat_ws(' · ',
              nullif(trim(coalesce(${customerAlias}.base_profile->>'displayName', ${customerAlias}.base_profile->>'legalName', '')), ''),
              nullif(trim(coalesce(ca.case_type_label, ca.metadata->>'caseTypeLabel', '')), '')
            )
          ) as resolved_name,
          ca.created_at,
          ca.id
        from cases ca
        where ${buildCaseBaseWhere("ca", customerAlias)}
      ) named_cases)`;
  }
  ```

  - line 105 `coalesce(ca.case_type_label, ca.metadata->>'caseTypeLabel', '')` —— **`ca.case_type_label` 列在 cases 表不存在**（cases 表只有 `case_type_code` / `case_name`），R-FLOW2-A-1 当时已修复为「不引用 case_type_label，用 metadata->>'caseTypeLabel' fallback 到 case_type_code」；R-FLOW3 commit `baef682` 把 `ca.case_type_label` 又**塞回 coalesce 第一项**；
  - PG 行为：coalesce 仍会先求 `ca.case_type_label`，列不存在 → 整条 SQL `column does not exist`。
- **修复方向**：
  1. 把 `ca.case_type_label` 从 coalesce 中删除：

     ```sql
     coalesce(ca.metadata->>'caseTypeLabel', ca.case_type_code, '')
     ```

     与 R-FLOW2-A-1 修复方向 1:1 一致；
  2. 守护：把现有 `customers.query.detail-sql.smoke.test.ts` 增一个用例
     「客户名下至少 1 个 case，列表 / 详情都不抛 SQL ERROR」（当前
     smoke 只覆盖了 base_profile 列，覆盖不到 buildCaseNamesExpr 的子查询）；
  3. 上线后立即跑一次 `/api/customers?scope=all` 验证 200。
- **影响面**：
  - 直接断掉 P0 §4.1 admin 端「转化后客户由当前 admin 接手」的可观察性
    —— admin **完全看不到**自己刚 convert 出来的客户；
  - 与 R-FLOW2-A-1 / R-FLOW2-D-1 完全同源（这两条 R-FLOW3 报告里都标 ✅
    已修复，本轮直接退回到 R-FLOW1/R-FLOW2 之前的状态）；
  - R-FLOW3-D-1 修复（picker 4 个真用户）也跟着失效 —— picker 选了也
    没人可选。
- **关联**：与 R-FLOW2-A-1 100% 同源 + R-FLOW3-D-1 间接受影响；建议 hotfix 同一行。

### R-FLOW5-A-3 [P1] `backfillCustomerOwnerFromLead.ts` SQL 引用不存在的 `l.assigned_user_id` 列 → 脚本一跑即崩

- **页面**：N/A（一次性 hotfix 脚本）
- **重现**：
  1. R-FLOW3 commit `baef682` 新增 `packages/server/src/scripts/backfillCustomerOwnerFromLead.ts`，目标是把已有客户的 `base_profile.ownerUserId / groupId / visaType` 按 `leads.converted_customer_id` 关系回填；
  2. 跑：

     ```bash
     DB_URL=postgres://cms:cms@localhost:5433/cms DRY_RUN=1 \
       npx tsx src/scripts/backfillCustomerOwnerFromLead.ts
     ```

  3. 输出：

     ```text
     [backfill] failed: column l.assigned_user_id does not exist
     ```

     exit 1；
  4. PG `\d leads` 验证：leads 表只有 `owner_user_id`，**没有 `assigned_user_id`**（注意：是 `assigned_org_id` ✅，但不是 `assigned_user_id`）。
- **根因**：

  ```64:71:packages/server/src/scripts/backfillCustomerOwnerFromLead.ts
  const BACKFILL_QUERY = `
    SELECT c.id AS customer_id, c.base_profile,
           l.owner_user_id, l.assigned_user_id,
           l.group_id, l.intended_case_type
    FROM customers c
    JOIN leads l ON l.converted_customer_id = c.id
    WHERE l.converted_customer_id IS NOT NULL
  `;
  ```

  - line 67 SELECT 了 `l.assigned_user_id` —— 这列不存在；
  - line 46（`buildPatch`）`row.assigned_user_id ?? row.owner_user_id` 也按这个错误列名取值。
  - 注：R-FLOW3 报告 §A-2 修复方向里写的是「`lead.assignedUserId / lead.ownerUserId`」，把 R-FLOW2 报告里 `assignedUserId` 当成 PG 列，但实际 PG 只有 `owner_user_id`。
- **修复方向**：
  1. SQL 改为只 SELECT `l.owner_user_id`；
  2. `buildPatch` 改为 `const owner = row.owner_user_id`；
  3. 已有的 `backfillCustomerOwnerFromLead.test.ts` 是基于 mock client 的
     单测，不会覆盖 SQL 列名错误；新增一个 PG smoke 用例
     `tests/integration-pg/scripts/backfillCustomerOwnerFromLead.smoke.test.ts`
     在真 PG 上跑 BACKFILL_QUERY 一次，断言不抛错；
  4. 修完后立即对 R-FLOW-01/02/03 三个存量 customer 跑一次：

     ```bash
     npx tsx src/scripts/backfillCustomerOwnerFromLead.ts
     ```

     断言 PG `select base_profile->>'ownerUserId' from customers
     where base_profile->>'customerNumber' in ('CUS-202605-0010','-0011','-0012')`
     全部非 null。
- **影响面**：
  - R-FLOW3-A-2 修复**仅对 R-FLOW5 这一轮新建的 R-FLOW-04 客户生效**；
  - 存量 R-FLOW-01 / R-FLOW-02 / R-FLOW-03 三个客户 `base_profile.ownerUserId / groupId / visaType` 仍全部 null；
  - admin 在「我的」Tab 仍然看不到这三个客户（如果 R-FLOW5-A-2 同时被修，admin 才能在「全所」Tab 看到，但「我的」依然漏）；
  - 与 R-FLOW3-A-2 强耦合：A-2 代码侧已通，A-3 的脚本侧不通 → 修了一半。
- **关联**：与 R-FLOW3-A-2 强耦合，建议同 hotfix。

### R-FLOW5-A-4 [P2] 「仅建立客户档案」二次 dedup 把 lead 自身识别为重复 → R-FLOW2-E-1 在另一触发点回归

- **页面**：`/leads/:id` 转化 Tab → 「仅建立客户档案」action card → 「确认创建客户」
- **重现**：
  1. R-FLOW-04 转化 Tab 顶部已显示「未检测到重复记录」（uid `82_0`） —— 说明 lead 详情 `?tab=conversion` 加载时的 dedup pre-check ✅；
  2. 点「仅建立客户档案」（uid `82_6`）→ 弹出 dialog，表单字段全空（默认 locale=日语）；
  3. 点「确认创建客户」（uid `83_18`）→ **弹出第二个 dialog**：

     ```text
     检测到可能重复的记录
     该线索的电话/邮箱与已有线索或客户匹配，确认继续转化吗？
     R-FLOW-04 鈴木次郎 (09055556666 · r-flow-04@example.com)
     [取消] [确认转化]
     ```

     —— 匹配的是 lead 自己；
  4. admin 必须再点「确认转化」才能继续。
- **根因（候选，未深挖）**：
  - 转化 Tab 加载时的 `/admin/leads/dedup` 已经 OK（reqid `6394` 200，body `{"leads":[],"customers":[]}` 空，已**正确排除自身**）；
  - 但 `仅建立客户档案 → 确认创建客户` 走的是 `convert-customer` 入口，那里有**第二次** dedup 校验（用 `confirmDedup` 字段判断），目前看起来没把 lead 自身排除；
  - 推测在 `leads.admin.convert.ts` 的 `convertCustomer` service 里调用了 `dedupCheck.findCandidates(lead.phone, lead.email)`，没有用 `excludeLeadId` 过滤。
- **修复方向**：
  1. `convertCustomer` 内的 dedup 校验加 `excludeLeadId = lead.id`，保持与 lead 详情 pre-check 一致；
  2. 守护：`leads.admin.convert.service.test.ts` 增 `convertCustomer_excludesSelfFromDedup` 用例，断言对 lead 自身电话 / 邮箱不返回重复；
  3. UI 端可选：dialog 的 dedup 命中如果 `matchedRecord.id === currentLeadId`，直接跳过 modal（与 lead 详情 pre-check 同款逻辑）。
- **影响面**：
  - admin 每次走「仅建立客户档案」都会被自身 dedup 拦一次，UX 噪声；
  - 不会阻断主链路（点「确认转化」即可继续），但会**让 admin 误判** lead 与其他客户存在真实重复关系；
  - 与 R-FLOW2-E-1 同款思路（lead 详情已经修复，但**新触发点** convert-customer dialog 漏接）。

### R-FLOW5-A-5 [P2] `?tab=log` 深链接不再激活日志 Tab → R-FLOW2-E-2 完全回归

- **页面**：`/leads/:id?tab=log`
- **重现**：
  1. 用 chrome-devtools-mcp navigate 到
     `http://localhost:5173/#/leads/35ed6148-…?tab=log`；
  2. 加载完成后 `take_snapshot`：默认 selected Tab 是「基础信息」(uid `92_13 selected`)，「日志」(uid `92_17`) 没 selected；
  3. 必须手动点「日志」Tab 才能看到操作日志列表；
  4. 切换到日志 Tab 后 URL 仍是 `?tab=log`（地址栏未变），所以问题在 hook 初始化时**没读取 `?tab=` query**。
- **根因（候选）**：
  - R-FLOW3 commit `baef682` 新增了 `useLeadDetailModel.tab-deep-link.test.ts`，但该测试只断言**切 Tab 时 URL 改写**，没断言**初始化时按 URL 切 Tab**；
  - `useLeadDetailModel.ts` 在 mount 时未调用 `route.query.tab` 回填 `activeTabId`。
- **修复方向**：
  1. `useLeadDetailModel.ts` mount 时优先消费 `route.query.tab`：

     ```ts
     const initialTab = (route.query.tab as string) ?? "info";
     const activeTabId = ref(VALID_TAB_IDS.includes(initialTab) ? initialTab : "info");
     ```

  2. 守护：`useLeadDetailModel.tab-deep-link.test.ts` 增 `initialActiveTab_resolvesFromQueryParam_log` / `_conversion` 用例；
  3. 验收：navigate `?tab=log` → 立即 selected。
- **影响面**：
  - admin 从外部 link / 通知跳转到日志 Tab 失效，必须手点；
  - 不阻塞主链路，与 R-FLOW2-E-2 100% 同源。

### R-FLOW5-A-6 [P2] `lead_logs.payload` 缺 customerNo / caseNo → 转化日志 link 文案显示 8 位 UUID 前缀

- **页面**：`/leads/:id?tab=log` 日志 Tab → 转化分类
- **重现**：
  1. R-FLOW-04 转化完成后 `lead_logs` 共写入 6 行（PG 直查）：

     ```text
     converted_case     | {"isBmv": false, "caseId": "11a18544-…", "ownerUserId": "…0011", "caseTypeCode": "dependent_visa"}
     converted_customer | {"customerId": "34b8da24-…"}
     status_change      | …
     status_change      | …
     status_change      | …
     created            | {…}
     ```

     —— **`converted_customer.payload` 没有 `customerNo`**（R-FLOW3 末态 R-FLOW-03 的同一行 `payload.customerNo='CUS-202605-0012'` ✅，本轮丢失）；
     —— **`converted_case.payload` 没有 `caseNo` / `caseNumber`**（R-FLOW3 报告里没专门验过 case 侧，但 case 侧也是同款逻辑漏接）；
  2. UI 表现日志 Tab（uid `93_11 / 93_17`）：

     ```text
     已转客户：34b8da24       ← 应是「已转客户：CUS-202605-0013」
     已建案件：11a18544       ← 应是「已建案件：CASE-202605-0009」
     ```

     8 位 UUID 前缀 fallback 渲染（与 R-FLOW2 报告里 R-FLOW2-G-2 修复**之前**完全一致）。
- **根因（候选）**：
  - `leads.admin.convert.ts` 写入 `lead_logs` 时只塞了 `customerId` / `caseId`，没塞 `customerNo` / `caseNo`；
  - R-FLOW2-G-2 修复时只在 `convertCustomer` service 里塞了 `payload.customerNo`，本轮 commit 把那一行丢掉了；
  - case 侧从未塞过 `caseNo`，是新引入的同款问题。
- **修复方向**：
  1. `convertCustomer` service 写 `lead_logs` 时同步塞入：

     ```ts
     await leadLogs.create(ctx, leadId, "converted_customer", {
       customerId,
       customerNo: customer.base_profile.customerNumber, // ← 必须
     });
     ```

  2. `convertCase` service 同款：

     ```ts
     await leadLogs.create(ctx, leadId, "converted_case", {
       caseId,
       caseNo:        caseRow.case_no,                     // ← 新增
       caseNumber:    caseRow.case_no,                     // 兼容字段
       caseTypeCode:  caseRow.case_type_code,
       isBmv,
       ownerUserId,
     });
     ```

  3. UI 端 `LeadLogList.vue` (or 类似) 模板渲染优先级：
     `customerNo || customerId.slice(0,8)` / `caseNo || caseId.slice(0,8)`；
  4. 守护：`leads.admin.convert.service.test.ts` 增
     `convertCustomer_writesCustomerNoIntoLeadLogPayload` 与
     `convertCase_writesCaseNoIntoLeadLogPayload` 两条用例。
- **影响面**：
  - admin 在日志 Tab 看到 UUID 前缀，认知断层；
  - 与 R-FLOW2-G-2 修复目标 100% 矛盾；
  - 不阻塞数据，只伤可读性。

### R-FLOW5-A-7 [P3] 「签约并开始建档」disabled 时无 tooltip 解释

- **页面**：转化信息 Tab（signed 状态）
- **重现**：
  1. signed 状态下转化 Tab「签约并开始建档」按钮 `disabled`（uid `82_3`）；
  2. `evaluate_script` 取按钮 attributes：

     ```json
     {"disabled":true,"ariaLabel":null,"title":null,"dataDisabledReason":null}
     ```

     —— admin 看不到任何「为什么不能点」的提示；
  3. 鼠标 hover / focus 也不显示任何 tooltip；
  4. action card 容器内全部文本仅：「签约并开始建档 / 系统会先创建客户档案，再继续创建首个案件 / 签约并开始建档」（一段 desc + 一个空按钮）。
- **根因**：`LeadConversionTab.vue:160-170` 的 `<Button :disabled="…">` 直接绑了 disabled，没绑 tooltip；R-FLOW5-A-1 让 `buttonStates.convertCase === 'hidden'` 成为常态。
- **修复方向**：
  1. 优先修 R-FLOW5-A-1（让按钮 enabled）；
  2. 即使在其他场景 disabled，给 `<Button>` 加 `:tooltip="t('leads.detail.conversionTab.convertCaseDisabledHint')"`，文案可类似「请先调整状态到「已签约」」/「客户档案已存在，请使用 header 入口」等；
  3. 守护：`LeadConversionTab.test.ts` 增 `disabledButton_rendersAriaLabel` 用例。
- **影响面**：UX 噪声，不阻塞主链路。

### R-FLOW5-A-8 [P3] 「已生成记录」客户卡片缺 group label / case 卡片缺 caseNo + convertedAt

- **页面**：`/leads/:id?tab=conversion` （`convertedCustomer && convertedCase` 状态）
- **重现**：
  1. R-FLOW-04 转化后转化 Tab 显示两张「已生成记录」卡片：
     - customer 卡片（uid `85_3 / 85_4`）：

       ```text
       R-FLOW-04 鈴木次郎
       CUS-202605-0013 · · 2026/05/07 20:37
       ```

       —— 中间 `· ·` 缺 group label；
     - case 卡片（uid `87_1 / 87_2`）：

       ```text
       CASE-202605-0009                 ← 这是 heading，OK
       11a18544-56bd-4f74-95d6-fc135bad5b46 · ·
       ```

       —— meta 行**完全 raw UUID + 两个空 `·`**，缺 caseNo（虽然 heading 已经显示了 caseNo）/ 缺 group / 缺 convertedAt；
  2. PG `customers.base_profile.groupId='ef21fdd2-…'` 已经写入 ✅，所以**数据齐了，只是 DTO 端没把 groupId → groupName 解析出来**；
  3. case 侧同样：cases.case_no='CASE-202605-0009' 已落库，DTO 没透传到前端。
- **修复方向**：
  1. 服务端 DTO 在 `/admin/leads/:id` 的 `convertedCustomer.group` 字段：
     用 `lookupGroupName(customer.base_profile.groupId)` 写入；
  2. `convertedCase` block 增加 `caseNo / group / convertedAt` 三字段；
  3. UI 端 `LeadConvertedRecords.vue` 模板对 case 卡片加同款渲染：
     `{{ caseNo || caseId }} · {{ resolveGroupLabel(group) }} · {{ formatDateTime(convertedAt) }}`；
  4. 守护：`LeadConvertedRecords.test.ts` 增 `rendersGroupLabelForCustomer` /
     `rendersCaseNoForCase` 两条。
- **影响面**：UX 一致性，不阻塞主链路；与 R-FLOW3-B-1 同款半残（customer 侧三项有了一项 group label 缺，case 侧三项全缺）。

### R-FLOW5-A-9 [P3] cases 列表 stage 列对老 fixture 仍 raw `prepare`（R-FLOW3-C-1 半残）

- **页面**：`/cases`
- **重现**：
  - CASE-DEV-001 行（uid `90_127..90_138`）：阶段「刚开始办案」✅、状态 **`prepare`**（uid `90_131`）⚠️；
  - CASE-DEV-002 同款；
  - 新建的 CASE-202605-0009 行：阶段「刚开始办案」✅、状态「咨询中」✅；
  - 与 type 列对比：CASE-DEV-001/002 type 列已渲染中文「家族滞在」（uid `90_120 / 90_133`）—— **R-FLOW3-C-1 type 字典侧已经修了**，stage / status 字典侧的 `prepare` 老值仍 raw。
- **根因**：
  - cases 列表 status 列走 `cases.constants.caseStatuses.<value>` 字典；
  - i18n `caseStatuses` 字典缺 `prepare` 键的 fallback；
  - 与 R-FLOW3-C-1 同源（`family_stay` type 侧已修，`prepare` status 侧未修）。
- **修复方向**：
  1. `packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts`
     `caseStatuses` 字典补 `prepare` 别名（与 `consult` 同义或新增「准备中」）；
  2. CaseAdapterMappers 走 `normalizeCaseStatus` 兜底；
  3. 守护：`CaseAdapterMappers.test.ts` 增 `mapsLegacyStatusValues` 用例。
- **影响面**：审美 / 一致性，不阻塞主链路。

---

## 2. 已确认正常行为（保留为绿）

| 维度 | 行为 | 证据 |
|------|------|------|
| 新建线索 | 必填校验（姓名）+ 电话/邮箱 dedup pre-check + 201 + 列表 +1 | reqid `6393/6394 GET dedup`、`6395 POST 201`、列表「我的 · 9 条」+1 |
| 状态白名单流转 | `new → following → pending_sign → signed` 三连，每次 dropdown 单值 | reqid `6398/6400/6402 PATCH status 200` 三连 |
| signed banner | 进入 signed 后顶部 banner「该线索已签约，下一步请直接开始建档并创建首个案件。」 | snapshot uid `81_1 / 81_2` |
| convert-customer 事务 | customers +1（22→23）、leads.converted_customer_id 写入、lead_logs +1 (`converted_customer`) | reqid `6405 POST 201` + PG counts 23 |
| convert-customer 字段写入 | `base_profile.{ownerUserId, groupId, visaType, sourceChannel, name_jp, name_cn}` 全部写入（A-2 + E-1 真修复） | PG `CUS-202605-0013 base_profile`：`ownerUserId='…0011' / groupId='ef21fdd2-…' / visaType='dependent' / sourceChannel='web' / name_jp=name_cn='R-FLOW-04 鈴木次郎'` |
| convert-case 事务 | cases +1（30→31）、leads.converted_case_id 写入、lead.status='converted_case'、lead_logs +1 (`converted_case`) | reqid `6407 POST 201` + PG `cases=31`、lead status='已创建案件' |
| convert-case 资料清单 | dependent_visa 路径下 case 创建时按 `case_templates` 自动生成 10 项 document_items（A-1 真修复） | PG `CASE-202605-0009 case_type_code='dependent_visa' docs=10`；admin UI Tab「资料清单 0/10」 |
| convert dialog 默认值映射 | lead `intended_case_type=family-stay` → dialog `案件类型=家族滞在` 默认选中 | snapshot uid `86_4 value="家族滞在"`，POST body `caseTypeCode:"dependent_visa"` |
| convertedCustomer 状态 header | 切到 `编辑信息 / 查看客户 / 签约并开始建档` 三按钮（convertedCustomer preset OK） | snapshot uid `75_4 / 85_0 / 85_1`，「签约并开始建档」 enabled ✅ |
| convertedCase 状态 header | 切到 `编辑信息 / 查看客户 / 查看案件` 三按钮（convertedCase preset OK） | snapshot uid `92_4 / 92_5 / 92_6` |
| 转化 Tab「已生成记录」customer 卡片 | 显示客户名 + customerNo + convertedAt 三项 ✅（R-FLOW3-B-1 customer 侧修复确认） | snapshot uid `85_3 "R-FLOW-04 鈴木次郎"` + `85_4 "CUS-202605-0013 · · 2026/05/07 20:37"` |
| leads 列表 i18n | 新建 R-FLOW-04 行业务类型显示 `family-stay · web` kebab-case ✅；R-FLOW-01/02/03 同款 | snapshot uid `74_8 / 72_137 / 72_154 / 72_120` |
| leads 列表 owner picker | 4 个真用户（Local Admin / R6走查成员 / ceshi001 / 测试 002） | snapshot uid `72_64..72_67`（R-FLOW3 已修，R-FLOW5 保留） |
| customers 列表 owner picker | 4 个真用户 ✅（R-FLOW3-D-1 修复确认） | snapshot uid `89_31..89_35` |
| cases 列表 owner picker | 4 个真用户 ✅ | snapshot uid `90_31..90_36` |
| cases 列表 type 列中文化 | CASE-202605-0007/0008/0009 type 显示「工作签证 / 家族滞在 / 家族滞在」中文 ✅；CASE-DEV-001/002 type 显示「家族滞在」中文 ✅（R-FLOW3-C-1 type 侧修复确认） | snapshot uid `90_94 / 90_81 / 90_68 / 90_120 / 90_133` |
| case 详情资料清单 Tab | dependent_visa 路径 `资料清单 0/10` ✅ + 概览页「资料完成率 0% / 0/10」、「资料收集分组进度 0/10」 | snapshot uid `91_18 / 91_36 / 91_42`（R-FLOW3-A-1 真修复 admin 端可观察证据） |
| case 详情顶部 link | 顶部「关联客户：R-FLOW-04 鈴木次郎」 + 「东京一组」 group label ✅（cases 侧不依赖 R-FLOW5-A-2 的 SQL bug） | snapshot uid `91_10..91_29` |

---

## 3. 关键证据（PG / network / DOM）

### 3.1 PG 末态

```sql
-- 计数（基线 → 末态）
leads          | 8 → 9         -- +1: R-FLOW-04 鈴木次郎
customers      | 22 → 23       -- +1: CUS-202605-0013
cases          | 30 → 31       -- +1: CASE-202605-0009 dependent_visa
case_templates | 3 → 3         -- 行数不变，但 case_type 三行已被 db:seed-dev 刷成
                                --   business_manager_visa(10) / dependent_visa(10) / work(11)
document_items | 7 → 17        -- +10: dependent_visa 模板 10 项
lead_logs      | 41 → 47       -- +6: created + 3*status_change + converted_customer + converted_case

-- R-FLOW-04 lead
id=35ed6148-00de-48cf-8924-15c787554b75
leadNo=LEAD-202605-0008
status=converted_case          -- 完整走完，与 R-FLOW3 BMV gate 阻断不同
converted_customer_id=34b8da24-cdc7-4c4c-a6fb-5ab2eccf09c3
converted_case_id=11a18544-56bd-4f74-95d6-fc135bad5b46
intended_case_type=family-stay
owner_user_id=00000000-0000-4000-8000-000000000011  -- Local Admin
group_id=ef21fdd2-1ffc-4a27-8b47-a640d6bd021c       -- tokyo-1

-- R-FLOW-04 customer (CUS-202605-0013)（A-2 + E-1 修复全部生效）
id=34b8da24-cdc7-4c4c-a6fb-5ab2eccf09c3
base_profile.customerNumber=CUS-202605-0013
base_profile.name_jp=R-FLOW-04 鈴木次郎              -- ✅ 双轨
base_profile.name_cn=R-FLOW-04 鈴木次郎              -- ✅ 双轨
base_profile.ownerUserId=00000000-0000-4000-8000-000000000011  -- ✅
base_profile.groupId=ef21fdd2-1ffc-4a27-8b47-a640d6bd021c      -- ✅
base_profile.visaType=dependent                     -- ✅（短码，与 cases.case_type_code='dependent_visa' 长码不同枚举）
base_profile.sourceChannel=web                      -- ✅

-- R-FLOW-04 case (CASE-202605-0009)（A-1 真修复证据）
id=11a18544-56bd-4f74-95d6-fc135bad5b46
case_no=CASE-202605-0009
case_type_code=dependent_visa
document_items count=10                             -- ✅ 之前 R-FLOW3 末态对应案件是 0

-- R-FLOW3 三个存量客户（A-3 阻断 → 仍未回填）
CUS-202605-0010 R-FLOW-01 王小红     base_profile.{ownerUserId,groupId,visaType,sourceChannel} 全 NULL
CUS-202605-0011 R-FLOW-02 田中花子   base_profile.{ownerUserId,groupId,visaType,sourceChannel} 全 NULL
CUS-202605-0012 R-FLOW-03 佐藤一郎   base_profile.{ownerUserId,groupId,visaType,sourceChannel} 全 NULL

-- case_templates 三行（R-FLOW3-A-1 真修复 + db:seed-dev 已刷盘）
case_type='business_manager_visa'  | 経営管理ビザ標準テンプレート                 | 10 items   -- ✅
case_type='dependent_visa'          | 家族滞在ビザ標準テンプレート                 | 10 items   -- ✅（R-FLOW3 末态是 family_stay）
case_type='work'                    | 技術・人文知識・国際業務ビザ標準テンプレート | 11 items   -- ✅（R-FLOW3 末态是 engineer_humanities_intl_visa）

-- R-FLOW-04 lead_logs（按 created_at 倒序）
converted_case     20:37  payload={"isBmv":false, "caseId":"11a18544-…", "caseTypeCode":"dependent_visa"}    -- ❌ 缺 caseNo (R-FLOW5-A-6)
converted_customer 20:37  payload={"customerId":"34b8da24-…"}                                                -- ❌ 缺 customerNo (R-FLOW5-A-6)
status_change      20:35  pending_sign → signed
status_change      20:34  following → pending_sign
status_change      20:34  new → following
created            20:33  payload={"name":"R-FLOW-04 鈴木次郎","ownerUserId":"…0011","sourceChannel":"web"}
```

### 3.2 网络请求（关键路径）

| reqid | method | url | status | 说明 |
|-------|--------|-----|--------|------|
| 6393 | GET | `/admin/leads/dedup?phone=09055556666` | 200 | 电话去重 pre-check |
| 6394 | GET | `/admin/leads/dedup?phone=…&email=r-flow-04%40example.com` | 200 | 电话+邮箱去重，body=`{"leads":[],"customers":[]}`（**正确排除自身**） |
| 6395 | POST | `/admin/leads` | 201 | 新建线索 LEAD-202605-0008 |
| 6398 | PATCH | `/admin/leads/:id/status` | 200 | new → following |
| 6400 | PATCH | `/admin/leads/:id/status` | 200 | following → pending_sign |
| 6402 | PATCH | `/admin/leads/:id/status` | 200 | pending_sign → signed |
| 6404 | GET | `/admin/leads/dedup?phone=…&email=…` | 200 | 「仅建立客户档案」二次 dedup（**返回非空** → A-4） |
| 6405 | POST | `/admin/leads/:id/convert-customer` | **201** | ✅ |
| 6407 | POST | `/admin/leads/:id/convert-case` | **201** | ✅（不再被 BMV gate 阻断，因为 dependent_visa 路径） |
| 6463 | GET | `/api/customers/34b8da24-…` | **500** | 🔴 **R-FLOW5-A-2** customer detail SQL ERROR |

通过 `evaluate_script` 携带 admin Bearer token 单独再发的探测：

```text
GET /api/customers?scope=mine&page=1&limit=10  → 500 (R-FLOW5-A-2)
GET /api/customers?scope=all&page=1&limit=10   → 500 (R-FLOW5-A-2)
GET /api/customers/34b8da24-…(R-FLOW-04 新建)   → 500 (R-FLOW5-A-2)
GET /api/customers/655905b5-…(R-FLOW-03 BMV)   → 500 (R-FLOW5-A-2)
```

### 3.3 关键 DOM 证据

```text
# signed 状态：header 区只剩 4 个按钮（R-FLOW5-A-1 / R-FLOW2-C-1 回归）
header buttons: uid=75_4 "编辑信息" / 75_5 "调整状态" / 75_6 "标记流失" / 81_0 "仅建客户档案"
                ↑ 缺「签约并开始建档」

# 转化 Tab：「签约并开始建档」disabled，无 tooltip（R-FLOW5-A-1 + A-7）
button:        uid=82_3  button "签约并开始建档" [disabled, no aria-label/title/data-disabled-reason]
button:        uid=82_6  button "仅建立客户档案" enabled
text:          uid=82_0  "未检测到重复记录。此线索的电话/邮箱未匹配到已有线索或客户。"

# 「仅建立客户档案」dialog 二次 dedup 把 lead 自身识别为重复（R-FLOW5-A-4）
dialog:        uid=84_0  "检测到可能重复的记录"
              uid=84_1  "该线索的电话/邮箱与已有线索或客户匹配，确认继续转化吗？"
              uid=84_2  "R-FLOW-04 鈴木次郎 (09055556666 · r-flow-04@example.com)"
              uid=84_5  button "确认转化"

# convertedCustomer + convertedCase 后转化 Tab「已生成记录」（R-FLOW3-B-1 半修复 + R-FLOW5-A-8）
heading:       uid=85_2  "已生成记录"
customer card: uid=85_3  "R-FLOW-04 鈴木次郎"
              uid=85_4  "CUS-202605-0013 · · 2026/05/07 20:37"   ← 缺 group label
case heading:  uid=87_1  "CASE-202605-0009"
case meta:     uid=87_2  "11a18544-56bd-4f74-95d6-fc135bad5b46 · ·"   ← raw UUID + 缺 group + 缺 convertedAt

# 客户详情 500（R-FLOW5-A-2）
text:          uid=88_0  "暂时无法加载该客户。"
              uid=88_1  "请求失败或返回异常，请稍后重试。"
              uid=88_2  button "重试"

# 客户列表 KPI 全 0（R-FLOW5-A-2 副作用）
KPI:           uid=89_10 "0" / 89_13 "0" / 89_16 "0" / 89_19 "0"
table:         uid=89_41 "当前查看：我的 · 0 位"
              uid=89_51 "显示 0 - 0 条，共 0 条"

# 客户列表 owner picker 已切真用户（R-FLOW3-D-1 ✅ 但被 A-2 覆盖）
options:       uid=89_31..89_35  负责人：全部 / Local Admin / R6走查成员 / ceshi001 / 测试 002

# cases 列表：R-FLOW3-C-1 type 侧修复确认；status 列仍 raw（R-FLOW5-A-9）
row CASE-202605-0009: uid=90_68  StaticText "家族滞在"           ← ✅ 中文化
row CASE-DEV-002:     uid=90_120 StaticText "家族滞在"           ← ✅
row CASE-DEV-002 stat:uid=90_118 StaticText "prepare"           ← ❌ raw
row CASE-DEV-001 stat:uid=90_131 StaticText "prepare"           ← ❌ raw

# case 详情 R-FLOW3-A-1 admin 端可观察证据
case detail tabs: uid=91_18 tab "资料清单 0/10"   ← ✅ 10 项资料模板
overview KPI:     uid=91_35 "0%" / 91_36 "0/10"
group progress:   uid=91_42 "0/10"

# lead 详情日志 Tab 转化日志（R-FLOW5-A-6）
log link:      uid=93_11 link "已建案件：11a18544"   url=/cases/11a18544-…    ← 应是 CASE-202605-0009
log link:      uid=93_17 link "已转客户：34b8da24"   url=/customers/34b8da24-…   ← 应是 CUS-202605-0013

# ?tab=log 深链接没切换到日志 Tab（R-FLOW5-A-5）
url=…?tab=log
selected tab: uid=92_13 tab "基础信息" selected   ← ❌ 应该是「日志」selected
```

---

## 4. 修复路线（建议在同一 P0/P1 hotfix 内闭合 A-1 + A-2 + A-3）

| ID | 文件 | 动作 |
|----|------|------|
| R-FLOW5-A-1 | `packages/admin/src/views/leads/types-detail.ts:368-374` | `signedNotConverted.convertCase: "hidden"` → `"highlighted"`（直接回滚 R-FLOW3 引入的回归） |
| R-FLOW5-A-1 | `packages/admin/src/views/leads/types-detail.preset-snapshot.test.ts`（新建） | 对整张 `HEADER_BUTTON_PRESETS` 做 snapshot；任何字段单点修改都要更新 snapshot 才能合并 |
| R-FLOW5-A-2 | `packages/server/src/modules/core/customers/customers.query.ts:97-113` | `buildCaseNamesExpr` 删除 `coalesce(ca.case_type_label, …)` 第一项，改为 `coalesce(ca.metadata->>'caseTypeLabel', ca.case_type_code, '')`（与 R-FLOW2-A-1 修复 1:1 一致） |
| R-FLOW5-A-2 | `packages/server/src/modules/core/customers/customers.query.detail-sql.smoke.test.ts` | 现有 smoke 增加用例「客户名下至少 1 个 case，list / detail 都不抛 SQL ERROR」 |
| R-FLOW5-A-3 | `packages/server/src/scripts/backfillCustomerOwnerFromLead.ts:46,67` | SQL `SELECT l.assigned_user_id` 删除；`buildPatch` 改 `const owner = row.owner_user_id` |
| R-FLOW5-A-3 | `packages/server/tests/integration-pg/scripts/backfillCustomerOwnerFromLead.smoke.test.ts`（新建） | 真 PG 上跑一次 BACKFILL_QUERY，断言不抛 column does not exist；运行后断言 R-FLOW-01/02/03 三个 customer `base_profile->>'ownerUserId'` 非 null |
| R-FLOW5-A-4 | `packages/server/src/modules/core/leads/leads.admin.convert.ts` | `convertCustomer` 内 dedup 校验加 `excludeLeadId = lead.id`，与 lead 详情 pre-check 一致 |
| R-FLOW5-A-4 | `packages/server/src/modules/core/leads/leads.admin.convert.service.test.ts` | 新增 `convertCustomer_excludesSelfFromDedup` |
| R-FLOW5-A-5 | `packages/admin/src/views/leads/model/useLeadDetailModel.ts` | mount 时优先消费 `route.query.tab`，回填 `activeTabId`；现有 `useLeadDetailModel.tab-deep-link.test.ts` 增 `initialActiveTab_resolvesFromQueryParam_log` |
| R-FLOW5-A-6 | `packages/server/src/modules/core/leads/leads.admin.convert.ts` | `convertCustomer` 写 lead_logs 时塞 `payload.customerNo`；`convertCase` 写 lead_logs 时塞 `payload.caseNo / caseNumber` |
| R-FLOW5-A-6 | `packages/admin/src/views/leads/components/LeadLogList.vue` 或同名渲染器 | link 文案优先 `customerNo / caseNo`，缺失再 fallback `id.slice(0, 8)` |
| R-FLOW5-A-7 | `packages/admin/src/views/leads/components/LeadConversionTab.vue:160-170` | `<Button :disabled :tooltip="…">` 加文案 key `leads.detail.conversionTab.convertCaseDisabledHint` |
| R-FLOW5-A-8 | `packages/server/src/modules/core/leads/leads.admin.controller.ts` 或同名 mapper | `convertedCustomer.group` 用 `lookupGroupName(customer.base_profile.groupId)` 写入；`convertedCase` block 增加 `caseNo / group / convertedAt` 三字段 |
| R-FLOW5-A-8 | `packages/admin/src/views/leads/components/LeadConvertedRecords.vue` | 模板对 case 卡片加同款渲染：`{{ caseNo || caseId }} · {{ resolveGroupLabel(group) }} · {{ formatDateTime(convertedAt) }}` |
| R-FLOW5-A-9 | `packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts` | `caseStatuses` 字典补 `prepare` 别名（与 `consult` 同义或新增「准备中」） |
| 收尾 | `npm run fix` + `npm run guard` | 必须全绿；当前 server `secrets:check` 已挂在 `customers.query.detail-sql.smoke.test.ts`（PR 时也要扫掉），server `test` 还有 2 条 `customers.service.bmv.d5-transition.test.ts` fail（与本轮无直接关联，但属于 hotfix 范围内） |

---

## 5. 附录：本轮端到端步骤序

1. baseline `leads=8 / customers=22 / cases=30 / case_templates=3(case_type 错位组合) / document_items=7 / lead_logs=41`，登录 admin@local.test；
2. `cd packages/server && npm run db:seed-dev` → terminal `3 case templates`；PG `case_templates` 三行 case_type 已升到 `business_manager_visa / dependent_visa / work`（**R-FLOW3-A-1 数据层落地**）；
3. `npx tsx --env-file=.env src/scripts/backfillCustomerOwnerFromLead.ts` →
   `[backfill] failed: column l.assigned_user_id does not exist`（**R-FLOW5-A-3** 取证），跳过；
4. `/leads` → `新建线索` dialog → 录入 `R-FLOW-04 鈴木次郎 / 09055556666 / r-flow-04@example.com / 网站表单 / 家族滞在 / tokyo-1 / Local Admin / 日语` → `创建线索`；
5. dedup 双发 + 201 + 列表 refresh +1（leads 8→9）；
6. lead 详情 → `调整状态` 三连（new → following → pending_sign → signed），每步 PATCH 200；
7. signed 后：
   - 顶部 header **只 4 个按钮**（**R-FLOW5-A-1** 取证：缺「签约并开始建档」）；
   - banner 文案 ✅；
   - 转化 Tab 内「签约并开始建档」 **disabled** 且无 tooltip（**R-FLOW5-A-1 + A-7** 取证）；
   - 「未检测到重复记录」 ✅；
8. 点「仅建立客户档案」 → dialog 默认 `日语` → `确认创建客户`；
9. **二次 dedup 弹窗**：「检测到可能重复的记录 / R-FLOW-04 鈴木次郎 (自身)」（**R-FLOW5-A-4** 取证）→ 点「确认转化」；
10. convert-customer 201：
    - 顶部 header 切到 `编辑信息 / 查看客户 / 签约并开始建档`（这次「签约并开始建档」 enabled ✅，因为是 `convertedCustomer` preset 不是 `signedNotConverted` preset）；
    - 转化 Tab「已生成记录」customer 卡片 `R-FLOW-04 鈴木次郎 / CUS-202605-0013 · · 2026/05/07 20:37`（**R-FLOW3-B-1 customer 侧修复确认**，但 group label 缺 → **R-FLOW5-A-8** 取证）；
11. 点 header「签约并开始建档」 → dialog 默认 `案件类型=家族滞在` → `确认创建案件`；
12. convert-case 201（不再被 BMV gate 阻断，因为 dependent_visa 路径）：
    - case 编号 CASE-202605-0009、case_type_code=`dependent_visa`、document_items=**10**（**R-FLOW3-A-1 真修复证据**）；
    - 转化 Tab case 卡片 `CASE-202605-0009` heading + `11a18544-… · ·` 残缺（**R-FLOW5-A-8** case 侧取证）；
13. 点「查看客户」→ `/customers/34b8da24-…` → **「暂时无法加载该客户」**（**R-FLOW5-A-2** UI 取证）；
14. `evaluate_script` 携带 admin Bearer token 探测 4 条 `/api/customers*` 全 500（**R-FLOW5-A-2** API 取证）；
15. `/customers` 列表：
    - KPI 全 0、列表 0 条记录（**R-FLOW5-A-2** 副作用）；
    - 但 owner picker 已经是 4 个真用户（**R-FLOW3-D-1** UI 修复确认 ✅）；
16. `/cases` 列表：
    - CASE-202605-0009「R-FLOW-04 鈴木次郎 · 家族滞在」 type 中文 ✅；
    - CASE-DEV-001/002 type「家族滞在」中文 ✅（**R-FLOW3-C-1 type 侧修复确认**）；
    - CASE-DEV-001/002 status「prepare」仍 raw（**R-FLOW5-A-9** 取证 = R-FLOW3-C-1 status 侧未修）；
    - owner picker 4 个真用户 ✅；
17. CASE-202605-0009 详情：
    - Tab「资料清单 0/10」 ✅（**R-FLOW3-A-1 admin 端可观察证据**）；
    - 概览页「资料完成率 0% / 0/10」 ✅；
18. lead 详情 → navigate `?tab=log` → 默认 selected「基础信息」（**R-FLOW5-A-5** 取证 = R-FLOW2-E-2 回归）→ 手动点「日志」；
19. 日志 Tab 转化分类：
    - 「已转客户：**34b8da24**」「已建案件：**11a18544**」（**R-FLOW5-A-6** UI 取证）；
    - PG `lead_logs.payload` 直查：`converted_customer` 仅含 `customerId`、`converted_case` 仅含 `caseId/ownerUserId/caseTypeCode/isBmv`，**缺 customerNo / caseNo**（**R-FLOW5-A-6** server 端取证 = R-FLOW2-G-2 双侧回归）；
20. PG 末态校验：
    - lead `status='converted_case'`、`converted_customer_id=34b8da24-…`、`converted_case_id=11a18544-…`、`intended_case_type='family-stay'`；
    - customer `base_profile.{ownerUserId,groupId,visaType,sourceChannel,name_jp,name_cn}` 六字段全在 ✅；
    - case `case_type_code='dependent_visa'`、document_items=10 ✅；
    - case_templates 三行 case_type=`business_manager_visa / dependent_visa / work` ✅；
    - 三个存量 R-FLOW-01/02/03 客户 base_profile 仍空（**R-FLOW5-A-3** 阻断）。
