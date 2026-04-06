# F3: Mobile Inbox Feature（多语言咨询/消息）

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | F3 |
| Phase | F — Mobile 端业务 Feature |
| 前置依赖 | F1 (Auth)、D4c (Conversations API)、D4d (Messages API) |
| 后续解锁 | 无 |
| 预估工时 | 1.5-2 天 |

## 目标

实现会话列表 + 消息详情功能，支持多语言消息展示（对应 Prototype inbox 页面）。

## 范围

### 需要创建的文件

```
packages/mobile/src/features/inbox/
  model/
    useInboxViewModel.ts
    useInboxViewModel.test.tsx
    useConversationViewModel.ts
    useConversationViewModel.test.tsx
  ui/
    InboxScreen.tsx
    ConversationScreen.tsx

packages/mobile/src/domain/inbox/
  InboxRepository.ts
  Conversation.ts
  Message.ts

packages/mobile/src/data/inbox/
  InboxApi.ts
  InboxRepositoryImpl.ts
```

### 不可修改的目录

- `packages/server/`

## 设计

### Domain 层

```ts
export type InboxRepository = {
  listConversations(): Promise<ConversationSummary[]>;
  getMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, text: string): Promise<Message>;
};

export type Message = {
  id: string;
  senderType: "app_user" | "staff";
  originalText: string;
  originalLanguage: string;
  translatedText: string | null;   // 按用户偏好语言选择对应译文
  translationStatus: string;
  createdAt: string;
};
```

### 多语言展示逻辑

```ts
// 根据 AppUser.preferredLanguage 选择展示译文
function getDisplayText(message: Message, preferredLang: string): string {
  if (message.originalLanguage === preferredLang) return message.originalText;
  // 选择对应译文，如无则展示原文
  return message.translatedText ?? message.originalText;
}
```

### UI 参考

- `packages/prototype/src/pages/inbox/` — 原型页面

## 实现规范

1. ConversationScreen 底部输入框 → 调用 sendMessage
2. 消息列表支持「原文/译文」切换按钮
3. translationStatus = "pending" 时显示翻译中指示器
4. 新消息轮询（MVP）：每 5s 查询新消息，后续可改 WebSocket

## 测试要求

- 测试 ViewModel：mock InboxRepository
- 覆盖会话列表 / 消息加载 / 发送消息 / 多语言切换
- 验证 translationStatus = "pending" 时展示正确

## DoD

- [ ] InboxScreen + ConversationScreen 可渲染
- [ ] 消息收发流程跑通（mock API）
- [ ] 多语言展示正确（原文/译文切换）
- [ ] 翻译中状态正确展示
- [ ] ViewModel 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/mobile
npx jest --testPathPattern=inbox
npm run guard
```
