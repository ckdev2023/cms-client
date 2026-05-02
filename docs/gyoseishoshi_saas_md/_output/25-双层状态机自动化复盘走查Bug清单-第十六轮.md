# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十六轮 / R15 land 复测 + 多客户多案件流程交叉走查）

> 生成日期：2026-05-01（chrome-devtools-mcp 多客户多案件交叉走查 + R15 §0.3 BUG-174 / 175 / 176 / OBS-001 land 项实测验收 + R14 §0.3 BUG-165~173 双重复测）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/21-双层状态机自动化复盘走查Bug清单-第十五轮.md` §0.3 BUG-174 / 175 / 176 / BUG-OBS-001（4 条）
> - `docs/gyoseishoshi_saas_md/_output/20-双层状态机自动化复盘走查Bug清单-第十四轮.md` §0.3 BUG-165~173（9 条）
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（20 步状态机 / 数据结构 / 业务规则）
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` / `take_snapshot` / `evaluate_script` / `click` / `list_network_requests` / `get_network_request`）+ 直读 PostgreSQL（`docker exec ... psql`）+ 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第十五轮（`21-...md`）互为续篇；本轮**对 R15 §0.3 4 条偏差做 land 复测 + R14 §0.3 9 条 reaffirm**，并对 4 类 caseTypeCode × 3 个 stage × 2 个客户的全矩阵做了交叉走查。
>
> mempalace `prepare_grounded_answer` 已 grounded（biz-mgmt P1 落地清单 / M6 收费与 COE 门禁 / M8 在留期间与续签提醒）；本文不直接陈述业务规则，仅以"产品规则 / 文档锚点"维度引用。

---

## 0. 第十六轮总结

### 0.1 走查矩阵（多客户 × 多案件 × 多阶段交叉）

| 维度 | 覆盖 | 备注 |
|---|---|---|
| 客户类型 | 1 类（个人 / BMV）× 13 户 | 全部 `bmvProfile` 已挂；customer 列表无 corporate / non-BMV 样本 |
| 案件 caseTypeCode | 4 种：`biz_mgmt_cert_4m` × 1 + `biz_mgmt_4m` × 10 + `biz_mgmt` × 6 + `family` × 3 | 与产品规范 P0 范围一致 |
| 阶段 stage | 3 种：S1 × 15 + S2 × 1 + S9 × 4 | S3-S8 / S20 阶段无 fixture 样本（不在本轮走查口径） |
| businessPhase | 7 种：CONSULTING / WAITING_PAYMENT / NEED_SUPPLEMENT / SUCCESS / RENEWAL_REMINDER_SCHEDULED / CLOSED_FAILED / CLOSED_SUCCESS | 双层状态机（stage × phase）覆盖完整 |
| Locale | 三语全切（en-US / zh-CN / ja-JP），全站抽样 | i18n 合规度按 locale 逐项盘 |

### 0.2 R15 §0.3 4 条偏差实测验收

| # | R15 标记 | R16 实测 | 一句话 |
|---|---|---|---|
| BUG-174（CaseValidationTab.vue i18n 遗漏 22 段） | P2 [FE] | **⚠️ 部分 land** | en-US 下 CASE-202605-0003（S1 空态）的 Pre-submission tab 全 en-US（`Validation passed, no blockers / Submission packages (history) / Create package / No submission packages yet / Double Review / Start Review / No review records yet / Arrears Risk Confirmation Log / No arrears risk confirmation / Simulate Risk Confirmation / POST-APPROVAL / Case has not reached this stage`），但**所有抽样案件全部为空态**，没有 blockers / submission packages / review records 数据，无法验证含数据的 22 段中文文案是否同步抽 i18n；空态 11 段 ✅ land。|
| BUG-175（reminder 标题 ja-JP 字符串泄漏） | P3 [FE/BE] | **✅ 全语言 PASS** | en-US `Business Manager · Renewal reminder 180/90/30 days before expiry`；ja-JP `経営管理 · 期限の 180/90/30 日前リマインダー`；dedupe key 三语统一为 `residence_period:e00ea5d2:{180/90/30}`（与 BUG-171 land 自洽）|
| BUG-176（admin Step 4 错误 toast 双前缀 `CASE_OWNER_NOT_FOUND: CASE_OWNER_NOT_FOUND:`） | P3 [FE] | **未触发**（本轮无失败链路触发） | 主链路成功创建 CASE-202605-0003，未触发失败 toast 路径；R15 已记录的代码热点 `useCreateCaseModelSubmit.ts:67-77 normalizeSubmitError` 仍在仓库中 |
| BUG-OBS-001（建案后 case_parties 主申请人 INSERT 失败） | P0 升 P1 (R15 升级标 BUG-177) | **⚠️ server land、migration 未跑** | server 端 `caseParties.types.ts:VALID_PARTY_TYPES` 已加 `applicant`、`migration 039_backfill_primary_applicant_case_parties` 已 land 文件；admin `buildPrimaryCasePartyInput()` 写 `partyType="applicant"` 路径无变化。**实测 API `POST /api/case-parties partyType=applicant` 返 201**（手动验证），但**数据库 `schema_migrations` 表只到 038、migration 039 未应用**，22 条 cases × 0 条 case_parties，所有历史/新建案件主申请人行均缺失。详见 §3.1 |

