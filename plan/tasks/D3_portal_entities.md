# D3: Portal 类型定义

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D3 |
| Phase | D — Portal 域对象建模 |
| 前置依赖 | D1 (Portal Migration) |
| 后续解锁 | D4 (Portal Modules) |
| 预估工时 | 0.5 天 |

## 目标

定义 Portal 域全部 6 个实体的 TypeScript 类型 + DB 行映射函数。

## 范围

### 需要创建的文件

- `packages/server/src/modules/portal/model/portalEntities.ts`
- `packages/server/src/modules/portal/model/portalEntities.test.ts`

### 不可修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 核心类型已冻结
- `packages/mobile/`

## 设计

### 类型定义（参考 coreEntities.ts 风格）

```ts
export type AppUser = {
  id: string;
  preferredLanguage: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Lead = {
  id: string;
  orgId: string | null;
  appUserId: string;
  source: string;
  language: string;
  status: string;              // "new" | "assigned" | "converted" | "closed"
  assignedOrgId: string | null;
  assignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  leadId: string | null;
  appUserId: string;
  orgId: string | null;
  channel: string;
  preferredLanguage: string;
  status: string;              // "open" | "closed"
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  orgId: string | null;
  senderType: string;          // "app_user" | "staff"
  senderId: string;
  originalLanguage: string;
  originalText: string;
  translatedTextJa: string | null;
  translatedTextZh: string | null;
  translatedTextEn: string | null;
  translationStatus: string;   // "pending" | "completed" | "partial" | "failed"
  createdAt: string;
};

export type UserDocument = {
  id: string;
  appUserId: string;
  orgId: string | null;
  leadId: string | null;
  caseId: string | null;
  fileKey: string;
  fileName: string;
  docType: string;
  status: string;
  uploadedAt: string;
};

export type IntakeForm = {
  id: string;
  appUserId: string;
  leadId: string | null;
  caseDraftId: string | null;
  formData: Record<string, unknown>;
  status: string;              // "draft" | "submitted" | "reviewed"
  createdAt: string;
  updatedAt: string;
};
```

### DB 行映射函数

为每个类型提供 `mapXxxRow` 函数（参考 `mapJobRow` 模式）：
- `mapAppUserRow`
- `mapLeadRow`
- `mapConversationRow`
- `mapMessageRow`
- `mapUserDocumentRow`
- `mapIntakeFormRow`

### TimelineEntityType 扩展

在 Portal 类型文件中定义 Portal 侧的 entity type：

```ts
export type PortalTimelineEntityType =
  | "app_user" | "lead" | "conversation" | "message" | "user_document" | "intake_form";
```

## 实现规范

1. **不修改 coreEntities.ts** — Portal 类型独立定义
2. 所有 map 函数处理 null / timestamp 转换
3. 导出所有类型和 map 函数

## 测试要求

- 测试所有 mapXxxRow 函数
- 验证 null 值正确处理
- 验证 timestamp 类型转换

## DoD

- [ ] 6 个 Portal 实体类型已定义
- [ ] 6 个 mapXxxRow 函数已实现
- [ ] Message 包含 originalText + 三语译文 + translationStatus
- [ ] 不修改 coreEntities.ts
- [ ] 单测覆盖所有 map 函数
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=portalEntities
npm run guard
```
