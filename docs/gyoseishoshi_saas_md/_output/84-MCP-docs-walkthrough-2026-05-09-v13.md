# 84 — 资料清单 UI 字体回归走查（2026-05-09 第十三轮 / chrome-devtools-mcp）

> 日期：2026-05-09（第十三轮 / 字体 + 标点本地化聚焦）
>
> 走查对象：CASE-202605-0012 / id=`b891a765-ecf2-49e7-8d27-ce43b65a5859`（家族滞在 / dependent_visa）
>
> 截图目录：`tmp/walkthrough-2026-05-09-v13-docs-fonts/`
>
> 上游权威：
>
> - [83-MCP-docs-walkthrough-2026-05-09-v12.md](./83-MCP-docs-walkthrough-2026-05-09-v12.md)（V12 provider 角色 i18n 单一权威表述）
> - [82-MCP-docs-walkthrough-2026-05-09-v11.md](./82-MCP-docs-walkthrough-2026-05-09-v11.md)（V11 写后回流契约）
>
> 走查后端服务状态：server 3300 / admin 5173 / worker 在线。

---

## 0. 总结

第十二轮 V12 修了「provider 角色 i18n 双 namespace 字面值同义」。本轮 V13 聚焦**资料清单 / 文书 Tab 的 UI 字体（CJK 字形定位）与标点本地化**，发现 **2 条 P1** 并**端到端修复并三语回归**：

| ID | 现象 | 优先级 | 处理 |
|---|---|---|---|
| NEW-V13-1 | **日文模板名渲染为中文字形（kanji glyph locality 错配）**：所有 9 个 Japanese 模板名（`在留カードコピー / パスポートコピー / 婚姻証明書（戸籍謄本） / 証明写真（4cm×3cm） / 申請理由書 / 在留資格認定/変更許可申請書 / 扶養者の在職証明書 / 身元保証書 / 扶養者の納税証明書 / 扶養者の在留カードコピー`）以及文书 Tab 模板卡内的 `申請理由書 / 身元保証書` 在 zh-CN（`<html lang="zh">`）+ en-US（`<html lang="en">`）locale 下，因 `--font-family` 缺失任何 CJK 字体名，被浏览器 fallback 到 PingFang SC，使 `認 / 謄 / 証 / 書 / 変更 / 許可 / 認定 / 申請` 等汉字呈中文笔画形态（言旁更窄、月部更紧、書 底横挤压、変 末笔走中文风格），与日本行政书士读者对模板名的视觉锚点相悖。 | **P1** | ✅ 已修：① `theme.css` 把 `--font-family` 拆成 `base + cjk-sc + cjk-jp + fallback` 四段，显式声明 CJK 字体名，避免 Windows / Linux 平台默认 fallback 飘忽。② 加 `:lang(ja) { font-family: base + cjk-jp + cjk-sc + fallback; }`，让 `lang="ja"` 内容优先解析 Hiragino Sans / Yu Gothic。③ 在 `CaseDocumentRow.vue` 的 `.doc-row__name` 和 `CaseFormsTab.vue` 的 `.forms-tab__name`（模板列 + 已生成文书列）加 `lang="ja"` 静态属性，让 Japanese 模板名在任何 UI locale 下都拿到 JP 字形定位。 |
| NEW-V13-2 | **`１ / 10 已通过审核（10%）` 顶部进度卡的全角括号在 en-US locale 残留**：模板内嵌 `（{{ overallRate.percent }}%）` 硬编码全角括号 `（）`，未走 i18n 通道。zh-CN / ja-JP 视觉自洽，**en-US 出现 `1 / 10 approved（10%）` 半角文本里夹一对全角中日符号**，与同行 `(10 total · 0 under review · 9 pending)` 半角括号自相矛盾，破坏 「同语种内标点统一」契约。 | **P1** | ✅ 已修：在 `cases.detail.documents.completion` 三语下新增 `labelWithPercent` 同义键并显式包含本地化括号风格：<br>① zh-CN：`"{collected} / {total} 已通过审核（{percent}%）"`（全角）<br>② ja-JP：`"{collected} / {total} 承認済み（{percent}%）"`（全角）<br>③ en-US：`"{collected} / {total} approved ({percent}%)"`（半角 + 前置空格）<br>把 `CaseDocumentsTab.vue` 顶部进度卡的渲染从 `t(label) + 硬编码（{percent}%）` 改成 `t(labelWithPercent, { ..., percent })` 单点解析。 |