**统计**：4 条中 **1 条 ✅ PASS**（BUG-175）+ **2 条 ⚠️ PARTIAL**（BUG-174 空态 land、BUG-OBS-001 代码 land 但 migration 未跑）+ **1 条未触发**（BUG-176）。

### 0.3 R14 §0.3 9 条 + 跨轮 BUG-137 reaffirm

| # | R15 标记 | R16 复测 |
|---|---|---|
| BUG-165（owner UUID 对称解析） | ✅ PASS | **✅ PASS**（CASE-202605-0003 ownerUserId 已 UUID 化）|
| BUG-166（PG 22P02 → 400） | ✅ PASS | **✅ PASS**（未 regress）|
| BUG-167（CaseBillingTab i18n） | ✅ PASS | **✅ PASS**（en-US Billing tab 全本地化：Total fees / Collected / Outstanding / DATE / TYPE / AMOUNT / STATUS / ACTIONS / Invoice / Invoice details are not shown ...）|
| BUG-168（Pre-submission tab i18n） | ⚠️ PARTIAL → BUG-174 | **⚠️ 同 BUG-174 评价**（`CaseValidationSupport.vue` 段 land；`CaseValidationTab.vue` 22 段需含数据样本验证）|
| BUG-169（Documents tab 空态 i18n） | ✅ PASS | **✅ PASS**（en-US 空态：`Storage root not configured` / `No documents registered yet` / `Register documents` / `Add manually`）|
| BUG-170（Overview group raw slug） | ✅ PASS | **✅ PASS**（en `Tokyo Team 1`、zh `东京一组`、ja `東京一組`）|
| BUG-171（Reminder log dedupe key UUID） | ✅ PASS | **✅ PASS**（dedupe key `residence_period:e00ea5d2:{180/90/30}` 全 UUID v4 零命中）|
| BUG-172（case 列表 Type 列 Title Case） | ✅ PASS | **✅ PASS 三语**（en `BMV (CoE 4-month)` / `Business Manager Visa` / `Dependent Visa`；zh `经营管理（认定4个月）` / `经营管理签` / `家族滞在`；ja `経営管理（認定4ヶ月）` / `経営管理ビザ` / `家族滞在`）|
| BUG-173（Step 4 失败 toast detail 透传） | ✅ PASS（轻噪声 BUG-176） | **未触发**（同 BUG-176）|

跨轮：BUG-137（empty/null birthday → 201）✅ R16 仍 PASS。

### 0.4 本轮新增偏差（多客户多案件交叉走查发现）

