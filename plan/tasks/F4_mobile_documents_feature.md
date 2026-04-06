# F4: Mobile Documents Feature

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | F4 |
| Phase | F — Mobile 端业务 Feature |
| 前置依赖 | F1 (Auth)、D4e (UserDocuments API) |
| 后续解锁 | 无 |
| 预估工时 | 1 天 |

## 目标

实现待补资料查看 + 文件上传功能（对应 Prototype todos 页面）。

## 范围

### 需要创建的文件

```
packages/mobile/src/features/documents/
  model/
    useDocumentListViewModel.ts
    useDocumentListViewModel.test.tsx
    useDocumentUploadViewModel.ts
    useDocumentUploadViewModel.test.tsx
  ui/
    DocumentListScreen.tsx
    DocumentUploadScreen.tsx

packages/mobile/src/domain/documents/
  DocumentRepository.ts
  UserDocument.ts

packages/mobile/src/data/documents/
  DocumentApi.ts
  DocumentRepositoryImpl.ts
```

### 不可修改的目录

- `packages/server/`

## 设计

### Domain 层

```ts
export type DocumentRepository = {
  listMyDocuments(filters?: { caseId?: string }): Promise<UserDocumentSummary[]>;
  uploadDocument(file: FileInput, metadata: DocMetadata): Promise<UserDocument>;
  getDownloadUrl(docId: string): Promise<string>;
};
```

### UI 参考

- `packages/prototype/src/pages/todos/` — 原型页面
- 展示待补资料清单（来自 document_items API）+ 已上传资料（user_documents API）

## 实现规范

1. DocumentListScreen 展示两类：
   - 待补资料（从 `/document-items` 获取，status != "received"）
   - 已上传资料（从 `/user-documents` 获取）
2. 上传使用 React Native Image/Document Picker
3. 上传后自动刷新列表

## 测试要求

- 测试 ViewModel：mock DocumentRepository
- 覆盖列表加载 / 上传成功 / 上传失败

## DoD

- [ ] DocumentListScreen + DocumentUploadScreen 可渲染
- [ ] 待补资料 + 已上传资料正确展示
- [ ] 上传流程跑通（mock API）
- [ ] ViewModel 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/mobile
npx jest --testPathPattern=document
npm run guard
```
