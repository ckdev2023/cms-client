# 收尾检查清单速查与常见失败修复

> 本文件辅助 `SKILL.md`，不可独立使用。

---

## 1. 收尾执行顺序

```
npm run fix        ← 先修格式
npm run guard      ← 再跑门禁
  ├─ lint
  ├─ typecheck
  ├─ arch:check / feature:check
  ├─ lock:check
  ├─ secrets:check
  └─ test
```

**固定规则**：fix 在前，guard 在后。guard 内的子检查按依赖顺序自动执行。

---

## 2. 常见 guard 失败与修复指引

| 失败类型 | 典型错误信息 | 修复方向 |
|---------|------------|---------|
| lint | `ESLint: ...` / `Unexpected ...` | 运行 `npm run fix` 可解决大部分；剩余手动修复 |
| typecheck | `TS2322: Type ... is not assignable` | 检查类型定义、import 路径、泛型参数 |
| arch:check | `dependency-cruiser: violation` | 检查 import 是否跨层（参考下方 §3） |
| feature:check | `Cross-feature dependency detected` | feature 之间不直接互引，走 domain/shared |
| lock:check | `Found yarn.lock / pnpm-lock.yaml` | 删除非 npm 锁文件 |
| secrets:check | `Possible secret detected` | 从代码中移除敏感值，改用环境变量 |
| test | `FAIL ...` / `expect(...).toBe(...)` | 检查测试断言、mock 是否到位、逻辑是否变更 |

---

## 3. 架构边界违规速查

以下 import 关系为违规（来源：AGENTS.md）：

| 源层 | 禁止 import 的目标 | 修复方式 |
|------|-------------------|---------|
| `domain/` | React Native / tamagui / shared/ui | domain 只放纯 TS |
| `data/` | shared/ui | data 实现 domain 接口，不涉及 UI |
| `features/` | `data/` / `infra/` 直接 | 通过 AppContainer + domain 接口协作 |
| `features/` | `tamagui` / `@tamagui/*` 直接 | 通过 `shared/ui` 封装组件 |
| `features/A/` | `features/B/` | 走 domain/shared 或 public 出口 |

---

## 4. 测试覆盖评估

### 必须有测试的改动

| 改动位置 | 测试要求 |
|---------|---------|
| `domain/**/*.ts` | 实体逻辑、校验函数、状态转移必须有单测 |
| `data/**/*.ts` | Repository 实现必须有 mock API 的单测 |
| `features/**/model/**` | ViewModel Hook 必须有单测 |

### 可豁免测试的改动

| 改动类型 | 豁免条件 |
|---------|---------|
| 纯类型定义（`type` / `interface`） | 无运行时逻辑 |
| UI 组件（`features/**/ui/**`） | 如仅修改样式/布局（逻辑测试由 model 覆盖） |
| 配置文件 | `package.json` / `tsconfig` 等 |
| prototype / docs | 非 TS 代码 |

### 测试 mock 要求

- 所有 `fetch` / `axios` 调用必须 mock
- 所有外部服务调用必须 stub
- 使用 `vi.mock()` 或 `jest.mock()` 替换模块级依赖
- 使用依赖注入替换 Repository 实现

---

## 5. fix 自动修复审查要点

`npm run fix` 可能自动修改的内容：

| 修改类型 | 审查要点 |
|---------|---------|
| 格式化（缩进、空行、分号） | 通常安全，确认不影响字符串字面量 |
| import 排序 | 通常安全 |
| 未使用 import 删除 | 确认删除的 import 确实未使用（有时 type-only import 被误删） |
| 自动添加 `readonly` | 确认不影响可变数据的意图 |

如 fix 修改了非预期内容，先 `git diff` 审查再继续。