| # | 优先级 | 现象（一句话） | 根因（一句话） |
|---|---|---|---|
| **BUG-178** | **P0 [BE/Ops]** | `migration 039_backfill_primary_applicant_case_parties` 文件已 land、SQL 正确，但**数据库 `schema_migrations` 表中未记录 039**（只到 `038_backfill_customer_bmv_profile`）→ `case_parties` 表对 22 条 cases 仍 0 行，BUG-177 backfill 未生效。`db:migrate` 没在 PR merge / 重启时自动跑。 | server 启动入口未挂自动迁移，需手动 `npm run db:migrate`；BUG-177 PR 合并时只交付了**代码 + SQL 文件**，未交付**已应用的迁移记录**；上线 / dev fixture 重置流程缺一道 "确保 migrations 已对齐" 的门禁。|
| **BUG-179** | **P1 [FE/BE]** | en-US locale 下 Dashboard `Risk cases` 卡片每个 entry 的 4 段裸露 zh-CN：`负责人：Local Admin / 待收：¥80,000 / 收费风险 / 待收金额 ¥80,000，需尽快跟进收费。 / 查看收费`（按钮）。同样 i18n 漏洞**潜伏在 todo / deadlines / submissions 三类卡片**，本轮因这三类当前 0 项不可见，但只要任一类有数据即会暴露。 | 服务端 `dashboard.service.ts:6-24` 从 **`./dashboard.shared` 导入 `mapTodoItem / mapDeadlineItem / mapSubmissionItem / mapRiskItem`**——这是**只返回硬编码 zh-CN 的 legacy 实现**（`dashboard.shared.ts:254/293/317/353`，全部直输 `负责人 / 待收 / 收费风险 / 查看收费 / 期限 / 状态 ...`）；而**i18n-aware 版本**`dashboard.workItem.ts:122/156/183/300` 同名同签且**已经实现了 `statusLabelKey / descKey / actionKey / metaKeys` 四元组**，但 service 从未切换。前端 `WorkPanelSection.vue:91-100` 已经有正确的 `metaKeys ? t(...) : item.meta` fallback 链路。详见 §3.2 |
| **BUG-180** | **P2 [FE]** | Customer Detail Cases tab 的 "Status" 列与 Cases List 全局表 "Stage" 列**状态语义不一致**：S9 (CLOSED_SUCCESS / CLOSED_FAILED) 案件在 customer detail Cases tab 标 `Active`、Cases List 标 `Archived`。R6试探客户 detail Cases tab 中 11 条 case 全标 `Active`，但其中 `BUG-117 CLOSED_FAILED` (S9) / `R6 supplement probe` (S9) 实际已闭案。 | `CustomerDetailCasesTab` 渲染 "Status" 列时仅判 `archivedAt != null` → "Archived" else → "Active"，没看 `stage === 'S9'`；`CasesListView` 渲染 "Stage" 列时正确把 stage 映射成 `Archived`。两套口径不一。|
| **BUG-181** | **P2 [BE]** | `cases.quotePrice` 写入但 **`billing-plans` 表无对应行** 的案件**普遍存在**：CASE-202605-0003（quotePrice=150,000）、CASE-202604-0019/0018/0017（businessPhase=`WAITING_PAYMENT/NEED_SUPPLEMENT`）等多个 case 未生成 billing plan。Case Detail Billing tab → Total fees `—`、Outstanding `¥0`，与 `cases.quotePrice` / `businessPhase` 强不一致。Cases list 中这些 case 的 Outstanding 列也是 `—`。 | 建案路径（`POST /api/cases`）只写 `cases.quote_price`，没有同步 INSERT 一行 `billing_plans`（按 phase==WAITING_DEPOSIT / WAITING_PAYMENT 自动生成 deposit / final 两笔 plan）；或者**生成方式是按 phase 转移触发**，但 phase 已 = WAITING_PAYMENT 仍无 plan，说明 phase transition 路径也漏写。R15 BUG-OBS-001 同源契约缺口。|
| **BUG-182** | **P3 [FE]** | Case Detail "CURRENT STAGE" 卡片对 S1/S2 显示阶段编号 `S1` / `S2`，对 S9 显示文案 `Closed`（不显示 `S9`）。同一卡片同一字段对不同 stage 给出**不同粒度的展示**（数字 vs 文案）。 | `CaseDetailHero` 在渲染 stageCode 时对 `stage==='S9'` 走 archivedHint 分支并把 stageCode 替换为 `Closed` 文案；其他 stage 直接 fallback `row.stage` 输出 `S1/S2/S3...`。两套展示口径不一致。|
| **BUG-183** | **P3 [BE]** | 客户接口 `GET /api/customers` **不返回 `customerType` / `statusOfResidence` 顶层字段**（实测全 `undefined`），但产品规范规定客户必有 type（个人 / 法人）。R12+ 之后 BMV intake 改造把所有 fixture 都种成 individual+BMV 客户，导致这两个字段在 API response shape 中没有露出（只藏在 bmvProfile / 内嵌路径）。 | API DTO 把 `customerType / statusOfResidence` 没有 expose 到顶层，admin 也没有读这两个字段。当未来引入 corporate 客户时需要先补充 schema。|