资料清单 / 文书 Tab 的核心交互（登记 / 审核 / 退回 / 引用 / 豁免 / 取消豁免 / 手动添加 / 文书生成 / 导出）端到端可用；本轮纯样式 + 静态属性 + i18n 字面值改动，零运行时副作用、零接口变更。覆盖：资料清单 Tab 顶部进度卡 + 详情列表分组小计 + 详情条目模板名 + 文书 Tab 模板列 + 已生成文书列 + 概览页提供者卡，**全部 CJK 字形定位与本地化标点风格已对齐**。

---

## 1. 本轮新发现与修复

### 1.1 NEW-V13-1 — 日文模板名 kanji glyph locality 错配（P1）

| 项 | 内容 |
|---|---|
| 现象 | 资料清单详情条目（9 条） + 文书 Tab 模板列（2 条）+ 文书 Tab 已生成文书列（4 条）下的 Japanese 模板名（如 `認定謄本 / 証明書 / 申請理由書 / 婚姻証明書（戸籍謄本）/ 在留資格認定/変更許可申請書`），在 `<html lang="zh">` 默认（zh-CN locale）下被浏览器 CJK fallback 解析为 PingFang SC，导致 kanji 笔画走中文风格：<br>- 認 — 言部内 `心` 的横画偏短（中文）vs 偏长（日文）<br>- 謄 — 月部纵线密度（中文）vs 月部上下分离（日文）<br>- 証 — 言+正 紧凑（中文）vs 言+正 间距更开（日文）<br>- 書 — 底横紧贴（中文）vs 底横离散（日文）<br>- 変 — 末笔 `夂` 中文风格 vs 日文末笔更舒展<br><br>en-US locale（`<html lang="en">`）同样问题：CJK 默认 fallback 仍走 PingFang SC，因为 `--font-family` 整条 stack 没有任何 CJK 字体名。 |
| 截图 | `01-zh-initial.png`（修复前 zh-CN）<br>`02-font-probe-overlay.png` / `04-zh-vs-ja-glyph-locality-overlay.png` / `05-zoom-zh-vs-ja-glyph.png`（24px / 36px 字号下并列 PingFang SC vs Hiragino Sans 字形差异，肉眼可见）<br>`11-zh-after-fix-final.png`（修复后 zh-CN，模板名走 Hiragino）<br>`10-ja-after-fix-final.png`（修复后 ja-JP）<br>`09-en-after-fix-final.png`（修复后 en-US）<br>`12-zh-forms-tab-after-fix.png`（修复后文书 Tab） |
| 关键代码 | `packages/admin/src/styles/theme.css`（`--font-family-*` 拆分 + `:lang(ja)` 重定义）<br>`packages/admin/src/views/cases/components/CaseDocumentRow.vue`（`.doc-row__name` 加 `lang="ja"`）<br>`packages/admin/src/views/cases/components/CaseFormsTab.vue`（`.forms-tab__name` × 2 处加 `lang="ja"`） |
| 根因 | ① **字体栈无 CJK 锚点**：`theme.css` 的 `--font-family` 仅 `"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`，全是 Latin 字体；CJK 字符靠浏览器 + OS 的 fallback 链解析，结果是 zh / en locale 下都解析为 PingFang SC（因为 system default 一致），日文 kanji 拿不到 JP 字形。<br>② **静态文本无 lang 锚点**：模板名是 blueprint seed 里的 Japanese 字面（`name: "在留カードコピー"` 等），但在 Vue 模板 `<div class="doc-row__name">{{ item.name }}</div>` 里没有 `lang` 属性，浏览器只能走 `<html lang>` 的祖先继承，无法识别这是日文片段。<br>③ 没有 `:lang()` CSS 选择器把 JP 内容重定向到 JP 字体优先栈。 |
| 修复 | **三层组合修复**：<br>① **`theme.css`：拆分字体栈**——把单一 `--font-family` 改成四段 token 拼装：`--font-family-base`（Latin）+ `--font-family-cjk-sc`（PingFang SC / Microsoft YaHei / Noto Sans CJK SC）+ `--font-family-cjk-jp`（Hiragino Sans / Yu Gothic / Meiryo / Noto Sans CJK JP）+ `--font-family-fallback`（Helvetica / Arial / sans-serif）。默认 `--font-family` 为 `base + cjk-sc + cjk-jp + fallback`（中文优先，保持 zh-CN locale 现状不动）。<br>② **`theme.css`：加 `:lang(ja)` 重定义**——`:lang(ja) { font-family: base + cjk-jp + cjk-sc + fallback; }`，让 `<html lang="ja">` 或局部 `<span lang="ja">` 切换到日文优先栈，PingFang 仅作 backup。<br>③ **静态属性下沉**——`CaseDocumentRow.vue` 的 `.doc-row__name`、`CaseFormsTab.vue` 的 `.forms-tab__name`（模板列 + 已生成文书列）三个落点加 `lang="ja"` 静态属性。无论 UI locale 是 zh / ja / en，这三处的 `item.name` / `tpl.name` / `doc.name` 总是用 JP 字形定位（Hiragino Sans 优先）。 |
| 测试 | 已有 5874 条 admin × cases / documents 用例全部通过；本次纯样式 + 静态属性 + i18n 同义键扩展，无新增运行时分支。`packages/admin/src/views/cases/components/CaseDocumentsTab.bug-r31-g.test.ts` / `CaseDocumentsTab.bug169.test.ts` / `CaseFormsTab.readonly.test.ts` / `CaseFormsTab.finalize-export.test.ts` / `providersI18n.consistency.focused.test.ts` 五个核心 focused suite 共 57 用例 100% 通过，无回归。 |
| 落地说明 | 字体栈改动对 zh-CN（中文 UI）+ en-US（英文 UI）默认渲染**像素级一致**（默认 `--font-family` 仍 base → SC → JP → fallback），仅在标记 `lang="ja"` 的元素 + ja-JP locale 下切换到日文优先。Windows / Linux 用户首次受益：以前要看是否装了 Hiragino，现在显式声明回退到 Yu Gothic / Meiryo / Noto Sans CJK JP，体验向 macOS 对齐。 |

