# S7: DocumentItem 状态扩展

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S7 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S5（Case 状态机，理解流转模式） |
| 后续解锁 | S18（资料完成率） |
| 预估工时 | 0.3 天 |

## 目标

将 DocumentItem 状态从当前 4 状态扩展为产品文档定义的 7 状态。对应产品文档 `05-核心流程与状态流转 §3`。

## 状态变更

### 当前状态（4 种）
`pending → requested → received → reviewed / rejected`

### 目标状态（7 种）
`pending → waiting_upload → uploaded_reviewing → approved → revision_required → waived → expired`

## 完整流转矩阵

| 当前状态 | 允许流转到 |
|---|---|
| pending | waiting_upload, waived |
| waiting_upload | uploaded_reviewing, waived |
| uploaded_reviewing | approved, revision_required |
| revision_required | waiting_upload |
| approved | expired |
| waived | pending |
| expired | waiting_upload |

## 范围

### 需要修改的文件

- `packages/server/src/modules/core/document-items/documentItems.service.ts` — 更新 ALLOWED_TRANSITIONS
- `packages/server/src/modules/core/document-items/documentItems.service.test.ts` — 更新测试

## 实现规范

1. 替换 `ALLOWED_TRANSITIONS` 为新的 7 状态矩阵
2. 新增时间戳字段映射：
   - waiting_upload → requestedAt
   - uploaded_reviewing → receivedAt
   - approved → reviewedAt
3. 保持 `transition` 方法逻辑不变（乐观锁 + Timeline）
4. followUp 方法仅在 waiting_upload / revision_required 时允许

## 向后兼容说明

- 数据库 status 列为 text，无约束，兼容新旧值
- 已有的 pending/received 等旧状态数据需在注释中标注迁移方案

## 测试要求

- 所有合法流转验证
- 非法流转拒绝（如 pending → approved）
- followUp 仅在指定状态允许
- 乐观锁并发冲突

## DoD

- [ ] ALLOWED_TRANSITIONS 覆盖 7 状态
- [ ] 时间戳字段映射正确
- [ ] followUp 状态限制更新
- [ ] 现有测试适配新状态
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