### 0.5 总计偏差数

| 优先级 | 计数 | 摘要 |
|---|---|---|
| P0 | 1 | BUG-178（migration 039 未应用，BUG-177 在数据库层面仍未生效）|
| P1 | 1 | BUG-179（Dashboard work-item 整组 i18n 漏洞，risk 卡可见 zh-CN，todo/deadline/submission 潜伏）|
| P2 | 2 | BUG-180（customer detail vs case list status 不一致）+ BUG-181（quotePrice 与 billing-plan 写入 desync）|
| P3 | 2 | BUG-182（CURRENT STAGE 渲染粒度不一致）+ BUG-183（API DTO 未 expose customerType / statusOfResidence）|
| **本轮新增** | **6** | 全部为多客户多案件交叉走查发现 |
| **R15 land 实测** | **1/4 PASS、2/4 PARTIAL、1/4 未触发** | BUG-175 ✅、BUG-174 / BUG-OBS-001 ⚠️、BUG-176 未触发 |
| **R14 land reaffirm** | **8/9** | 全部维持原 land 标记（BUG-168 仍同 BUG-174 评价）|
| **跨轮 land reaffirm** | **1/1** | BUG-137 ✅ |

### 0.6 三句话结论

1. **R15 标 ✅ FIX-LANDED 的 BUG-175 已三语全 land、R15 P0 升级 BUG-177 的 server 代码也已 land**（`VALID_PARTY_TYPES` 加 `applicant`、`migration 039` 文件 land、admin 写入路径不变），手动 `POST /api/case-parties partyType=applicant` 已能正常返 201。**但 migration 039 未应用到数据库（schema_migrations 只到 038）**，22 条 cases × 0 条 case_parties 全部历史 + 新建案件主申请人都缺失——BUG-177 在表面 PR 已 merge，实际数据库行为仍 100% 旧态。**这是本轮唯一 P0**（BUG-178）。
2. **本轮真正高 ROI 的发现是 BUG-179**：服务端 `dashboard.service.ts` **从未切换到 i18n-aware mapper**（`dashboard.shared.ts` 是 legacy zh-CN-only，`dashboard.workItem.ts` 是已实现的 i18n-aware 但**没人用**）。当下泄漏只在 RISK CASES 卡片可见（其他三类 0 项），但 todo / deadlines / submissions 一旦有数据**整个 Dashboard 在 en-US / ja-JP 都会变中文**——属于 P1 隐性风险。修复方式极轻：把 `dashboard.service.ts:24` 的 `from "./dashboard.shared"` 改成 `from "./dashboard.workItem"`（需对比两文件签名兼容性），并删除 shared 中的 4 个 legacy mapper。
3. **BUG-180 / 181 / 182 / 183 都是多客户多案件交叉走查才能暴露的"隐性数据契约 / 状态语义"偏差**：customer detail vs case list 用两套 Active/Archived 口径（180）、cases.quotePrice 与 billing-plans 表写入 desync（181）、CURRENT STAGE 对 S1-S2 显示数字、对 S9 显示文案（182）、API DTO 未 expose customerType / statusOfResidence（183）。前两件建议立项 P2、后两件 P3 视觉/数据一致性 backlog。

---

## 1. 本轮实测的客户 / 案件矩阵

### 1.1 客户层（13 户，全 BMV，无 corporate）

