# 客户模块（admin）— 浏览器自动化走查 Bug 清单（第二轮增量）

> 生成日期：2026-04-27
> 走查依据：`docs/gyoseishoshi_saas_md/_output/07-客户模块浏览器自动化走查Bug清单.md` § 7「仍未覆盖」
> 走查工具：`chrome-devtools-mcp` + `curl`（API 直查）
> 走查环境：`http://localhost:5173/#/`，本地 admin（`admin@local.test` / `Admin123!`），`localStorage.cms-admin-locale = en-US`（按需切换 zh-CN / ja-JP）
> 截图归档：`docs/gyoseishoshi_saas_md/_output/screens/07~15*.png`

---

## 0. 第二轮总结

### 0.1 第二轮覆盖范围

| 序号 | 主题 | 第一轮状态 | 第二轮结果 |
|------|------|-----------|-----------|
| ① | Settings → Visibility Settings | 未点开 | **FAIL — fixture 驱动，Save 不持久化** |
| ② | Settings → Local Document Root | 未点开 | **FAIL — fixture 驱动，Save 不持久化** |
| ③ | Dashboard 各 widget 真数据 / 交互 | 数据全是 0 | **FAIL — 数据全 0、按钮无效、scope 与后端不对齐** |
| ④ | zh-CN locale 反向走查 | 未做 | **FAIL — 简繁日混排、aria-label 仍日文** |
| ⑤ | ja-JP locale 反向走查 | 未做 | **FAIL — 大量中文 fixture 直接落到日文 UI 上** |
| ⑥ | CUS-AUTO-005 BMV 未签约门禁 | BLOCKED（无 BMV 样本） | **FAIL — 客户详情卡片正确，但建案向导门禁逻辑错位** |
| ⑦ | CUS-AUTO-006 BMV → 正式案件 | BLOCKED（无 BMV 样本） | **FAIL — 即使 BMV 已签约，向导仍判 4 项前提全部未满足** |
| ⑧ | 家族批量建案 | BLOCKED（依赖 `/api/cases`） | **STILL BROKEN — `POST /api/cases` 仍 400，且发送 `customerId: ""`** |

### 0.2 第二轮新增 Bug 数

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 | 5 | BMV 建案向导门禁 / 家族批量 customerId 空 / Settings 不持久化 / `/api/cases` list 全 scope 500 / `/api/admin/leads` 500 |
| P1 | 9 | i18n 中日 locale 反向回归、Dashboard scope 与 UI 不一致、广义 fixture 注入 |
| P2 | 4 | 非 UUID 客户访问 500、aria-label 重复、可访问性占位等 |
| P3 | 2 | 文案 / 时区显示 |
| **总计** | **20** | — |

### 0.3 三句话结论

1. **BMV 建案向导是“门禁假货”**：客户详情页 BMV intake 卡片显示「Ready for case creation」，但只要客户不在 `SAMPLE_CREATE_CUSTOMERS` fixture 里，建案向导就把客户合成成「只有 name + phone 的 stub」，于是 `bmvQuestionnaireStatus / bmvQuoteStatus / bmvSignStatus / bmvIntakeStatus` 全为 `undefined`，4 项前提一律判定未满足，CUS-AUTO-006 永远走不到 `Start case`。
2. **Settings 子页面与 Dashboard 都还停在 fixture/in-memory 阶段**：Visibility Settings、Local Document Root 的 Save 按钮只动 Pinia store，刷新即丢；Dashboard tab 选 “My team / All firm” 后端会 400/401，KPI 全 0，按钮全无响应。
3. **多语言反向回归暴露 i18n 大坑**：日文 locale 下 KPI 副标题、状态标签、Skip-to-content、provider 过滤项几乎一半是中文 fixture；中文 locale 下面包屑 `aria-label` 还是日文，「事務所」「フリガナ」直接落到 zh-CN 视图里。

---

## 1. P0 — 阻塞核心动线（第二轮新增）

### BUG-039 [P0][FE] BMV 建案向导前提门禁始终判 4 项未满足，无法 `Start case`

