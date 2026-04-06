# F2: Mobile Case Feature

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | F2 |
| Phase | F — Mobile 端业务 Feature |
| 前置依赖 | F1 (Auth)、D4b (Leads API)、A2 (Cases API) |
| 后续解锁 | 无 |
| 预估工时 | 1-1.5 天 |

## 目标

实现案件列表 + 详情 + 进度查看功能（对应 Prototype case 页面）。

## 范围

### 需要创建的文件

```
packages/mobile/src/features/case/
  model/
    useCaseListViewModel.ts
    useCaseListViewModel.test.tsx
    useCaseDetailViewModel.ts
    useCaseDetailViewModel.test.tsx
  ui/
    CaseListScreen.tsx
    CaseDetailScreen.tsx

packages/mobile/src/domain/case/
  CaseRepository.ts
  Case.ts

packages/mobile/src/data/case/
  CaseApi.ts
  CaseRepositoryImpl.ts
```

### 不可修改的目录

- `packages/server/`
- `packages/mobile/src/features/home/`

## 设计

### Domain 层

```ts
export type CaseRepository = {
  listMyCases(): Promise<CaseSummary[]>;
  getCaseDetail(caseId: string): Promise<CaseDetail>;
};

export type CaseSummary = {
  id: string; caseTypeCode: string; status: string; dueAt: string | null;
};

export type CaseDetail = CaseSummary & {
  documents: DocumentItemSummary[];
  timeline: TimelineEntry[];
};
```

### UI 参考

- `packages/prototype/src/pages/case/` — 原型页面

## 实现规范

1. 遵循 useHomeViewModel 模式
2. CaseApi 调用 Server `/cases` + `/document-items` + `/timeline` 端点
3. 进度展示：基于 case.status 映射为进度条

## 测试要求

- 测试 ViewModel：mock CaseRepository
- 覆盖列表加载 / 详情加载 / 错误场景

## DoD

- [ ] CaseListScreen + CaseDetailScreen 可渲染
- [ ] 列表和详情数据正确展示
- [ ] 进度条映射正确
- [ ] ViewModel 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/mobile
npx jest --testPathPattern=case
npm run guard
```
