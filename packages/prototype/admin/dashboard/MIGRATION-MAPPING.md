# 仪表盘原型 → 生产代码迁移映射

> 本文档定义 `packages/prototype/admin/dashboard/` 中的 section、data、script 到未来生产代码的映射关系。
>
> 生产代码需遵循仓库四层架构：`domain -> data -> features/{model,ui} -> shared/ui`

---

## 1 Domain 层映射

原型中的聚合卡片与列表项语义，未来应拆成纯 TypeScript 的聚合摘要类型与查询参数。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| `metrics.*` | `domain/dashboard/DashboardSummary.ts` | `DashboardMetricSummary` | 单张卡片的值、说明、来源标签 |
| `lists.*` | `domain/dashboard/DashboardWorkItem.ts` | `DashboardWorkItem` | 今日待办 / 临期 / 风险 / 回款等列表项 |
| `defaultScope` / `scopeLabels` | `domain/dashboard/dashboardConstants.ts` | `DashboardScope` | `mine / group / all` |
| `defaultWindow` | `domain/dashboard/dashboardConstants.ts` | `DashboardWindowDays` | `7 | 30` |

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| `dashboard-config.js` 的静态聚合数据 | `domain/dashboard/DashboardRepository.ts` | `DashboardRepository` | 获取卡片聚合与列表数据 |

建议接口：

```typescript
export type DashboardScope = "mine" | "group" | "all";
export type DashboardWindowDays = 7 | 30;

export type DashboardQuery = {
  scope: DashboardScope;
  windowDays: DashboardWindowDays;
};

export type DashboardRepository = {
  getDashboardSummary(query: DashboardQuery): Promise<DashboardMetricSummary[]>;
  getDashboardLists(query: DashboardQuery): Promise<DashboardWorklists>;
};
```

## 2 Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 静态卡片与列表数据 | `data/dashboard/DashboardApi.ts` | `createDashboardApi(deps)` | 聚合查询接口 |
| 页面编排使用的数据装配 | `data/dashboard/createDashboardRepository.ts` | `createDashboardRepository(deps)` | 实现 `DashboardRepository` |

> 生产环境中的聚合逻辑应来自任务、案件、收费、资料等数据源，不应保留静态硬编码。

## 3 Features 层映射

### 3.1 Model

| 原型脚本 | 生产 Hook | 职责 |
|---------|-----------|------|
| `scripts/dashboard-page.js` | `useDashboardViewModel` | 编排 scope/window、加载态、聚合结果、toast 触发 |

建议状态：

```typescript
export type DashboardViewState =
  | { status: "loading" }
  | { status: "success"; summary: DashboardMetricSummary[]; lists: DashboardWorklists }
  | { status: "error"; message: string };
```

### 3.2 UI

| 原型 section | 生产组件 |
|-------------|----------|
| `sections/header.html` | `features/dashboard/ui/DashboardHeader.tsx` |
| `sections/filters.html` | `features/dashboard/ui/DashboardToolbar.tsx` |
| `sections/summary-cards.html` | `features/dashboard/ui/DashboardSummaryGrid.tsx` |
| `sections/worklists.html` | `features/dashboard/ui/DashboardWorklists.tsx` |
| `sections/visibility-notes.html` | `features/dashboard/ui/DashboardNotes.tsx` |
| `sections/toast.html` | `shared/ui/Toast.tsx` |

## 4 Shared 层映射

可复用能力继续落在 `shared/ui`：

- `AppShell`
- `SideNav`
- `TopBar`
- `SegmentedControl`
- `SkeletonBlock`
- `Toast`

不应进入 shared 的内容：

- 风险案件、待回款、待提交等业务文案
- 收费节点、Gate 通过、阻断项等业务判断

## 5 Demo-only 与生产替换点

| 原型能力 | 生产替换方式 |
|---------|-------------|
| 静态统计值 | 后端聚合查询 |
| 列表项固定文案 | 从任务 / 案件 / 收费数据装配 |
| toast 示例动作 | 真实导航或真实操作回调 |
| 骨架屏延迟 | 基于真实请求 loading 状态 |

## 6 目标文件清单

```text
packages/mobile/src/domain/dashboard/
├── DashboardSummary.ts
├── DashboardWorkItem.ts
├── DashboardRepository.ts
└── dashboardConstants.ts

packages/mobile/src/data/dashboard/
├── DashboardApi.ts
└── createDashboardRepository.ts

packages/mobile/src/features/dashboard/model/
└── useDashboardViewModel.ts

packages/mobile/src/features/dashboard/ui/
├── DashboardScreen.tsx
├── DashboardHeader.tsx
├── DashboardToolbar.tsx
├── DashboardSummaryGrid.tsx
├── DashboardWorklists.tsx
└── DashboardNotes.tsx
```