- **位置**：`packages/admin/src/views/cases/model/useCreateCasePreSignGate.ts` + `useCreateCaseModel*.ts` 中的 “synthesize primary customer from URL” 路径
- **现象**：
  1. seed 一个完全合规的 BMV 客户（`questionnaireStatus=returned` / `quoteStatus=confirmed` / `signStatus=signed` / `intakeStatus=ready_for_case_creation`）。
  2. 客户详情页 BMV intake 卡片正确显示「Ready for case creation」「Signing is complete — formal case creation is now available」「Create formal case」按钮 enabled。
  3. 点击「Create formal case」进入 `/cases/create?customerId=<uuid>&templateId=bmv&templateCode=bmv&...`。
  4. 走到 Step 4 时左侧 Pre-signing gate 面板列出 4 条 blocker —— **「Questionnaire not returned / Quote not confirmed / Contract not signed / Intake process not ready」全部判定未满足**，`Start case` 按钮被 disabled。
- **根因**：建案向导用的是 `SAMPLE_CREATE_CUSTOMERS` fixture（5 个固定客户），**任何不在 fixture 里的真实客户**都会走 “synthesize from sourceContext” 的兜底，只补 `name + contact`，`bmvQuestionnaireStatus / bmvQuoteStatus / bmvSignStatus / bmvIntakeStatus` 字段一律为 `undefined`，逐项 `!== "returned"` / `!== "confirmed"` / `!== "signed"` / `!== "ready_for_case_creation"` 判断全部命中，于是 4 个 blocker 全亮。
- **期望**：向导初始化时必须从 `/api/customers/:id` 读取真实 `bmvProfile` 注入到 `CaseCreateCustomerOption`；或仅依赖客户详情页同源数据。
- **复现**：见 `screens/15-bmv-pre-sign-gate-step4.png`，URL 与客户后端均显示 `signed`：
  ```bash
  curl -s -H "Authorization: Bearer $TOKEN" \
    'http://localhost:5173/api/customers/b193f066-e5dc-48f6-865e-5bc197faa917' \
    | python3 -m json.tool
  # bmvProfile.signStatus = "signed"
  # bmvProfile.intakeStatus = "ready_for_case_creation"
  ```
- **影响**：CUS-AUTO-006 整条主流程被堵死。所有用户新建 BMV 客户、走完三件套，到建案这一刻都会被告知「全 4 项未满足」。**这是 P1 BMV 模块发布前必须修的核心缺陷**。

### BUG-040 [P0][FE] 家族批量建案 POST `customerId: ""`，`/api/cases` 持续 400

- **位置**：`packages/admin/src/views/cases/model/useCreateCaseModelSubmit.ts` + 相关 family-bulk 写入构造器
- **现象**：BMV Signed Test 客户 → 「Batch create cases」→ Step 4 → `Start case`。前端连发 2 个 `POST /api/cases`，请求体里 **`customerId: ""`**：
  ```json
  {"customerId":"","caseTypeCode":"family","ownerUserId":"suzuki",
   "groupId":"tokyo-1","stage":"S1","dueAt":"2026-09-30",
   "caseName":"陈太太 家族滞在认定","applicationType":"认定","quotePrice":180000}
  ```
- **期望**：批量建案时每条 case 的 `customerId` 应是「该家族成员对应的 customer id」；fixture 注入的家族成员（陈太太 / 陈小宝 / 陈建国）没有真实 customer 实体，需要先 quick-create 出来再回填，或后端接受 `relatedPartyDraft` schema。
- **复现**：客户详情 → Batch create cases → Step 2 出现 fixture 家族成员 → Step 4 提交 → toast「All family bulk cases failed to create」+ 2 条 400。
- **影响**：脚本 CUS-AUTO-004 仍然 BLOCKED，且根因从「`/api/cases` 后端 500」演变为「**前端把空字符串 customerId 当合法值发过去**」，需要前端先修。

### BUG-041 [P0][API] `GET /api/cases?scope=...&view=summary` 全 scope 500

