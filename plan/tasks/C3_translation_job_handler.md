# C3: Translation Job Handler

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | C3 |
| Phase | C — 异步任务 Handler 实装 |
| 前置依赖 | B3 (Translation Adapter)、D1 (Portal Migration — messages 表) |
| 后续解锁 | C5 (Worker 注册) |
| 预估工时 | 0.5 天 |

## 目标

实现 Translation Job Handler：从队列取翻译任务 → 调用 TranslationAdapter → 回写 Message 译文字段。

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/jobs/handlers/translationJobHandler.ts`
- `packages/server/src/modules/core/jobs/handlers/translationJobHandler.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/mobile/`

## 设计

### Job 类型

- 队列名：`translation_jobs`
- Job payload：

```ts
{
  orgId: string;
  messageId: string;
  originalText: string;
  originalLanguage: string;       // "zh" | "en" | "ja" | ...
  targetLanguages: string[];      // ["ja", "zh", "en"]
}
```

### Handler 签名

```ts
export async function handleTranslationJob(
  pool: Pool,
  translationAdapter: TranslationAdapter,
  job: QueueJob<TranslationJobPayload>,
): Promise<void>;
```

### 处理流程

```
1. 取出 job payload
2. 对 targetLanguages 中每种语言调用 translationAdapter.translate()
3. 回写 messages 表对应译文字段：
   - ja → translated_text_ja
   - zh → translated_text_zh
   - en → translated_text_en
4. 更新 translation_status = 'completed'
5. 如翻译失败：更新 translation_status = 'failed'，抛异常
```

### 关键原则（来自架构指南 §8.3）

- **消息必须保留原文**，不允许只存译文
- **翻译走异步 Job**，不在同步接口中做翻译
- 支持重翻（重新入队 translation_job 即可）

## 实现规范

1. 跳过 `originalLanguage` 等于目标语言的翻译
2. 部分语言翻译失败不影响其余：记录哪些成功哪些失败
3. 全部成功 → `completed`；部分失败 → `partial`；全部失败 → `failed`

## 测试要求

- mock `Pool` / `TranslationAdapter`
- 验证各语言翻译结果正确回写
- 验证跳过 originalLanguage = targetLanguage
- 验证部分失败场景：status = partial
- 验证全部失败场景：status = failed + 抛异常

## 是否涉及异步任务

是 — 本身是 Job Handler

## DoD

- [ ] handleTranslationJob 函数已实现
- [ ] 译文正确回写 messages 表对应列
- [ ] translationStatus 正确更新
- [ ] 跳过同语言翻译
- [ ] 部分失败隔离
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=translationJobHandler
npm run guard
```
