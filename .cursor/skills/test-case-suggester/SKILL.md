---
name: test-case-suggester
description: >-
  Suggest minimal necessary test cases for model, domain, and data layer
  changes. Use when reviewing code changes, planning test coverage, or
  checking which tests to add for new or modified logic.
---

# Test Case Suggester

## Purpose

对 `model` / `domain` / `data` 层的 TypeScript 生产代码改动给出最小必要测试建议——明确测什么、用什么策略、mock 什么依赖，避免无效补测（为 UI 样式写单测）和遗漏补测（domain 逻辑无测试）。

> 本 skill 针对生产代码（TypeScript）改动。原型阶段（HTML/CSS/JS）不适用，原型的验收用 `prototype-regression-checklist` skill。

优先级：
1. domain 层纯逻辑（状态机守卫、校验规则、实体变换）— 必须有测试
2. data 层仓库实现（API 调用、错误处理、数据转换）— 必须有测试
3. model 层 ViewModel Hook（状态转换、副作用触发）— 应当有测试
4. UI 组件渲染 — 仅在用户明确要求时建议

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户要求对当前改动建议测试用例
- 用户要求检查测试覆盖是否充分
- 用户问"这个改动需要补什么测试"
- 用户要求为新增的 domain/data/model 逻辑设计测试

示例请求：

- 帮我看看这次改动需要补哪些测试
- 为新加的 BillingPlan 校验逻辑建议测试用例
- 检查 customer domain 层有没有漏测的
- 这个 ViewModel Hook 需要测什么
- 帮我规划 DocumentRepository 的测试策略

## Required Inputs

执行前必须读取：

- `AGENTS.md` — 测试规则（必须补测 model/domain/data、禁止真实网络请求）
- 改动文件列表（通过 `git diff --name-only` 或用户指定）
- 改动文件的源代码 — 确认逻辑分支和依赖

需要更多上下文时，再读取：

- 已有测试文件（与改动文件同目录或 `__tests__/` 下）— 确认已有覆盖范围
- domain 层类型定义 — 确认接口签名和枚举
- `package.json` — 确认测试框架和运行命令

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. **测试建议清单**（Markdown 表格）— 按改动文件列出建议的测试用例

如用户要求代码产出，额外产出：

2. **测试代码骨架**（TypeScript）— 可直接填充的测试文件框架

### 测试建议清单结构

| 列 | 说明 |
|----|------|
| 文件 | 改动的源文件路径 |
| 层级 | domain / data / model / ui |
| 优先级 | 必须 / 应当 / 可选 |
| 测试用例 | 具体的测试场景描述 |
| 策略 | 纯函数断言 / mock 依赖 / stub API / snapshot |
| mock 目标 | 需要 mock 的依赖（如有） |

### 测试用例场景分类

每个被测函数/方法至少覆盖：

| 场景类型 | 说明 |
|----------|------|
| 正常路径 | 合法输入产出预期结果 |
| 边界值 | 空值、零值、极值、空数组 |
| 异常路径 | 非法输入、网络失败、超时、权限不足 |
| 状态转换 | 守卫条件通过/拒绝（仅状态机相关） |

### 测试代码骨架结构

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('{被测模块}', () => {
  describe('{被测函数/方法}', () => {
    it('正常路径: {场景描述}', () => {
      // Arrange
      // Act
      // Assert
    });

    it('边界值: {场景描述}', () => {
      // Arrange
      // Act
      // Assert
    });

    it('异常路径: {场景描述}', () => {
      // Arrange — mock 依赖返回错误
      // Act
      // Assert — 错误被正确处理
    });
  });
});
```

## Workflow

1. 读取 `AGENTS.md`，确认测试规则。
2. 获取改动文件列表。
3. 对每个改动文件分类到层级（domain / data / model / ui）。
4. 对 domain 层文件：
   - 识别导出的纯函数、守卫条件、校验规则、实体工厂
   - 为每个导出函数生成正常/边界/异常测试用例
   - 标记优先级为"必须"
5. 对 data 层文件：
   - 识别仓库方法（CRUD、API 调用）
   - 为每个方法生成正常/错误/超时测试用例
   - 确定 mock 目标（HTTP client / fetch / 外部 API）
   - 标记优先级为"必须"
6. 对 model 层文件：
   - 识别 ViewModel Hook 的状态和副作用
   - 为每个状态转换生成测试用例
   - 确定 mock 目标（仓库接口 / 导航 / 通知）
   - 标记优先级为"应当"
7. 对 ui 层文件：
   - 仅在用户明确要求时建议测试
   - 优先建议 snapshot 或交互测试
   - 标记优先级为"可选"
8. 检查已有测试文件，排除已覆盖的用例。
9. 输出测试建议清单。
10. 如用户要求，生成测试代码骨架。
11. 验证：每个"必须"优先级的用例都在建议中；mock 目标明确；无真实网络请求。

## Rules

- 新增/修改逻辑必须补单测，优先覆盖 `model` / `domain` / `data`。（来源：AGENTS.md）
- 测试中禁止发起真实网络请求——必须 mock 或注入 stub。（来源：AGENTS.md）
- domain 层测试使用纯函数断言——不 mock UI 框架、不 mock 导航。
- data 层测试 mock HTTP client——不 mock domain 类型。
- model 层测试 mock 仓库接口——通过 domain 接口注入。
- 测试文件命名与源文件对应——`foo.ts` → `foo.test.ts` 或 `foo.spec.ts`。
- 纯类型定义文件（只有 `type` / `interface` / `enum` 导出）不要求测试——除非包含运行时逻辑。
- 每个测试用例有明确的 Arrange-Act-Assert 结构。
- 不建议为 CSS 样式、静态 HTML、纯配置文件写单测。

## Anti-Patterns

- 为每个文件无差别建议测试 → UI 组件的样式测试价值低，浪费开发时间
- mock 粒度太粗（mock 整个模块）→ 测试没有覆盖真正的逻辑路径
- 测试中直接调用 `fetch` 或真实 API → 测试不稳定，CI 环境无外网
- 只测正常路径不测异常路径 → 异常处理逻辑是高频 bug 来源
- 测试描述写"should work correctly" → 描述不具体，失败时无法定位问题
- 忽略状态机守卫条件的测试 → 守卫条件是 domain 层的核心，漏测风险最高
- 把 ViewModel Hook 的测试写成 UI 渲染测试 → Hook 逻辑应独立于 UI 测试

## References

- [test-strategy-guide.md](references/test-strategy-guide.md) — 分层测试策略速查与 mock 模式
- [AGENTS.md](../../AGENTS.md) — 测试规则的权威定义
- [example-walkthrough.md](references/example-walkthrough.md) — 客户模块域变更测试建议演练
- [delivery-guardrail SKILL.md](../delivery-guardrail/SKILL.md) — 交付门禁 skill（步骤 6 也检查测试覆盖，侧重整体门禁而非逐用例建议）
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认：

1. 所有 domain 层改动文件都有"必须"优先级的测试建议
2. 所有 data 层改动文件都有"必须"优先级的测试建议
3. 所有 model 层改动文件都有"应当"优先级的测试建议
4. 每个测试用例包含正常/边界/异常三类场景
5. mock 目标明确（不是"mock 相关依赖"这种模糊描述）
6. 无真实网络请求出现在测试建议中
7. 纯类型文件未被建议测试
8. 已有测试覆盖的用例已排除