### 1.2 NEW-V13-2 — `(percent%)` 全角/半角括号本地化漏洞（P1）

| 项 | 内容 |
|---|---|
| 现象 | 资料清单 Tab 顶部「资料登记清单」进度行：<br>- zh-CN：`1 / 10 已通过审核（10%） （共 10 项 · 0 项待审核 · 9 项待提交）` ✓ 全角括号自洽<br>- ja-JP：`1 / 10 承認済み（10%） （全 10 件 · 0 件審査中 · 9 件未提出）` ✓ 全角括号自洽<br>- en-US：`1 / 10 approved（10%） (10 total · 0 under review · 9 pending)` ✗ 主标签全角 `（10%）` + 子细分半角 `(10 total ...)` **混排**，破坏「同语种内标点统一」契约。 |
| 截图 | `08-en-after-fix.png`（修复前混排）<br>`09-en-after-fix-final.png`（修复后全半角）<br>`11-zh-after-fix-final.png`（zh-CN 全角无回归）<br>`10-ja-after-fix-final.png`（ja-JP 全角无回归） |
| 关键代码 | `packages/admin/src/views/cases/components/CaseDocumentsTab.vue`（顶部进度行渲染）<br>`packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts`（新增 `completion.labelWithPercent`） |
| 根因 | `CaseDocumentsTab.vue` 顶部进度行用 `t("...completion.label", {...}) + 硬编码（{{ overallRate.percent }}%）` 拼接，**括号字面写在 Vue 模板里**而非 i18n 资源里，三语共享相同硬编码 → en-US 必然出现 zh/ja 风格的全角符号。 |
| 修复 | ① 三语 i18n 资源各自新增 `cases.detail.documents.completion.labelWithPercent` 键，显式包含本地化括号风格：<br>- zh-CN：`"{collected} / {total} 已通过审核（{percent}%）"`<br>- ja-JP：`"{collected} / {total} 承認済み（{percent}%）"`<br>- en-US：`"{collected} / {total} approved ({percent}%)"`（半角，前置空格）<br>② `CaseDocumentsTab.vue` 顶部进度卡渲染从「`t(label, {a,b}) + 硬编码（{percent}%）`」改成「`t(labelWithPercent, {a, b, percent})`」单点解析。<br>③ 保留 `cases.detail.documents.completion.label`（无 percent 版本）不动，分组小计行依然用旧键，避免改 8 处文案。 |
| 测试 | 现有 `CaseDocumentsTab.bug-r31-g.test.ts` 三语 completion 标签匹配 `1 / 2 已通过审核` / `1 / 2 approved` / `1 / 2 承認済み` 子串，**与新键 `labelWithPercent` 兼容**（新键也包含同样前缀）。无需改测试，57 用例全过。 |
| 落地说明 | 此修复抽走了 Vue 模板里**最后一处硬编码标点**，把 percent 显示完全交给 i18n。后续如新增韩语 / 越南语 / 繁中等，只需在新 locale 文件添加 `labelWithPercent` 即可，不必再回 Vue 模板改硬编码。 |