| # | customerNumber | displayName | bmvProfile | 备注 |
|---|---|---|---|---|
| 1 | CUS-202605-0006 | BUG137 null bday | ✓ | R14 BUG-137 fixture |
| 2 | CUS-202605-0005 | BUG137 empty bday | ✓ | R14 BUG-137 fixture |
| 3 | CUS-202605-0004 | R14 verify probe BMV164 | ✓ | R14 验证用 |
| 4 | CUS-202605-0003 | R14 BUG-137 null birthday | ✓ | R14 fixture |
| 5 | CUS-202605-0002 | R14 BUG-137 probe empty birthday | ✓ | R14 fixture |
| 6 | CUS-202605-0001 | R14 BUG-164 probe | ✓ | R14 验证用 |
| 7 | 2d233e59-... | R12 keiei probe customer 2 | ✓ | R12 fixture，customerNumber 即 UUID |
| 8 | f5caa61e-... | R12 keiei probe customer | ✓ | 同上 |
| 9 | **CUS-202604-0005** | **R6试探客户** | ✓ | **本轮重点：11 条 case 关联** |
| 10 | **CUS-202604-0004** | **Tani Keiei Cert4M Test** | ✓ | **本轮重点：9 条 case 关联（含 family × 3）** |
| 11 | CUS-202604-0003 | BMV Signed Test | ✓ | 无 case |
| 12 | CUS-202604-0002 | BMV PreSign Test | ✓ | 无 case |
| 13 | CUS-202604-0001 | Tanaka Taro | ✓ | 无 case |

### 1.2 案件层（20 条 → API；22 条 → 数据库；差额 2 条因 admin 不可见）

| caseTypeCode | S1 | S2 | S9 | 合计 | 关联客户 |
|---|---:|---:|---:|---:|---|
| `biz_mgmt_cert_4m` | 1 | 0 | 0 | 1 | R6试探客户 |
| `biz_mgmt_4m` | 8 | 0 | 2 | 10 | R6试探客户 |
| `biz_mgmt` | 5 | 0 | 1 | 6 | Tani Keiei Cert4M Test |
| `family` | 1 | 1 | 1 | 3 | Tani Keiei Cert4M Test |

| businessPhase | 数量 |
|---|---:|
| CONSULTING | 6 |
| WAITING_PAYMENT | 6 |
| NEED_SUPPLEMENT | 1 |
| SUCCESS | 1 |
| RENEWAL_REMINDER_SCHEDULED | 1 |
| CLOSED_FAILED | 1 |
| CLOSED_SUCCESS | 4 |

### 1.3 Locale 抽样

| 视图 | en-US | zh-CN | ja-JP |
|---|---|---|---|
| Sidebar / TopBar | ✅ | ✅ | ✅ |
| Dashboard 卡片标题 | ✅ | ✅ | ✅ |
| Dashboard work-item entries（risk） | **❌ 全 zh-CN 泄漏** | ✅ | **❌ 全 zh-CN 泄漏** |
| Customers list / detail | ✅ | ✅ | ✅ |
| Cases list 三语 type label | ✅（BMV (CoE 4-month) / Business Manager Visa / Dependent Visa）| ✅（经营管理（认定4个月）/ 经营管理签 / 家族滞在）| ✅（経営管理（認定4ヶ月）/ 経営管理ビザ / 家族滞在）|
| Case Detail Overview / Documents（空态）| ✅ | ✅ | ✅ |
| Case Detail Pre-submission（空态）| ✅ | ✅ | ✅ |
| Case Detail Billing | ✅ | ✅ | ✅ |
| Tasks Reminder log（含 reminder 标题）| ✅ | ✅ | ✅ |
| Customer Detail BMV intake card | ✅ | ✅ | ✅ |

---

## 2. R15 BUG-OBS-001 → BUG-177 → R16 BUG-178 演变链路

### 2.1 时间线

