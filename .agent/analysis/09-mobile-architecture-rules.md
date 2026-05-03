# 09 — Mobile 架构边界规则提取（B-006）

> 数据来源：`packages/mobile/.dependency-cruiser.js`、`packages/mobile/scripts/checkFeatureBoundaries.cjs`、`packages/mobile/package.json`、`packages/mobile/tsconfig.json`、`packages/mobile/src/` 目录扫描。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。

## 1. 实际目录形态（事实）**[H]**

```
packages/mobile/src/
├── app/                            # 容器 / 启动 / 路由（DI 入口）
├── features/                       # auth, case, documents, home, inbox, profile (6)
│   └── <feature>/{model, ui}       # 仅两层：model + ui；无 public/
├── domain/                         # auth, billing, case, documents, home, inbox, profile, reminder (8)
├── data/                           # auth, case, documents, home, inbox, profile (6) ← 与 features 一一对应
├── infra/                          # http, log, storage (3)
└── shared/                         # errors, http, ui (3)
```

**关键差异**：`domain` 比 `features`/`data` 多两个条目——`billing` 与 `reminder`。它们是"无 UI / 无独立 feature"的纯领域概念，被其它 feature 通过 `@domain/billing`、`@domain/reminder` 引用。 **[M]**（推测，待 grep 验证）

## 2. tsconfig 路径别名（事实）**[H]**

```json
"paths": {
  "@app/*":      ["./src/app/*"],
  "@features/*": ["./src/features/*"],
  "@domain/*":   ["./src/domain/*"],
  "@data/*":     ["./src/data/*"],
  "@infra/*":    ["./src/infra/*"],
  "@shared/*":   ["./src/shared/*"]
}
```

**意义**：`@features/<name>/public` 是预留的"feature 公共出口"约定（被 `checkFeatureBoundaries.cjs` 识别）；其它别名仅作书写糖。 **[H]**

## 3. dependency-cruiser 规则全解（10 条，均"活"）**[H]**

来源：`.dependency-cruiser.js`（commonjs，severity 全为 error）。

| # | 规则 | from | to | 含义 |
|---|------|------|----|------|
| 1 | `no-circular` | * | circular | 禁止任何循环依赖 |
| 2 | `features-no-data-or-infra` | `^src/features` | `^src/(data\|infra)` | feature 不得直依赖 data/infra（须经 domain 接口 + app 容器装配） |
| 3 | `domain-no-local-outside-domain-or-shared` | `^src/domain` | 非 domain 且非 shared | domain 只能依赖 domain 自己或 shared |
| 4 | `domain-no-shared-ui` | `^src/domain` | `^src/shared/ui` | domain 不得渲染 UI |
| 5 | `domain-no-npm` | `^src/domain` | npm 依赖 | domain 必须纯 TS（**与 admin 仅 warn 不同：mobile 是 error**） |
| 6 | `shared-no-local-outside-shared` | `^src/shared` | 非 shared | shared 不得反向依赖 app/features/domain/data/infra |
| 7 | `shared-no-npm` | `^src/shared/(?!ui)` | npm | shared/errors / shared/http 不得引 npm；**仅 shared/ui 可用 npm**（tamagui/react-native） |
| 8 | `infra-no-app-or-features-or-domain-or-data` | `^src/infra` | `^src/(app\|features\|domain\|data)` | infra 是底座，单向依赖 |
| 9 | `data-no-app-or-features` | `^src/data` | `^src/(app\|features)` | data 实现 domain 接口；不得反向依赖业务 feature |
| 10 | `data-no-shared-ui` | `^src/data` | `^src/shared/ui` | data 不得渲染 UI |

**与 admin 对比**：mobile 全部 10 条规则都"活"（目录全部存在）；mobile 多出 `shared-no-npm`（admin 无此条）。 **[H]**

## 4. checkFeatureBoundaries.cjs 规则模型 **[H]**

补充 dep-cruiser 不直接覆盖的"feature 间互不依赖"。核心实现：

- **扫描范围**：`src/features/**/*.{ts,tsx,js,jsx}`（用 typescript AST 提取 `import` / `export from` 的 module specifier）。
- **判定 import 目标 feature** 的两种方式：
  1. **alias 路径** `@features/<name>/...`
  2. **相对路径** `./...` / `../...` 经 `path.resolve` 后落入 `features/<name>/...`