- **位置**：`packages/server/src/modules/core/cases/cases.controller.ts` `list()` / `listSummary()`
- **现象**：Cases 列表页所有 tab（My cases / My team / All admin）均触发 `Failed to load cases.`：
  ```
  GET /api/cases?scope=mine&page=1&limit=20&view=summary  → 500
  GET /api/cases?scope=group&page=1&limit=20&view=summary → 500
  GET /api/cases?scope=all&page=1&limit=20&view=summary   → 500
  ```
- **期望**：所有 scope 至少返回 `{ items: [], total: 0 }`。
- **复现**：
  ```bash
  curl -s -H "Authorization: Bearer $TOKEN" \
    'http://localhost:5173/api/cases?scope=mine&page=1&limit=20&view=summary'
  # {"statusCode":500,"message":"Internal server error"}
  ```
- **影响**：Cases 列表页完全不可用；客户详情 Cases Tab 也会因此空表。与第一轮 BUG-002 的 `customerId` 维度互为补集，本次确认是 list 主接口本身崩溃。

### BUG-042 [P0][API] `GET /api/admin/leads?scope=mine` 500

- **位置**：`packages/server/src/modules/portal/leads/...`
- **现象**：进入 Leads & chats 页面时立即触发：
  ```
  GET /api/admin/leads?scope=mine&page=1&limit=20 → 500
  ```
- **期望**：与 customers list 一致返回 200 + 列表（即使空）。
- **影响**：Leads 页能渲染只是因为前端 fallback 到 fixture（李娜 / 张伟 / 铃木 / 田中等中文 fixture 全是这条 500 的副作用）。第一轮 BUG-003 把锅按在 401，本轮抓到的是 500，需要 server 侧重新审视该路由的 guard / data layer。

### BUG-043 [P0][FE] Settings → Visibility Settings / Local Document Root「Save」不持久化（纯前端 in-memory）

- **位置**：`packages/admin/src/shared/model/useOrgSettings.ts`（Pinia store）+ `packages/admin/src/views/settings/fixtures.ts`
- **现象**：
  1. `/settings` → 点击 “Visibility Settings” → 切换任意开关 → Save → 提示成功。
  2. 全页刷新（Cmd+R）后，开关回到默认状态；浏览器 Network 面板未观察到任何写入请求。
  3. 同样行为在 “Local Document Root” 子页面复现。
- **根因**：`useOrgSettings` 是纯 Pinia 内存 store，没有任何 `/api/...` 写回；可见项 / 存储根全部读取 `settings/fixtures.ts`。
- **期望**：必须通过后端 API 持久化（建议沿用 `feature-flags` upsert 类似的 schema）；或在产品上明确「这俩页面是 P2 阶段功能未上线」，并在 UI 顶部加 **disabled / coming soon 横幅**，而不是给一个看似可用的 Save 按钮。
- **影响**：管理员实际配置的可见项 / 存储根都无法生效，是隐性数据丢失。

---

## 2. P1 — i18n 反向回归（第二轮新增）

### BUG-044 [P1][i18n] zh-CN locale：面包屑 `aria-label="パンくずリスト"` 仍是日文

- **现象**：切换到「简体中文」后，`<nav aria-label>` 仍输出 `パンくずリスト`，被屏幕阅读器读成日文。
- **位置**：通用 Breadcrumb 容器组件，`aria-label` 写死或 fallback 到 ja。
- **影响**：可访问性 + 多语言一致性双重违反；本现象在 en-US 下也存在（第一轮 BUG-007）。

### BUG-045 [P1][i18n] zh-CN locale：客户详情仍出现「事務所 / フリガナ」等日文/繁体字段

- **现象**：在 `cms-admin-locale=zh-CN` 时，客户详情顶部 KPI 与字段出现「事務所」「フリガナ」「東京一組」等日文/繁体字符；Group 选项列表用「東京一組／東京二組」而非「东京一组／东京二组」。
- **影响**：中文用户看到日文/繁体词汇，与产品定位（中文行政书士事务所）违和。