---

## 2. 字体 / Japanese 模板字符渲染回归

| 项 | 状态 | 备注 |
|---|---|---|
| `--font-family` 拆分 | ✅ 落地 | 四段 token 拼装：`base + cjk-sc + cjk-jp + fallback`；显式声明 PingFang SC + Hiragino Sans 等 CJK 字体名，向 Windows / Linux 用户对齐 macOS 体验。 |
| `:lang(ja)` 重定义 | ✅ 落地 | 让 `lang="ja"` 内容优先 Hiragino Sans / Yu Gothic / Meiryo / Noto Sans CJK JP；PingFang SC 仅 backup。 |
| `lang="ja"` 静态属性下沉 | ✅ 落地 | `CaseDocumentRow.vue` × 1 处 + `CaseFormsTab.vue` × 2 处。任何 UI locale 下，Japanese 模板名都拿 JP 字形。 |
| zh-CN / ja-JP / en-US 三语 UI 回归 | ✅ 通过 | 三语下顶部进度卡 / 分组小计 / 模板名 / 状态 chip / 操作链接 / 全局完成率 全部正常；本地化标点风格自洽。 |
| 概览页 / 资料清单 / 文书 Tab 整体排版 | ✅ 正常 | 列宽 / 行高 / 状态 chip / 操作链接 / 分组小计 全部正常，未引入额外抖动。 |
| 现有 5874 admin × cases/documents 单测 | ✅ 100% 通过 | 5874 通过 / 24 跳过；focused suite 57 用例 100% 通过。 |

---

## 3. V12 / V11 / V10 / V9 / V7 已修问题回归

| 来源 | ID | 修复方向 | V13 回归结果 |
|---|---|---|---|
| V12 | NEW-V12-1 provider 角色 i18n 双 namespace 同义 | `cases.detail.providers.*` 三语字面值对齐 `documents.providers.*` | ✅ 顶部卡 + 列表组 + 概览页三处显示一致 |
| V11 | NEW-V11-1 写后顶部卡 + Tab 计数器 stale | `useCaseDocumentsTab.onWriteSuccess` + `refresh` 事件 | ✅ 写路径未触发回归（本轮纯样式 + i18n 改动） |
| V10 | NEW-V10-1 supporter 项错并入主申请人组 | `provided_by_role` 单一权威字段 | ✅ 三组数依然 4/2/4 正确分布 |
| V10 | NEW-V10-2 详情列表分组顺序与顶部卡错位 | `PROVIDER_GROUP_ORDER` 固定优先级 | ✅ 主申请人 → 事务所内部 → 扶养者/保证人 顺序稳定 |
| V9 | NEW-V9-1 PDF 导出 worker 硬抛 | `buildMinimalPdf` PDF 1.4 stub | ✅ 本轮未触发 |
| V7 | NEW-V7-1 「未知 0/N」进度卡 | blueprint 三方位补 `providedByRole` + 058 backfill | ✅ 顶部卡显示三组真实角色（4/2/4），无「未知」 |
| V7 | NEW-V7-7 完成度文案口径 | 「N / M 已通过审核」+ 子注 | ✅ 「1 / 10 已通过审核（10%） · 共 10 项 · 0 项待审核 · 9 项待提交」（且本轮把英文版 `（10%）` 修成 `(10%)`） |

---

## 4. 截图索引