```
R15 (4/29-30) BUG-OBS-001
  · 现象：admin Step 4 主链路成功，但 POST /api/case-parties partyType=applicant 返 400
  · 根因：server VALID_PARTY_TYPES = {spouse, child, guarantor, representative, other}，无 applicant
  · admin buildPrimaryCasePartyInput → partyType="applicant"
  · 结果：cases 落库 OK、case_parties 主申请人行 100% 缺失
  · 优先级：建议 P1 立项 BUG-177

R15 → R16 (5/1) PR land
  · server caseParties.types.ts 加 applicant 到 VALID_PARTY_TYPES
  · server migration 039_backfill_primary_applicant_case_parties.up.sql 落入仓库
  · admin 写入路径无变化（其代码本来就没问题）
  · PR 合并

R16 (5/1) BUG-178
  · 现象（DB 实测）：
    SELECT COUNT(*) FROM cases;             → 22
    SELECT COUNT(*) FROM case_parties;      → 0
    SELECT id FROM schema_migrations ORDER BY 1 DESC LIMIT 1; → 038_backfill_customer_bmv_profile
  · 根因：migration 039 文件存在但未应用；db:migrate 没在 PR merge 时自动执行
  · admin Step 4 自动 POST /api/case-parties 现在能返 201（手动 curl 验证），但**没人触发新建** → 数据集仍 0
  · 优先级：P0（BUG-177 在 DB 层面 100% 未生效，与"已 land"宣称矛盾）
```

### 2.2 修复入口

```bash
cd /Users/ck/workplace/cms-client/packages/server && npm run db:migrate
```

执行后预期：
- `schema_migrations` 加一行 `039_backfill_primary_applicant_case_parties`
- `case_parties` 表为所有 `cases.customer_id IS NOT NULL` 的 case 各补一行 `applicant + isPrimary=true`
- 22 条 cases 应生成 22 条 case_parties（如果全部 customer_id 不为 null）

### 2.3 防回归建议

1. server 启动入口加一道 "未应用 migrations 计数" 检查（fail-fast 或 warn）
2. CI 跑 `db:migrate` 后再跑 `assertSchemaColumnsLib` 确保 schema journal 与文件系统对齐
3. PR-template / merge-checklist 加一项 "**含 .sql 迁移的 PR 必须附 schema_migrations 截图**"

---

## 3. 关键根因（R16 必须修复）

### 3.1 [P0] BUG-178：migration 039 未应用

详见 §2。修复方法：手动 `cd packages/server && npm run db:migrate`。

### 3.2 [P1] BUG-179：Dashboard work-item 全组 i18n 漏洞

#### 3.2.1 现象（截图：`/tmp/r16-walkthrough/01-dashboard-risk-zh-leak.png`）

en-US 下 RISK CASES 卡片 3 条 entry，每条 5 段裸露 zh-CN：
- `负责人：Local Admin`（meta）
- `待收：¥80,000`（meta）
- `收费风险`（status pill）
- `待收金额 ¥80,000，需尽快跟进收费。`（desc）
- `查看收费`（action button）

#### 3.2.2 API 实测

```
GET /api/dashboard/summary?scope=mine&timeWindow=7
{
  "panels": {
    "risks": [{
      "meta": ["负责人：Local Admin", "待收：¥80,000"],   ← 全 zh-CN 字面量
      "desc": "待收金额 ¥80,000，需尽快跟进收费。",        ← 同上
      "statusLabel": "收费风险",                          ← 同上
      "action": "查看收费"                                ← 同上
      // 缺少 metaKeys / descKey / statusLabelKey / actionKey
    }]
  }
}
```

#### 3.2.3 根因

```
packages/server/src/modules/core/dashboard/
├── dashboard.service.ts                    ← 引用 mapTodoItem/mapDeadlineItem/mapSubmissionItem/mapRiskItem
│   └── from "./dashboard.shared"           ← legacy 实现，只返回 zh-CN 字面量，无 i18n key
├── dashboard.shared.ts:254/293/317/353     ← 4 个 legacy mapper（**当前生效**）
└── dashboard.workItem.ts:122/156/183/300   ← 4 个 i18n-aware mapper（**已实现但未使用**）
```

`dashboard.workItem.ts` 中的 i18n-aware 版本明显是 BUG-(168/169/170 同时期) 修复时新增的，但 `dashboard.service.ts` 没切。

#### 3.2.4 admin 端 fallback 已就位

`packages/admin/src/views/dashboard/WorkPanelSection.vue:91-100`：

