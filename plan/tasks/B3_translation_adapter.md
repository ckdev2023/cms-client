# B3: Translation Adapter

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | B3 |
| Phase | B — 建立基础设施 Adapter |
| 前置依赖 | 无 |
| 后续解锁 | C3 (Translation Job Handler) |
| 预估工时 | 0.5 天 |

## 目标

提供统一翻译抽象接口，初始用直通占位（返回原文），后续接入 AI 翻译 API。

## 范围

### 需要创建的文件

- `packages/server/src/infra/translation/translationAdapter.ts`
- `packages/server/src/infra/translation/translationAdapter.test.ts`

### 不可修改的目录

- `packages/server/src/modules/`
- `packages/mobile/`

## 设计

### 接口

```ts
export type TranslationResult = {
  translatedText: string;
  fromLang: string;
  toLang: string;
};

export type TranslationAdapter = {
  translate(text: string, fromLang: string, toLang: string): Promise<TranslationResult>;
};
```

### 工厂

```ts
export function createTranslationAdapter(config: TranslationConfig): TranslationAdapter;
```

### 策略

| provider | 说明 |
|---|---|
| passthrough | 直通：translatedText = text（开发占位） |
| openai | 后续接入 OpenAI / Claude API |
| deepl | 后续接入 DeepL API |

### TranslationConfig

```ts
export type TranslationConfig = {
  provider: "passthrough" | "openai" | "deepl";
  apiKey?: string;
};
```

## 实现规范

1. 放在 `infra/translation/`
2. passthrough 策略：直接返回原文，标记 `fromLang`/`toLang`
3. 后续 provider 可留 TODO 占位
4. 支持的语言至少：`ja`（日语）、`zh`（中文）、`en`（英语）

## 环境变量追加

在 `packages/server/src/config/env.ts` 中追加：

```ts
translationProvider: process.env.TRANSLATION_PROVIDER ?? "passthrough",
translationApiKey: process.env.TRANSLATION_API_KEY ?? "",
```

## 测试要求

- 测试 passthrough 策略：输入 = 输出
- 验证 fromLang/toLang 正确传递

## 是否涉及异步任务

否（本模块被 C3 Translation Job Handler 调用）

## DoD

- [ ] TranslationAdapter 接口已定义
- [ ] passthrough 策略实现完整
- [ ] env.ts 已追加 translation 配置
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=translationAdapter
npm run guard
```