| # | 文件 | 内容 |
|---|---|---|
| 01 | `01-zh-initial.png` | 资料清单 Tab 起点（修复前 zh-CN，全部模板名走 PingFang SC） |
| 02 | `02-font-probe-overlay.png` | DOM overlay 24px 6 行字体并列：inherit / PingFang SC / Hiragino Sans / Yu Gothic / Noto SC / Noto JP，肉眼可见 `認 / 謄 / 証 / 書 / 変` 字形差异 |
| 03 | `03-zh-after-fix.png` | 修复后 zh-CN（带 overlay 验证 lang="ja" 切换到 Hiragino） |
| 04 | `04-zh-vs-ja-glyph-locality-overlay.png` | 22px 双行对比 overlay：lang="zh" PingFang vs lang="ja" Hiragino |
| 05 | `05-zoom-zh-vs-ja-glyph.png` | 36px 大字号 overlay 双行对比，字形差异最清晰 |
| 06 | `06-zh-after-fix-clean.png` | 修复后 zh-CN 干净页（无 overlay） |
| 07 | `07-ja-after-fix.png` | 修复后 ja-JP（修复 percent 括号前） |
| 08 | `08-en-after-fix.png` | 修复后 en-US（修复 percent 括号前，已可见 `approved（10%）` 全角残留） |
| 09 | `09-en-after-fix-final.png` | 修复后 en-US 终态：`1 / 10 approved (10%)` 半角自洽 |
| 10 | `10-ja-after-fix-final.png` | 修复后 ja-JP 终态：`1 / 10 承認済み（10%）` 全角自洽，模板名走 Hiragino |
| 11 | `11-zh-after-fix-final.png` | 修复后 zh-CN 终态：`1 / 10 已通过审核（10%）` 全角自洽，模板名走 Hiragino |
| 12 | `12-zh-forms-tab-after-fix.png` | 修复后文书 Tab：`申請理由書 / 身元保証書` 模板卡 + 已生成文书 4 条全部走 Hiragino Sans |

---

## 5. 待回灌（file-back 候选）

### 5.1 「CJK 字形定位」契约

可入库一条字体规约：「**字体栈必须显式声明 CJK 字体；任何已知语言的静态文本必须有 lang 属性**」。具体落地：
- 全局字体 token 必须拆分 `base + cjk-sc + cjk-jp + fallback` 四段，禁止只声明 Latin。
- 任何在数据层就已锁定语种的字段（如 blueprint 里的 `name: "在留カードコピー"`）在视图层渲染时必须有 `lang="ja"` 锚点。
- 任何依赖 `<html lang>` 默认继承的视图层字段，必须能容忍 zh-CN / en-US 用户也能看到「字形地道」的 CJK 内容。
- `:lang()` CSS 选择器是切换 CJK 字形栈的标准方式，禁止用 `data-locale="ja"` 自定义属性 + `[data-locale="ja"]` 选择器替代。

### 5.2 「同语种标点统一」契约

可入库一条 i18n 标点规约：「**全角 / 半角标点风格必须在 i18n 资源层决定，禁止 Vue 模板内硬编码 CJK 标点（`（）／·／·／、／。`）**」。具体落地：
- 任何在 Vue / TSX 模板里直接出现的 CJK 全角字符（`（`、`）`、`、`、`。`、`：`、`！`、`？` 等）都要审计，迁入 i18n 资源。
- 含动态变量的拼接式文本统一用 `t(key, params)` 单点解析，禁止 `t(part1) + 硬编码 + t(part2)` 模式。
- 哨兵测试：可加一条 `eslint-plugin` 规则或 `vitest` 哨兵 — 在 `*.vue` / `*.tsx` 文件内 ban 硬编码 `[（）「」]` 等 CJK 全角标点。

### 5.3 走查会话引用

- 本轮：[资料清单 UI 字体回归走查 chrome-devtools-mcp 第十三轮](current-session)
- V12 第十二轮：[83-MCP-docs-walkthrough-2026-05-09-v12.md](./83-MCP-docs-walkthrough-2026-05-09-v12.md)
- V11 第十一轮：[82-MCP-docs-walkthrough-2026-05-09-v11.md](./82-MCP-docs-walkthrough-2026-05-09-v11.md)
- V10 第十轮：[81-MCP-docs-walkthrough-2026-05-09-v10.md](./81-MCP-docs-walkthrough-2026-05-09-v10.md)
