# D4d: Messages 模块（多语言消息）

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D4d |
| Phase | D — Portal Modules |
| 前置依赖 | D4c (Conversations)、C3 (Translation Job — 至少 handler 已实现) |
| 后续解锁 | F3 (Mobile Inbox Feature) |
| 预估工时 | 1 天 |

## 目标

实现消息发送 + 异步翻译链路：落库原文 → 入队 translation_job → Worker 回写译文。

## 范围

### 需要创建的文件

- `packages/server/src/modules/portal/messages/messages.service.ts`
- `packages/server/src/modules/portal/messages/messages.controller.ts`
- `packages/server/src/modules/portal/messages/messages.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/mobile/`

## API 设计

| 方法 | 路径 | 角色/认证 | 说明 |
|---|---|---|---|
| POST | `/messages` | AppUser / staff+ | 发送消息（同步落库 + 异步翻译） |
| GET | `/messages` | AppUser 本人 / staff+ | 按 conversationId 查询消息列表 |
| GET | `/messages/:id` | AppUser 本人 / staff+ | 查看单条消息 |

## 核心流程（架构指南 §8.3）

```
1. 用户发消息 → POST /messages
2. 同步落库：保存 originalText + originalLanguage + translationStatus="pending"
3. 推入 translation_job 队列（payload: messageId, originalText, originalLanguage, targetLanguages）
4. 返回消息对象（translationStatus: "pending"）
5. Worker 异步翻译后回写译文（C3 已实现）
6. 前端轮询或 WebSocket 获取译文更新
```

## 实现规范

1. **发送消息同步部分**：
   - 插入 messages 表（originalText + originalLanguage）
   - translatedTextJa / translatedTextZh / translatedTextEn 初始为 null
   - translationStatus 初始为 "pending"
2. **异步部分**：
   - 入队 `translation_jobs`（通过 RedisQueue 或 JobsService）
   - targetLanguages 默认 `["ja", "zh", "en"]`，排除 originalLanguage
3. **查询消息**：
   - 按 conversationId 倒序
   - 返回完整消息对象（含已有译文）
4. senderType: `"app_user"` 或 `"staff"`

## 关键原则

- **消息必须保留原文** — 不允许只存译文
- **翻译走异步 Job** — 不在 POST /messages 同步接口中调用翻译
- 支持重翻：后续可重新入队 translation_job

## 测试要求

- mock `Pool` / `RedisQueue`
- 验证发送消息时 originalText 正确落库
- 验证 translation_job 正确入队
- 验证 translationStatus 初始为 "pending"
- 验证查询按 conversationId 过滤

## 是否涉及异步任务

是 — 发送消息时入队 translation_job

## DoD

- [ ] 3 个 API 端点可调通
- [ ] 消息落库保留原文
- [ ] translation_job 正确入队
- [ ] 查询返回完整消息（含译文状态）
- [ ] org_id 隔离正确
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=messages
npm run guard
```
