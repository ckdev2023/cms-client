# S18: 案件资料完成率计算

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S18 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S7（DocumentItem 状态扩展） |
| 后续解锁 | 前端工作台展示 |
| 预估工时 | 0.2 天 |

## 目标

按案件统计 DocumentItem 各状态数量，计算资料完成率百分比。对应产品文档 `03-MVP §2.3` + `04-页面结构 §4.1`。

## 范围

### 需要修改的文件

- `packages/server/src/modules/core/document-items/documentItems.service.ts` — 新增 `getCompletionRate` 方法
- `packages/server/src/modules/core/document-items/documentItems.service.test.ts` — 新增测试

### 可选：新增 Controller 端点

- `GET /cases/:caseId/document-completion` — 返回完成率

## 返回结构

```ts
type DocumentCompletionRate = {
  caseId: string;
  total: number;
  approved: number;
  waived: number;
  pending: number;
  waiting_upload: number;
  uploaded_reviewing: number;
  revision_required: number;
  expired: number;
  completionRate: number; // 0-100，(approved + waived) / total * 100
};
```

## 实现规范

1. SQL 查询：
   ```sql
   SELECT status, count(*) AS cnt
   FROM document_items
   WHERE case_id = $1 AND (base_profile->>'_status' IS NULL OR base_profile->>'_status' != 'deleted')
   GROUP BY status
   ```
2. completionRate = `(approved + waived) / total * 100`，total=0 时返回 0
3. 通过 `createTenantDb` 保证 org 隔离
4. 可被 CasesService.get 调用以嵌入案件详情

## 测试要求

- 无 document_items 时 total=0, rate=0
- 全部 approved 时 rate=100
- 混合状态计算正确
- waived 也算完成
- 多租户隔离

## DoD

- [ ] getCompletionRate 方法
- [ ] 可选 HTTP 端点
- [ ] 计算逻辑正确
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
