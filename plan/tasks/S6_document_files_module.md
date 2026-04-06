# S6: DocumentFile 资料文件模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S6 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S16（Migration ✅）、S15（TimelineEntityType） |
| 后续解锁 | S18（资料完成率） |
| 预估工时 | 0.5 天 |

## 目标

为 DocumentItem 提供多版本文件上传/审核能力。一个 DocumentRequirement 可关联多个版本文件。对应产品文档 `06-数据模型设计 §3.7`。

## 数据库表

表 `document_files` 已在 `009_core_entities.up.sql` 创建，字段：
- id, org_id, requirement_id(FK document_items), file_name, file_url
- file_type, file_size, version_no, uploaded_by(FK users)
- uploaded_at, review_status, review_by(FK users), review_at
- expiry_date, hash_value, created_at

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/document-files/documentFiles.service.ts`
- `packages/server/src/modules/core/document-files/documentFiles.controller.ts`
- `packages/server/src/modules/core/document-files/documentFiles.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 新增 `DocumentFile` 类型

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/document-files/upload` | staff+ | 上传文件（集成 StorageAdapter） |
| GET | `/document-files` | viewer+ | 按 requirementId 列表 |
| GET | `/document-files/:id` | viewer+ | 查看单个 |
| PATCH | `/document-files/:id/review` | manager+ | 审核（approve/reject） |
| DELETE | `/document-files/:id` | manager+ | 删除文件 |

## 实现规范

1. upload 流程：接收文件 → StorageAdapter.upload → 写 DB 记录
2. version_no 自动递增（按 requirement_id 取 max + 1）
3. review_status 枚举：pending → approved / rejected
4. hash_value 由上传时计算（SHA-256），用于去重检测
5. 写操作写 Timeline（entityType = `"document_file"`）
6. 删除时同时调用 StorageAdapter.remove

## 测试要求

- upload + list + get + review + delete 全覆盖
- version_no 自增验证
- review 状态校验（pending 才可审核）
- StorageAdapter mock
- 多租户隔离

## DoD

- [ ] 5 个 API 端点
- [ ] 集成 StorageAdapter
- [ ] version_no 自增
- [ ] review 流程
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