### BUG-046 [P1][i18n] ja-JP locale：Skip-to-content 链接显示中文「跳到内容」

- **现象**：日文 locale 下顶部隐藏 skip link 仍是中文：
  ```
  <a class="skip-link">跳到内容</a>
  ```
- **位置**：`shared/ui` 顶层 layout，硬编码 zh 文案。

### BUG-047 [P1][i18n] ja-JP locale：Document Center KPI 卡片中日混排

- **现象**：日文 locale 下 KPI 卡片显示形如 “審査待ち / 3 / 待审核”、“合格 / 12 / 已通过”，副标题完全是中文。
- **截图**：`screens/11-documents-ja-locale-mixed.png`
- **影响**：用户视角是“一半界面没翻”。

### BUG-048 [P1][i18n] ja-JP locale：Document Center 状态过滤、provider 过滤、表格徽章全部中文

- **现象**：状态下拉「待审核 / 已通过 / 已拒绝」、provider「税务局 / 区役所」、表格中状态 badge 仍是中文 fixture 文案。

### BUG-049 [P1][i18n] ja-JP & zh-CN locale：Leads 列表 follow-up note 与相对时间标签是中文

- **现象**：跟进备注、时间显示「今天 / 昨天 / 3 天前」，无视当前 locale；与 BUG-027 同源（fixture 没分语言版本）。

### BUG-050 [P1][i18n] DatePicker 在 en-US / zh-CN / ja-JP 下都是中文

- **现象**：建案向导 Step 3「Due date」：
  - 占位提示「年 / 月 / 日」、按钮 `aria-label="显示日期选择器" / "显示月份选择面板" / "显示上一个月"`、日历表头「日 一 二 三 四 五 六」、底部按钮「清除 / 今天」。
  - 三种 locale 表现一致 → 日历控件的 i18n 完全没有接入应用 locale。
- **位置**：Arco Design DatePicker 默认 zh-CN locale，需要在应用级注入 `ConfigProvider locale` 切换。

### BUG-051 [P1][i18n] Owner / Group 选项混用拼音 + 日文人名

- **现象**：Cases / Leads / 建案向导里：
  - Owner 下拉是拼音「Suzuki / Tanaka / Li / Sato」
  - 客户详情 Owner 下拉又是日文「山田翔太 / 高橋健太 / 鈴木あかり」
  - Leads 列表 Owner 列同时出现「Suzuki」与「铃木 / 田中 / 佐藤 / 张伟」
- **影响**：同一组人在不同入口被取了 4 套不同名字，无法做用户级别的关联。

### BUG-052 [P1][FE] 顶部 Global search 不可用

- **现象**：顶部搜索框接受输入，按下 ⌘K / 回车均无下拉、无跳转、无 fetch 请求。
- **期望**：要么连接到搜索 API，要么在功能未做时去掉这个搜索框（或显式标 “Coming soon”）。

---

## 3. P1 — Dashboard 真数据回归

### BUG-053 [P1][API/UX] Dashboard tab 与后端 scope 列表错位

- **现象**：
  - UI tab：`Mine / My team / All firm`。
  - API 实际接受的 scope（实测）：`mine` 200，`group` 200，`all` 200；其他（`team / my-team / all-firm / firm`）400 “Invalid scope”，部分返回 401。
- **后果**：UI tab `My team` 切换会触发 400，前端只是显示 `0`，看起来像“没数据”，实际是 scope 字符串拼错。
- **修复建议**：统一前端 scope 字典 + 在 `dashboard.controller.ts` 用 enum 强校验后给出 4xx 而非 5xx，并把 i18n 文案改成与 scope 对齐的「Mine / My group / All firm」。

### BUG-054 [P1][UX] Dashboard 行动按钮 “View due soon / Go to submit / Fix risk items / Chase due items / Create customer” 完全无响应