```vue
<template v-if="item.metaKeys?.length">
  <span v-for="mk in item.metaKeys">{{ t("dashboard.workItem.meta." + mk.key, mk.params ?? {}) }}</span>
</template>
<template v-else>
  <span v-for="m in item.meta">{{ m }}</span>   <!-- ← 当前走这个分支 -->
</template>
```

且 admin i18n 文件 `dashboard-work-item/{en-US,zh-CN,ja-JP}.ts` 已经定义齐 `meta.{owner,unpaid,due,case,assignee} / actions.{viewCase,viewBilling,viewTask} / statusLabels.{billingRisk,validationRisk,...} / desc.risk.{unpaidAmount,validationFailed,highRiskGeneric}` 全部 key。

#### 3.2.5 修复点

只需在 `dashboard.service.ts` 把 import 源切换：

```diff
- import {
-   buildTaskScopeClause,
-   mapDeadlineItem,
-   mapRiskItem,
-   mapSubmissionItem,
-   mapTodoItem,
-   ...
- } from "./dashboard.shared";
+ import { buildTaskScopeClause, ... } from "./dashboard.shared";
+ import {
+   mapDeadlineItem,
+   mapRiskItem,
+   mapSubmissionItem,
+   mapTodoItem,
+ } from "./dashboard.workItem";
```

并对照两份 mapper 签名是否完全兼容（`DashboardWorkItem` 类型应已经允许 `statusLabelKey` 等可选 key）。修完同步删 `dashboard.shared.ts` 的 4 个 legacy mapper（防止下次有人再误 import）。

### 3.3 [P2] BUG-180 / BUG-181 / BUG-182 / BUG-183 速记

| BUG | 修复入口 |
|---|---|
| BUG-180 | `CustomerDetailCasesTab` 渲染 status 列改读 `stage === 'S9' ? 'Archived' : 'Active'`，与 cases list 对齐 |
| BUG-181 | 建案路径写入 `cases.quote_price` 后同步 `INSERT billing_plans` 一行；或者 phase transition 触发器中确保 `WAITING_PAYMENT/NEED_SUPPLEMENT` 已生成对应 plan |
| BUG-182 | `CaseDetailHero` 把 `stage==='S9' → "Closed"` 改为 `S9` + 副标题 `Closed`，统一两种 stage 的展示粒度 |
| BUG-183 | `customers.controller.ts` 顶层 DTO expose `customerType` / `statusOfResidence`；admin DTO 也读这两个字段 |

---

## 4. R15 → R16 回归得分卡（17 项）

| # | 来源 | 项 | R15 标记 | R16 实测 |
|---|---|---|---|---|
| 1 | R15 | BUG-174（CaseValidationTab.vue） | P2 已记 | ⚠️ 空态 land、含数据未触发 |
| 2 | R15 | BUG-175（reminder ja-JP 泄漏） | P3 已记 | ✅ 三语全 PASS |
| 3 | R15 | BUG-176（错误 toast 双前缀） | P3 已记 | 未触发（无失败链路）|
| 4 | R15 | BUG-OBS-001 → BUG-177（case_parties applicant） | P0→P1 | ⚠️ server land、migration 039 未跑 → BUG-178 P0 |
| 5 | R14 | BUG-165（owner UUID 对称解析） | ✅ FIX-LANDED | ✅ PASS |
| 6 | R14 | BUG-166（PG 22P02 → 400） | ✅ FIX-LANDED | ✅ PASS |
| 7 | R14 | BUG-167（CaseBillingTab i18n） | ✅ FIX-LANDED | ✅ PASS |
| 8 | R14 | BUG-168（Pre-submission tab i18n） | ⚠️ PARTIAL | ⚠️ 维持（同 BUG-174）|
| 9 | R14 | BUG-169（Documents tab 空态 i18n） | ✅ FIX-LANDED | ✅ PASS |
| 10 | R14 | BUG-170（Overview group raw slug） | ✅ FIX-LANDED | ✅ PASS |
| 11 | R14 | BUG-171（Reminder dedupe key UUID） | ✅ FIX-LANDED | ✅ PASS |
| 12 | R14 | BUG-172（cases list Type 列 Title Case） | ✅ FIX-LANDED | ✅ PASS（三语 9/9）|
| 13 | R14 | BUG-173（Step 4 失败 toast detail） | ✅ FIX-LANDED | 未触发（同 BUG-176）|
| 14 | 跨轮 | BUG-137（empty/null birthday → 201） | ✅ | ✅ PASS |

