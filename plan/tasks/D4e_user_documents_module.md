# D4e: UserDocuments 模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D4e |
| Phase | D — Portal Modules |
| 前置依赖 | D4a (AppUsers)、B1 (File Storage Adapter) |
| 后续解锁 | F4 (Mobile Document Feature) |
| 预估工时 | 0.5 天 |

## 目标

为用户端提供文件上传 + 资料管理 API，与事务所后台 DocumentItem 分离但可关联。

## 范围

### 需要创建的文件

- `packages/server/src/modules/portal/user-documents/userDocuments.service.ts`
- `packages/server/src/modules/portal/user-documents/userDocuments.controller.ts`
- `packages/server/src/modules/portal/user-documents/userDocuments.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/`
- `packages/mobile/`

## API 设计

| 方法 | 路径 | 角色/认证 | 说明 |
|---|---|---|---|
| POST | `/user-documents/upload` | AppUser | 上传文件（multipart/form-data） |
| GET | `/user-documents` | AppUser 本人 / staff+ | 列表（按 leadId / caseId 筛选） |
| GET | `/user-documents/:id` | AppUser 本人 / staff+ | 查看详情 |
| GET | `/user-documents/:id/download-url` | AppUser 本人 / staff+ | 获取签名下载 URL |
| DELETE | `/user-documents/:id` | AppUser 本人 / manager+ | 删除 |

## 实现规范

1. 上传流程：
   - 接收文件 → 调用 `StorageAdapter.upload(key, buffer, contentType)`
   - key 格式：`user-docs/{appUserId}/{timestamp}_{filename}`
   - 插入 user_documents 表
2. 下载 URL：调用 `StorageAdapter.getSignedUrl(fileKey, 3600)`
3. 用户端按 app_user_id 过滤，事务所后台按 org_id（TenantDb）
4. 删除：调用 `StorageAdapter.remove(fileKey)` + 删除 DB 记录

## 关键原则

- **user_documents 与 document_items 分离**
- user_documents 是用户上传的原始资料
- document_items 是案件下的结构化资料项
- 后续可通过 caseId 关联

## 测试要求

- mock `Pool` / `StorageAdapter`
- 验证上传时 StorageAdapter.upload 被调用
- 验证 download-url 返回签名链接
- 验证按 app_user_id 过滤

## DoD

- [ ] 5 个 API 端点可调通
- [ ] 文件正确存储到 StorageAdapter
- [ ] 签名下载 URL 可获取
- [ ] 与 DocumentItem 分离
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=userDocuments
npm run guard
```