- **现象**：Dashboard widget 上的 5 个行动按钮全部不触发任何路由变化、不发请求，控制台无报错；`Create customer` 在 admin 视角始终 disabled。
- **影响**：dashboard 是入口页，按钮失效会让用户怀疑系统没活；至少应能跳到对应列表 + 预设过滤参数。

### BUG-055 [P1][UX] Dashboard “Create lead” 跳到 `/leads` 列表，没有打开新建 lead 对话框

- **现象**：点击 dashboard “Create lead” 按钮，路由跳转到 `/#/leads`，需要再点 “New Lead” 才打开 modal。
- **期望**：从 dashboard 进入应当直接以模态打开新建表单，与 customers 模块的 `Quick-create customer` 一致。

---

## 4. P2 / P3 — 体验与小瑕疵

### BUG-056 [P2][API] 非 UUID 客户 ID 仍 500（与 BUG-001 同根但路径不同）

- **现象**：`/api/customers/d28b5dae`（截断 8 位）返回 500 而非 400/404。
- **位置**：customer GET 路由没有 `ParseUUIDPipe`。

### BUG-057 [P2][a11y] 客户详情页 “Date of birth” 三个 spinbutton 的 `aria-label` 重复 “年 年 / 月 月 / 日 日”

- **现象**：原始 label 与 unit 重复拼接，screen reader 会读成「年 年」。

### BUG-058 [P2][UX] 顶栏全局 “New case” 按钮始终 disabled，与各页面内的 “New case” 按钮（enabled）行为不一致

- **现象**：顶栏 `New case` 一直 disabled（疑似在等待某个 context 但实际逻辑未实现）；进入 Cases 页时本地 `New case` 按钮可用。
- **建议**：要么按 router 上下文动态启用，要么干脆移除全局按钮。

### BUG-059 [P2][i18n] 客户详情 “Avatar” 文件选择按钮在 en-US / zh-CN / ja-JP 下都显示「未选择任何文件」

- **现象**：原生 `<input type="file">` 文本由浏览器 locale 决定，但 admin 这里强制 zh-CN，导致英文 / 日文 UI 下出现中文。
- **修复建议**：用自定义按钮包裹文件输入。

### BUG-060 [P3][UX] BMV 客户详情卡 “Quote confirmed / Signed at” 时间戳为 UTC 但无时区指示

- **现象**：`2026-04-27 06:07`（UTC）展示在英文/日文 UI 上，相对 JST 偏 9 小时；卡片旁边没有 `(UTC)` 后缀或 `JST` 标记。

### BUG-061 [P3][UX] BMV 建案向导即便所有 4 前提满足、URL 已带 `templateCode=bmv`，Step 1 顶部仍恒显示「Prerequisites not met」徽章

- **现象**：哪怕用户切到 Step 4 时 gate 真的会通过，Step 1/2/3 整段流程都被这条警告条 “唱衰”，与最终判定脱节。
- **修复**：徽章应该在 gate 检查通过时即时移除，而不是只看「templateId === 'bmv'」。

---

## 5. 复现资产

### 5.1 测试 BMV 客户

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# 启用 bmv flag
curl -s -X POST http://localhost:5173/api/feature-flags \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"key":"bmv","enabled":true,"role":"manager"}'

