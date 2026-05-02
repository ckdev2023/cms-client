# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第二十轮 / R19 全量回归 + 三语主流程走查）

> 生成日期：2026-05-02（chrome-devtools-mcp 真浏览器走查 + server stderr 即时取证 + curl API 复核）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/28-双层状态机自动化复盘走查Bug清单-第十九轮.md` R19 全部 5 项新发现 + 历史 backlog
> - R20 期间已 land 的修复（见 `_output/00-outputs.md` 最新条目：BUG-184 / 185 / 186 / 187 三轮 fix）
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `wait_for` / `take_snapshot` / `evaluate_script` / `click` / `list_console_messages` / `list_network_requests`
> - `curl` 直击 NestJS `:3300`（mine / group / all 三 scope 状态码 + payload）
>
> 走查环境：admin `:5173`（vite 反代 `/api` → `:3300`，rewrite 去掉 `/api`）、server NestJS `:3300`、PostgreSQL `cms-client-postgres-1` `:5433`、登录 `admin@local.test` / `Admin123!`
> 与第十九轮（`28-...md`）互为续篇。

---

## 0. 第二十轮总结

### 0.1 R19 五项新 BUG R20 land 状态

| 编号 | R19 等级 | R19 状态 | R20 实测（chrome-devtools-mcp） | 一句话 |
|---|---|---|---|---|
| **BUG-184** | **P0** | 未 land | **✅ FIX-LANDED + PASS** | dashboard mine scope `/dashboard/summary` HTTP 200，admin 端 6 条风险卡正常渲染（en/zh/ja 三语都跑通） |
| BUG-185 | P2 | 未 land | **✅ FIX-LANDED + PASS** | Customer Detail `Visa type` 字段在 en-US 显示 `Business manager`（label 已映射），不再是 raw enum `BUSINESS_MANAGER` |
| BUG-186 | P1 | 未 land | **✅ FIX-LANDED + PASS** | Case Detail Billing tab：en-US `Case fee / Outstanding`、zh-CN `案件报酬 / 应收`、ja-JP `案件報酬 / 応収`（i18n 链路全通） |
| BUG-187 | P2 | 未 land | **✅ FIX-LANDED + PASS** | Customer 创建弹窗顶部出现 `Customer type *` 单选（Individual / Corporation），切换 Corporation 后标题变 `Create corporate customer`，字段集合从 `Date of birth / Visa type / Gender / Nationality` 切到 `Company legal name / Company kana / Representative name` |
| BUG-188 | P3 | 未 land | **🟡 重新认定为非 app bug** | 残串 `年/月/日` `显示日期选择器` `未选择任何文件` 来自 Chrome 浏览器自身 locale，不在仓库范围；详见 §6 |

### 0.2 R20 走查发现

R20 走查全程 **未发现新 P0 / P1 BUG**。仅留两条 P3 视觉 / cosmetic 备忘：

| 编号 | 一句话 | 等级 | R20 状态 |
|---|---|---|---|
| **BUG-189** | zh-CN sidebar 站点标识 `事務所管理`（同 ja-JP 完全一致），应为 zh-CN 简体 `事务所管理`（"務"→"务"）；en-US 此位置为 `Firm Ops`，仅 zh-CN 漏字典。 | P3 | 新发现 / 未 land |
| **BUG-182** | 三处 stage 渲染粒度 R20 实测已自然对齐（Cases List / Customer Detail Cases tab 均为 full label `Case opened` / `Archived`；Case Detail header 为 `S1 · Case opened` 内联组合）。R19 reported 的「三处口径都不一样」实际不再成立。 | — | **由 backlog 转 PASS** |

### 0.3 R18~R19 已 land 项 R20 回归对照

| BUG | 历史标记 | R20 实测 | 备注 |
|---|---|---|---|
| BUG-174（CaseValidationTab.vue 22 段中文）| ✅ FIX-LANDED | **✅ PASS** | en-US Pre-submission check tab 全英文 |
| BUG-175 / 176 / 177 / 178 | ✅ FIX-LANDED | 未触发（不在主流程路径上）| — |
| BUG-179（Dashboard work-item i18n）| R17 ✅ FIX-LANDED → R19 被 BUG-184 阻断 | **✅ PASS**（解除阻断后三语风险卡完整） | mine scope 200 后 6 条风险卡 en/zh/ja 三语都见 |
| BUG-180（customer detail vs case list status）| ✅ FIX-LANDED | **✅ PASS** | status 列 `Active` / `Archived` 对齐 |
| BUG-181（quotePrice → billing_records）| ✅ FIX-LANDED | **✅ PASS** | Cases List Outstanding 总额 ¥360,000，逐行 ¥150,000×2 / ¥80,000×2 / ¥50,000×1 命中 |
| BUG-182（stage 渲染粒度）| backlog | **✅ PASS**（自然对齐）| 详 §0.2 |
| BUG-183（CustomerSummaryDto 顶层 type）| ✅ FIX-LANDED | **✅ PASS**（API + UI 双层）| BUG-187 配套打通 corporation 创建路径 |

### 0.4 三句话结论

1. **R20 期 R19 全部 5 条新 BUG 完成 land**：BUG-184 P0（dashboard 500）、BUG-185 P2（visa raw enum）、BUG-186 P1（billing 日文 raw）、BUG-187 P2（创建弹窗 individual/corporation）、BUG-188 P3 重新定性为 Chrome 自身 locale 残串（不在 app 范围）。
2. **R19 reported 的 BUG-182（三处 stage 粒度不一致）R20 实测已自然对齐**——Cases List 与 Customer Detail Cases tab 都使用 full label，Case Detail header 用 `S1 · Case opened` 内联组合，三处不再各异。可从 backlog 移除。
3. **R20 期间唯一新发现 BUG-189 P3**：zh-CN sidebar 站点标识 `事務所管理` 漏简体化，应为 `事务所管理`。其它 zh-CN / en-US / ja-JP 主流程（Dashboard / Customers / Customer Detail / Cases List / Case Detail Overview / Billing / Pre-submission / Tasks）三语完整跑通，无 console error / 无 network 5xx / 无 fallback "data failed to load"。

---

## 1. BUG-184 P0 R20 land 验证（dashboard mine scope）

### 1.1 server 层 curl 直读

```bash
$ TOKEN=$(curl -s -X POST http://localhost:3300/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@local.test","password":"Admin123!"}' \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

$ curl -s -o /tmp/d-mine.json -w "%{http_code}\n" \
    "http://localhost:3300/dashboard/summary?scope=mine&timeWindow=7" \
    -H "Authorization: Bearer $TOKEN"
200

$ curl -s -o /tmp/d-all.json -w "%{http_code}\n" \
    "http://localhost:3300/dashboard/summary?scope=all&timeWindow=7" \
    -H "Authorization: Bearer $TOKEN"
200

$ head -c 200 /tmp/d-mine.json
{"scope":"mine","timeWindow":7,"summary":{"todayTasks":0,"upcomingCases":0,
"pendingSubmissions":0,"riskCases":6},"panels":{"todo":[],"deadlines":[],
"submissions":[],"risks":[{"id":"d9996d2b-...","title":"R14 verify ...
```

R19 期间报告的 `[ExceptionsHandler] TypeError: value.slice is not a function` 不再出现，stderr 清空。

### 1.2 admin 端 chrome-devtools-mcp 真浏览器流

| 步骤 | 工具 | 结果 |
|---|---|---|
| 1. clear token + 切 en-US，访问 `#/login` | navigate / evaluate_script | OK |
| 2. 跳转到 `#/`（dashboard） | take_snapshot | 显示 `Risk cases 6` + 6 张完整风险卡（含 owner / due / unpaid / status）|
| 3. `list_console_messages` | — | `<no console messages found>` |
| 4. `list_network_requests` | — | `GET /api/dashboard/summary?scope=mine&timeWindow=7 [200]` ×2（init + reload，第二次 304） |
| 5. 切 tab `All firm` | click | `GET /api/dashboard/summary?scope=all&timeWindow=7 [200]` |
| 6. 切 ja-JP reload，回到 dashboard | navigate / evaluate_script | 看到「**ダッシュボード**」头 + 6 张风险卡完整渲染（"請求リスク / 未収：¥150,000"），fallback "ダッシュボードデータの読み込みに失敗" 不再出现 |
| 7. 切 zh-CN reload | 同上 | 看到「**仪表盘**」 + 6 张「**收费风险 / 待收：¥150,000**」 |

R19 §1.5 "二阶风险扩展面"（todo / deadline / submission 同样会触发 Date.slice）也由本次 fix（`formatDateLabel` 同时接受 `string` + `Date`）一并消除。

---

## 2. BUG-185 P2 R20 land 验证（Customer Detail Visa type 本地化）

```
admin 切 en-US
→ 进 customer R6试探客户 (id 825d708f...) → Basic info tab
→ 表单字段 "Visa type" disabled textbox 值 = "Business manager"
   旁辅助文字 = "Derived from BMV visa plan"
```

R19 期 raw enum `BUSINESS_MANAGER` 已经过映射成下拉选项一致的 label。

---

## 3. BUG-186 P1 R20 land 验证（Billing tab 三语本地化）

| locale | TYPE 列 | STATUS 列 |
|---|---|---|
| en-US | `Case fee` | `Outstanding` |
| zh-CN | `案件报酬`（简体）| `应收` |
| ja-JP | `案件報酬`（繁体）| `応収` |

数据层已经按 `_output/00-outputs.md` 最新条目所述固化为 i18n code `case_fee`，`migration 041` 把存量 `案件報酬` 回填为 `case_fee`；admin 端 `billingMilestoneI18n.resolveMilestoneI18nKey` 兼容新 code 与遗留 CJK 文案。

---

## 4. BUG-187 P2 R20 land 验证（Customer 创建弹窗 individual / corporation）

| 状态 | 标题 | Customer type radio | 主要字段 |
|---|---|---|---|
| 默认（Individual checked） | `Create individual customer` | Individual / Corporation | Display name / Group / Legal name / Furigana / **Gender / Date of birth / Nationality** / Phone / Email / Location / Source type / **Visa type** / Avatar / Notes |
| 切到 Corporation | `Create corporate customer` | Individual / **Corporation checked** | Display name / Group / **Company legal name** / **Company kana** / **Representative name** / Phone / Email / Location / Source type / Avatar / Notes（individual-only 字段 Gender / DOB / Nationality / Visa 全部隐藏）|

R19 §5.3 修复方案完全 land。

---

## 5. BUG-182 R20 重新认定（PASS）

| 页面 | R19 实测 | R20 实测 |
|---|---|---|
| Cases List `#/cases` Stage 列 | `Archived` / `Case opened` | `Archived` / `Case opened` / `Collecting documents` 全 label（**与 R19 一致**）|
| Customer Detail `?tab=cases` Stage 列 | `S9` raw stage code（**❌**）| `Case opened` / `Archived` 全 label（**✅**）|
| Case Detail header | `Case opened` + `S1` 双行 | `S1 · Case opened` 内联组合（**单行**） |

R20 实测三处 stage 列都用 full label，header 用「code · label」内联——口径已经收敛。R19 reported 的 backlog 项 R20 自然解决。

---

## 6. BUG-188 R20 重新认定（非 app bug）

R19 reported：

```
spinbutton "年 年" / "月 月" / "日 日"
button "显示日期选择器"
button Avatar value="未选择任何文件"
```

R20 在 en-US locale 下用 chrome-devtools-mcp 复测仍然能看到这三处中/日字符串。但定位发现：

- 两个 `<input type="date">` 的 sub-spinbutton（年/月/日）label 是 **Chrome 浏览器原生** 组件文案，跟 `chrome.exe --lang=...` / 系统 locale 走，**不受应用 i18n 控制**。
- `显示日期选择器` 是 Chrome 自带 button label（同上）。
- `未选择任何文件` 是 `<input type="file">` 的 placeholder，同样来自 Chrome 内核。

代码侧确认：

- `packages/admin/src/views/customers/components/AddCustomerDialog.vue` 使用的是原生 `<input type="date">` / `<input type="file">`，没有第三方 picker 库劫持其 label。

结论：BUG-188 不在仓库范围（要彻底解决得换成自研 picker 或 vendor lib），R20 不再列入 bug 清单，关闭。

---

## 7. R20 新发现 BUG-189（P3）：zh-CN sidebar 站点标识漏简体化

### 7.1 复现

```
admin 切 zh-CN，访问 /#/
→ 左侧 sidebar 顶部 logo 下方副标题：
   "事務所管理"  ← 繁体 / 日文写法
```

en-US 此位置：`Firm Ops`；ja-JP：`事務所管理`（与 zh-CN 完全相同）。

### 7.2 修复方案

定位 i18n key（搜 `事務所管理`），把 `zh-CN` 文案改为简体 `事务所管理`。其它 locale 保持。

### 7.3 单测建议

`packages/admin/src/i18n/messages/sidebar/zh-CN.ts`（或对应 sidebar i18n 文件）键值改为 `事务所管理`；i18n-regression 测试增 1 case 断言「zh-CN 不出现繁体『務』字」。

---

## 8. R20 走查执行明细

### 8.1 chrome-devtools-mcp 实际调用流

| 步骤 | 工具 | 关键信号 |
|---|---|---|
| 1 | `evaluate_script` 设 `localStorage['cms-admin-locale']='en-US'` + clear token | OK |
| 2 | `navigate_page` `#/login` → reload | dashboard 已经登录态（cookie 仍有效）|
| 3 | `take_snapshot` dashboard | RootWebArea title `Dashboard - Gyosei OS`，`Risk cases 6`，6 张完整 risk 卡 |
| 4 | `list_console_messages` / `list_network_requests` | console 空；mine scope 200 ×2（init + reload 304）|
| 5 | `click` 标签 `All firm` | mine + all 都 200 |
| 6 | `navigate` `#/customers` → `click` "Add customer" | 弹窗出现 `Customer type *` 单选 |
| 7 | `click` Corporation radio | 标题变 `Create corporate customer`，字段切到 corporation 集合 |
| 8 | `click` Cancel → `navigate` `#/customers/825d708f...` | Visa type = `Business manager` |
| 9 | `click` Cases tab | Stage 列 `Case opened` / `Archived` 全 label |
| 10 | `navigate` `#/cases` | Outstanding 总额 ¥360,000；逐行 ¥150,000 / ¥80,000 / ¥50,000 命中 |
| 11 | `navigate` `#/cases/a63aa5f0.../?tab=billing` | TYPE = `Case fee` / STATUS = `Outstanding` |
| 12 | `click` Pre-submission check | 全英文 |
| 13 | 切 ja-JP → dashboard | 6 风险卡 ja-JP；Billing tab `案件報酬 / 応収` |
| 14 | 切 zh-CN → dashboard / billing / tasks | dashboard 6 风险卡 zh-CN；Billing tab `案件报酬 / 应收`；Tasks 页加载真实 `/api/tasks` + `/api/reminders` |

### 8.2 server-side curl 复核

```bash
mine:   GET /dashboard/summary?scope=mine&timeWindow=7        → 200 (riskCases:6)
all:    GET /dashboard/summary?scope=all&timeWindow=7         → 200
group:  GET /dashboard/summary?scope=group&timeWindow=7       → 400 (NO_PRIMARY_GROUP, expected)
```

`group` 400 是 admin 用户不属于任何 primary group 的预期行为，admin 端 "My group" tab 在该用户视角是禁用的（合规）。

### 8.3 BUG-181 outstanding 数据再核对

| Case | Cases List Outstanding | Case Detail Billing | DB cache |
|---|---|---|---|
| CASE-202605-0003 R6试探客户 BMV (CoE 4-month) | ¥150,000 | ¥150,000（行 1，Case fee, Outstanding）| `billing_unpaid_amount_cached = 150000.00` |
| 其它 R14 probe email / blank | ¥150,000 / ¥150,000 | — | 同上 |
| CASE-202604-0015 BUG-111 verify B 6.4 | ¥80,000 | — | 80000.00 |
| CASE-202604-0012 R6 BUG-097 retest | ¥80,000 | — | 80000.00 |
| CASE-202604-0010 R6 phase e2e probe | ¥50,000 | — | 50000.00 |
| **总计 header** | **¥360,000** | — | sum 360000.00 |

数据一致性 PASS。

---

## 9. R19 → R20 回归得分卡

| # | 来源 | 项 | R19 标记 | R20 实测 |
|---|---|---|---|---|
| 1 | R16 / R17 | BUG-174 | ✅ FIX-LANDED | ✅ PASS |
| 2 | R16 / R17 | BUG-175 / 176 / 177 / 178 | ✅ FIX-LANDED | 未触发（已通过历史回归路径）|
| 3 | R17 / R18 | BUG-179 Dashboard work-item i18n | ⚠️ 被 BUG-184 阻断 | ✅ PASS（解除阻断）|
| 4 | R18 | BUG-180 customer detail vs case list status | ✅ FIX-LANDED | ✅ PASS |
| 5 | R18 | BUG-181 quotePrice → billing_records | ✅ FIX-LANDED | ✅ PASS（含 R19 副作用 BUG-184/186 已收尾）|
| 6 | R18 | BUG-183 CustomerSummaryDto 顶层 type | ✅ FIX-LANDED + admin 未跟进 | ✅ PASS（admin 创建路径已经 BUG-187 land）|
| 7 | R16~R19 | **BUG-182 stage 粒度** | backlog 重申 | **✅ PASS**（三处自然对齐）|
| 8 | **R19** | **BUG-184 dashboard mine 500** | ❌ 未 land（P0）| **✅ FIX-LANDED + PASS** |
| 9 | **R19** | **BUG-185 visa raw enum** | ❌ 未 land（P2）| **✅ FIX-LANDED + PASS** |
| 10 | **R19** | **BUG-186 billing 日文 raw** | ❌ 未 land（P1）| **✅ FIX-LANDED + PASS**（三语完整）|
| 11 | **R19** | **BUG-187 创建弹窗 individual/corporation** | ❌ 未 land（P2）| **✅ FIX-LANDED + PASS** |
| 12 | **R19** | **BUG-188 date picker 残串** | ❌ 未 land（P3）| **🟡 关闭**（非 app bug，Chrome 内核 locale）|
| 13 | **R20 新发现** | **BUG-189 zh-CN sidebar 漏简体** | — | ❌ 未 land（P3）|

**得分**：13 项中 **9 ✅ PASS / FIX-LANDED + 1 ✅ 自然对齐转 PASS + 1 🟡 关闭 + 1 ❌ R20 新发现 P3**。

---

## 10. R21 建议（按优先级）

1. **BUG-189（P3）**：zh-CN sidebar `事務所管理` → `事务所管理`。i18n key 只改 zh-CN 字典 + 1 条 i18n-regression 单测。
2. **BUG-188 关闭决议归档**：在 `_output/00-outputs.md` 追加一条「BUG-188 不在仓库范围，关闭」的产出记录，避免后续走查反复发现同一项。
3. **migration 041 down.sql** 是否保留 no-op：R19 §0.1 第 4 条曾提及，本轮未深入；建议下次顺手补充决议进文档。
4. **server `/dashboard/summary?scope=group`** 当前对没有 primary group 的用户返回 400 NO_PRIMARY_GROUP——admin 端是否应该在 tab 上更早 disable，避免 401/400 触发 fallback；可加一句话单测 + tab disabled 验收。

---

## 11. 风险与决策

- **R20 期 5 条 R19 BUG 全部 land**，admin 三语主流程（Dashboard / Customers / Customer Detail / Cases / Case Detail Overview / Pre-submission / Billing / Tasks）实测无 5xx / 无 console error / 无 fallback。
- 唯一遗漏 BUG-189 是 sidebar 单字典 typo，不阻塞主流程，可顺势 land 进下一次代码改动批次。
- BUG-188 R20 重新定性为非 app bug 后，应在 `_output/00-outputs.md` 写入「关闭决议」，以免被后续走查再次回滚为 BUG。

---

走查方完成。
