# 逐层映射判断规则与命名约定

> 本文件辅助 `prototype-to-production-mapping` skill 执行时的映射判断。
> 权威来源：AGENTS.md 架构边界 + customers 金样本。

---

## 1. 层级判定规则

### 1.1 Domain 层（`domain/<module>/`）

放入 domain 的条件——以下**全部满足**：

- 是纯 TypeScript（类型、接口、常量、枚举、领域逻辑函数）
- 不依赖 React / React Native / 任何 UI 框架
- 不依赖网络实现（fetch / axios）、存储实现（localStorage / AsyncStorage）
- 不依赖导航库

常见映射来源：
- 原型 `data/*.js` 中的配置对象 → `<module>Constants.ts`
- 原型 `data/*.js` 中的隐式数据结构 → `<Entity>.ts`（实体类型）
- 表格列定义、筛选器配置、表单字段定义 → `<module>Constants.ts`
- 列表查询/创建/更新需求 → `<Entity>Repository.ts`（接口）
- 草稿/本地存储需求 → `<Entity>DraftRepository.ts`（接口）

### 1.2 Data 层（`data/<module>/`）

放入 data 的条件——以下**全部满足**：

- 实现 domain 层接口（Repository）
- 涉及具体的网络调用或存储操作
- 不包含业务决策逻辑（只做数据搬运）

常见映射来源：
- 原型中的静态 HTML 数据行 → `<Entity>Api.ts`（HTTP 端点调用）
- 原型中的 localStorage 操作 → `<Entity>DraftStorage.ts`
- 两者组合 → `create<Entity>Repository.ts`

命名约定：
- API 类：`<Entity>Api.ts`，导出 `create<Entity>Api(deps)`
- 存储类：`<Entity>Storage.ts` 或 `<Entity>DraftStorage.ts`
- 仓库实现：`create<Entity>Repository.ts`，导出 `create<Entity>Repository(deps)`

### 1.3 Features/model 层（`features/<module>/model/`）

放入 model 的条件——以下**全部满足**：

- 是 ViewModel Hook（`useXxxViewModel` / `useXxxModal` / `useXxxActions`）
- 编排 domain 层接口的调用顺序和状态管理
- 不直接操作 DOM 或渲染 UI

映射规则：
- 每个原型 `scripts/*.js` 文件 → 至少一个 ViewModel Hook
- 不允许多个原型脚本合并到同一个 Hook（职责模糊）
- 允许一个原型脚本拆分为多个 Hook（如页面脚本拆为列表 ViewModel + 子状态 Hook）

命名约定：
- 页面级编排：`use<Entity>ListViewModel.ts`、`use<Entity>DetailViewModel.ts`
- 弹窗/子流程：`useCreate<Entity>Modal.ts`、`use<Entity>BulkActions.ts`
- 辅助状态：`use<Entity>Drafts.ts`、`use<Entity>Filters.ts`

### 1.4 Features/ui 层（`features/<module>/ui/`）

放入 ui 的条件——以下**全部满足**：

- 是 React/RN 页面组件
- 消费 model 层 Hook 暴露的状态和回调
- 不包含业务逻辑（只做渲染和事件传递）

映射规则：
- 每个原型 `sections/*.html` → 至少一个页面组件
- 入口页面组装组件：`<Entity>ListScreen.tsx`、`<Entity>DetailScreen.tsx`

命名约定：
- 入口组件：`<Entity>ListScreen.tsx`、`<Entity>DetailScreen.tsx`
- 区块组件：`<Entity>ListHeader.tsx`、`<Entity>ListFilters.tsx`、`<Entity>Table.tsx`
- 弹窗组件：`Create<Entity>Modal.tsx`、`Edit<Entity>Modal.tsx`

### 1.5 Shared 层（`shared/ui/` / `shared/hooks/`）

放入 shared 的判定——满足以下**任一**：

- 删掉模块名后仍然成立（如 Toast、Pagination、AppShell）
- 已在两个以上模块中使用或明确有复用意图
- 属于壳层/导航/布局基础设施

**不放入 shared** 的情况：

- 组件依赖模块的特定字段/状态机/业务类型
- 组件仅在一个模块使用且无复用预期

---

## 2. 命名总约定

| 层级 | 文件命名 | 导出命名 | 示例 |
|------|---------|---------|------|
| domain 实体 | `<Entity>.ts` | `type <Entity>Summary`, `type Create<Entity>Input` | `Customer.ts` |
| domain 接口 | `<Entity>Repository.ts` | `type <Entity>Repository` | `CustomerRepository.ts` |
| domain 常量 | `<module>Constants.ts` | `<MODULE>_TABLE_COLUMNS`, `<MODULE>_FILTERS` | `customerConstants.ts` |
| data API | `<Entity>Api.ts` | `create<Entity>Api(deps)` | `CustomerApi.ts` |
| data 实现 | `create<Entity>Repository.ts` | `create<Entity>Repository(deps)` | `createCustomerRepository.ts` |
| model Hook | `use<Entity><Context>.ts` | `use<Entity><Context>` | `useCustomerListViewModel.ts` |
| ui 入口 | `<Entity><View>Screen.tsx` | `<Entity><View>Screen` | `CustomerListScreen.tsx` |
| ui 区块 | `<Entity><Section>.tsx` | `<Entity><Section>` | `CustomerListFilters.tsx` |

---

## 3. 原型 → 生产差异常见模式

| 原型模式 | 生产替代 | 原因 |
|---------|---------|------|
| `window.XxxConfig` 全局挂载 | ES module import + DI container | 消除全局状态 |
| `localStorage` 直接读写 | Repository 接口 + 具体 Storage 实现 | 存储方案独立于业务逻辑 |
| `onclick` / `data-action` 内联事件 | React 事件 prop（`onPress`, `onChange`） | 框架层事件系统 |
| DOM ID 耦合（`#bulkActionBar`, `#toast`） | Props 驱动 + state 控制可见性 | 声明式 UI |
| `innerHTML` 渲染 | React 组件渲染 | 安全性 + 声明式 |
| `escapeHtml` 手动转义 | React 自动转义 | 框架内置 XSS 防护 |
| CSS class 切换（`.show`, `data-nav-open`） | State 驱动 + 动画库 | 响应式状态管理 |
| URL hash 触发交互（`#new`） | 路由参数或 navigation state | 路由框架标准做法 |
| 静态示例数据 | API 动态数据 + 空状态处理 | 真实数据源 |
| `setTimeout` / 手动 debounce | Hook 内 debounce（`useDeferredValue` / custom hook） | 声明式副作用管理 |