**得分**：14 项中 **9 ✅ PASS、3 ⚠️ PARTIAL、2 未触发、0 ❌ REGRESSION**。

---

## 5. 走查执行明细（chrome-devtools-mcp 操作流水）

### 5.1 走查环境快照

- admin dev：`http://localhost:5173`（vite，反代 `/api` → `:3300`）
- server：NestJS `:3300`
- DB：PostgreSQL `cms-client-postgres-1` `:5433` user=`cms` db=`cms`
- 登录态：`gyosei_os_admin_session_v1` JWT（`admin@local.test` / org `00000000-0000-4000-8000-000000000010` / userId `00000000-0000-4000-8000-000000000011`）

### 5.2 走查路径（按时序）

1. `navigate_page #/` 切 en-US 刷新 → Dashboard（发现 RISK CASES 卡片 zh-CN 泄漏 → BUG-179）
2. `navigate_page #/customers` → 实测 my customers 2 条（R6试探客户、Tani）
3. `click R6试探客户` → CustomerDetail Basic info（BMV intake card 完整 + Avatar 浏览器 native "未选择任何文件" zh-CN——OS locale 兜底，非 admin bug）
4. `click Cases tab` → 11 条 case，发现 S9 案件标 `Active` → BUG-180
5. `navigate_page #/cases` → 全局 cases list 20 条，type label 三语正确（BUG-172 reaffirm）；S9 标 `Archived`（与 §4 不一致）
6. API 直读：`GET /api/case-parties?caseId=...` 8 个抽样 case 全空 → BUG-OBS-001 reaffirm
7. `navigate_page #/cases/a63aa5f0-...` (CASE-202605-0003) → Overview / Pre-submission / Documents / Billing 各 tab 抽 cjk 残留（全空 OK）；Billing tab Total fees `—` 但 cases.quotePrice=150,000 → BUG-181
8. `navigate_page #/cases/b8bef6d9-...` (CASE-202604-0019, businessPhase=WAITING_PAYMENT) → BILLING STATUS 仍 `—` → BUG-181 reaffirm
9. `navigate_page #/cases/ea8b75b0-...` (CASE-202604-0004, S2) → 正常
10. `navigate_page #/cases/cafc4ec5-...` (CASE-202604-0001, S9 closed_success) → CURRENT STAGE 显示 `Closed` 而非 `S9` → BUG-182
11. `navigate_page #/tasks` → Reminder log 三条 BMV CASE-202604-0011 reminder（180/90/30）→ BUG-175 reaffirm；ja-JP 同样 OK
12. `navigate_page #/billing` → 3 条 plan，¥210k 总待收
13. 三语切 cases list / tasks reminder log → BUG-172 / BUG-175 三语全 PASS
14. API 直 POST `/api/case-parties partyType=applicant` → 201 OK；DELETE 清理
15. DB 直查 `schema_migrations` → 只到 038 → BUG-178

### 5.3 截图归档

- `/tmp/r16-walkthrough/01-dashboard-risk-zh-leak.png`（en-US RISK CASES zh-CN 泄漏）
- `/tmp/r16-walkthrough/02-case-detail-S1-overview.png`（CASE-202605-0003 Overview）
- `/tmp/r16-walkthrough/03-reminder-log.png`（en-US reminder log 三条 BMV）

---

## 6. 下一轮（R17）建议

1. **优先 land BUG-178 + BUG-179**（一行 import 切 + 一次 db:migrate）
2. R17 应当**故意制造含数据的 case**（人工建一个 BMV S5 案件 + manual blocker 注入），验证 BUG-174 含数据路径下 22 段中文文案是否还存在
3. R17 应当**故意触发 admin Step 4 失败链路**（手动构造 owner=`suzuki` slug），验证 BUG-176 双前缀消除
4. R17 应当**故意建一个 corporate / 非 BMV 客户**（API 直 POST），验证 BUG-183 是否扩展性 OK

---

走查方完成。