- **公共出口豁免**：若 specifier 形如 `@features/<name>/public`，或解析后路径以 `features/<name>/public` 开头，则**视为 public API 调用，允许**。
- **违规条件**：fromFeature ≠ toFeature **且** 非 public 出口 **且** toFeature ∈ 已知 feature 列表。
- **失败动作**：`process.exit(1)`，打印每条违规与"修复建议：抽到 @shared 或 @domain；或由被依赖 feature 提供 @features/<name>/public 出口"。

**事实**：当前 6 个 feature 全部**没有** `public/` 目录 → 任何 feature→feature import 都会被该脚本拦截。**[H]**

## 5. 守门组合（mobile 完整 guard 链）**[H]**

`packages/mobile/package.json` 中：

```
"guard": lint && typecheck && arch:check && feature:check && lock:check && secrets:check && test
```

- `arch:check` = `depcruise --config .dependency-cruiser.js src --validate` → 跑 §3 全部 10 条
- `feature:check` = `node ./scripts/checkFeatureBoundaries.cjs` → 跑 §4 跨 feature 检查
- `lock:check` = inline node 脚本：禁止 `yarn.lock` / `pnpm-lock.yaml` / `bun.lockb`，要求 `package-lock.json`
- `secrets:check` = inline node 脚本：扫描 `src/` 下 .ts/.tsx/.js/.jsx/.json，匹配 AKIA、私钥头、`(secret|token|password)\s*[:=]\s*"<8+>"`
- `test` = jest

**约束清晰度**：mobile 是三 workspace 中守门最严的；admin / server 没有等价的 `feature:check` 与 `secrets:check`。 **[H]**

## 6. 与 admin 的差异速查 **[H]**

| 维度 | mobile | admin |
|------|--------|-------|
| 顶层目录是否齐备 | app/features/domain/data/infra/shared 全在 | shell/router/auth/i18n/views/shared（无 features/domain/data/infra） |
| dep-cruiser 规则数 | 10 条全活 | 11 条规则中 7 条休眠 |
| `domain-no-npm` 严重度 | error | warn |
| `shared-no-npm` | 有（仅 shared/ui 可 npm） | 无 |
| 跨 feature 直接 import | 禁（dep-cruiser + 自定义 AST 检查双门） | 仅禁 `views/billing → views/cases` 单边 |
| 公共出口约定 | `@features/<name>/public` | 无 |
| guard 链 | lint/typecheck/arch/feature/lock/secrets/test | lint/typecheck/test（无 arch / feature / secrets） *待 B-005 附录验证* |

## 7. domain 内"无 feature/data 落地"的实体 **[M]**

`domain/` 8 个目录中，`billing/` 与 `reminder/` 在 `features/` 与 `data/` 下均无对应目录。

**推测**：这两个领域的状态由 `case` feature 的 model 持有；HTTP 仍走 `data/case` 或共用 `infra/http`；domain 只承载类型 + 纯函数。 **[M]**
**风险**：若未来 reminder 演化成独立 feature，需要同时新增 `features/reminder` + `data/reminder`，并把现存依赖从 `case` 迁出 → 进入 OQ-36。 **[M]**

## 8. 风险摘要 **[H]**

- **R1 / public 出口未启用**：6 个 feature 全部缺 `public/` 目录；门禁逻辑虽完整，但跨 feature 协作只能走 `@shared` / `@domain`。如果未来真的出现合理跨 feature 引用，必须先建 `public/`。 **[H]**
- **R2 / shared/ui 是 tamagui 唯一合法落地点**：`shared-no-npm` 把 npm（含 `react-native`、`@tamagui/*`）锁在 `shared/ui` 内；任何 `shared/errors` / `shared/http` 内意外 import npm 都会失败。 **[H]**
- **R3 / data 与 feature 一对一约定**：dep-cruiser 不直接强制此约定；现实中 data/* 的 6 个目录与 features/* 的 6 个目录精确对齐，是隐含约定。若引入新 feature 而忘记建对应 data 目录，门禁不会报错。 **[M]** → OQ-37。
- **R4 / billing & reminder 的隐性归属**：domain 比 features 多两个目录，二者的"事实归属"仅由 import 关系揭示，文档化缺失。 **[M]** → OQ-36。

## 9. 未确认 / 待 backlog 验证 **[L]**

- mobile 中 `domain/billing` 与 `domain/reminder` 实际被哪些 feature 引用？
- `app/container/AppContainer` 装配里是否有"data 实现注入到 feature model"的可视化清单？
- mobile guard 链运行总耗时是否远高于 admin（影响开发反馈循环）？
