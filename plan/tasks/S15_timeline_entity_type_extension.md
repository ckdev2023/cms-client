# S15: TimelineEntityType 扩展

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S15 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S16（Migration ✅） |
| 后续解锁 | S1-S12（所有新模块依赖正确的 entityType） |
| 预估工时 | 0.2 天 |

## 目标

扩展 TimelineEntityType 以支持新增的 9 种实体类型，确保所有新模块的 Timeline 写入合法。

## 当前状态

`coreEntities.ts` 中 TimelineEntityType 仅支持 6 种：
```ts
type TimelineEntityType =
  | "organization" | "user" | "customer"
  | "case" | "document_item" | "reminder";
```

## 目标状态

扩展为 15 种：
```ts
type TimelineEntityType =
  | "organization" | "user" | "customer"
  | "case" | "document_item" | "reminder"
  | "company" | "contact_person" | "case_party"
  | "document_file" | "communication_log" | "task"
  | "generated_document" | "billing_record" | "payment_record";
```

## 范围

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts`
  - 扩展 `TimelineEntityType` 类型
  - 更新 `isTimelineEntityType()` 函数新增 9 个分支
- `packages/server/src/modules/core/model/coreEntities.test.ts`（如有）或对应测试文件
  - 更新 `isTimelineEntityType` 测试用例

## 实现规范

1. 在 TimelineEntityType 联合类型中追加 9 种
2. 在 `isTimelineEntityType` 函数中追加 9 个 `if` 分支（保持现有风格）
3. 不修改 TimelineLog 类型本身

## 测试要求

- 现有 6 种 entityType 仍返回 true
- 新增 9 种 entityType 返回 true
- 未知值（如 "foobar"）仍返回 false
- 空字符串 / null / undefined 返回 false

## DoD

- [ ] TimelineEntityType 包含 15 种
- [ ] isTimelineEntityType 覆盖 15 种
- [ ] 现有测试通过
- [ ] 新增测试覆盖 9 种新类型
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