# 创建 pre-sign 客户
curl -s -X POST http://localhost:5173/api/customers \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"individual","baseProfile":{"name_jp":"BMV プレサイン","name_en":"BMV PreSign Test","phone":"08099991111","email":"bmv.presign@example.com","bmvProfile":{"questionnaireStatus":"returned","quoteStatus":"confirmed","signStatus":"pending","intakeStatus":"sign_pending"}},"contacts":[]}'
```

走完上面 3 步后，`/customers` 列表会出现「BMV PreSign Test」「BMV Signed Test」两条客户，可直接复现 BUG-039 / 040 / 061。

### 5.2 直接打开 BMV 建案向导（已签约）

```
http://localhost:5173/#/cases/create?customerId=<uuid>&templateId=bmv&templateCode=bmv&customerName=BMV+Signed+Test&customerContact=08099992222+/+bmv.signed@example.com
```

走到 Step 4 即可看到 4 项 blocker 全亮。

### 5.3 Cases 列表 / Leads 列表 5xx 复现

```bash
curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:5173/api/cases?scope=mine&page=1&limit=20&view=summary'
curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:5173/api/cases?scope=all&page=1&limit=20&view=summary'
curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:5173/api/admin/leads?scope=mine&page=1&limit=20'
# 三条全部 {"statusCode":500,"message":"Internal server error"}
```

---

## 6. 与第一轮的关系

| 第一轮 | 第二轮新增 | 备注 |
|--------|-----------|------|
| BUG-002 `/api/cases?customerId=...&view=summary` 500 | **BUG-041** `GET /api/cases?scope=...&view=summary` 全 scope 500 | list 主接口本身崩溃，比 customer 维度更早失败 |
| BUG-003 `/api/leads` 401 | **BUG-042** `/api/admin/leads?scope=mine` 500 | 实际是 server 5xx 而非 401，需要按 5xx 排查 |
| BUG-007 ~ 016 i18n 大面积泄漏（en-US） | **BUG-044 ~ 051** zh-CN / ja-JP 反向回归 | 三种 locale 都各自有泄漏，证明 fixture 与 i18n message 字典脱节是结构性问题 |
| BUG-019 Dashboard 全 0 | **BUG-053 / 054 / 055** Dashboard scope / 行动按钮 / Create lead | 不是 KPI 数据空，是 Dashboard 整体 wiring 没接 |
| 未覆盖：BMV 流程 | **BUG-039 / 040 / 061** | BMV 流程从 BLOCKED 转为 FAIL，根因落到前端 fixture 与门禁分离 |
| 未覆盖：Settings 子页 | **BUG-043** | 子页 Save 按钮全是假 |

---

## 7. 仍未覆盖（建议下一轮走查）

- **BMV 客户 — 取消签约 / 报价更新等回退路径**：本轮只 happy path 跑到 signed，未测「signed 后被打回」的状态机回退是否同步刷新建案门禁。
- **Tasks & reminders 模块的列表 / 详情**：本轮主流程没回到 Tasks 模块，需要在 fix `/api/cases` 后再次走查依赖任务派生链路。
- **Conversations / Billing 详情页**：列表已确认 fixture，但详情未点开。
- **审计日志（Activity log）异常时间戳**：第一轮提到 “畸形时间戳”，本轮未深入验证根因（疑为 ISO 与 zh-CN locale fmt 冲突）。
- **修复 BUG-039 后的 BMV 建案 happy path 端到端**：当前向导永远到不了 `Start case`，需要先修复才能完整跑 CUS-AUTO-006。
- **多 admin 用户 / 多 group 的可见性**：当前只用一个 admin 跑，看不到 group 隔离是否真的生效。

---

## 附录 A — 第二轮新增截图

| 文件 | 描述 |
|------|------|
| `screens/07-settings-visibility.png` | Settings → Visibility Settings 子页面（Save 按钮假阳性） |
| `screens/08-settings-local-doc-root.png` | Settings → Local Document Root 子页面（fixture 驱动） |
| `screens/09-dashboard-mine.png` | Dashboard My tab，KPI 全 0 / Create customer disabled |
| `screens/10-case-create-step2-cn.png` | 建案向导 Step 2，主申/家族/事务所文档全是中文 fixture |
| `screens/11-documents-ja-locale-mixed.png` | Document Center 在 ja-JP locale 下中日混排 |
| `screens/12-bmv-pre-sign-gate.png` | BMV PreSign 客户详情，Start case disabled / Record signing enabled |
| `screens/13-bmv-create-case-step1.png` | BMV 建案向导 Step 1，三个模板都 disabled，Prerequisites not met 徽章 |
| `screens/14-bmv-create-case-step3.png` | Step 3 中文 DatePicker 全套（en-US locale 下） |
| `screens/15-bmv-pre-sign-gate-step4.png` | Step 4 Pre-signing gate 4 项 blocker 全亮（即使后端已 signed） |

---

