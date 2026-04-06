import test from "node:test";
import assert from "node:assert/strict";

import { createTranslationAdapter } from "./translationAdapter.js";
import type {
  TranslationAdapter,
  TranslationConfig,
} from "./translationAdapter.js";

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function passthroughAdapter(): TranslationAdapter {
  return createTranslationAdapter({ provider: "passthrough" });
}

/* ================================================================== */
/*  1. 工厂 — 基本行为                                                 */
/* ================================================================== */

void test("createTranslationAdapter: passthrough provider 返回 adapter", () => {
  const adapter = passthroughAdapter();
  assert.ok(adapter);
  assert.strictEqual(typeof adapter.translate, "function");
});

void test("createTranslationAdapter: openai provider 返回 adapter", () => {
  const adapter = createTranslationAdapter({
    provider: "openai",
    apiKey: "sk-test",
  });
  assert.ok(adapter);
  assert.strictEqual(typeof adapter.translate, "function");
});

void test("createTranslationAdapter: deepl provider 返回 adapter", () => {
  const adapter = createTranslationAdapter({
    provider: "deepl",
    apiKey: "dl-test",
  });
  assert.ok(adapter);
  assert.strictEqual(typeof adapter.translate, "function");
});

void test("createTranslationAdapter: unknown provider throws", () => {
  assert.throws(
    () =>
      createTranslationAdapter({
        provider: "google",
      } as unknown as TranslationConfig),
    /Unknown translation provider/,
  );
});

/* ================================================================== */
/*  2. Passthrough 策略 — 核心功能                                      */
/* ================================================================== */

void test("passthrough: 返回原文 translatedText === text", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("Hello", "en", "ja");
  assert.strictEqual(result.translatedText, "Hello");
});

void test("passthrough: fromLang 正确传递", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("こんにちは", "ja", "en");
  assert.strictEqual(result.fromLang, "ja");
});

void test("passthrough: toLang 正确传递", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("你好", "zh", "en");
  assert.strictEqual(result.toLang, "en");
});

void test("passthrough: 完整结果结构验证", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("text", "en", "zh");
  assert.deepStrictEqual(result, {
    translatedText: "text",
    fromLang: "en",
    toLang: "zh",
  });
});

/* ================================================================== */
/*  3. Passthrough — 多语言支持                                         */
/* ================================================================== */

void test("passthrough: ja → en", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("テスト", "ja", "en");
  assert.strictEqual(result.translatedText, "テスト");
  assert.strictEqual(result.fromLang, "ja");
  assert.strictEqual(result.toLang, "en");
});

void test("passthrough: zh → ja", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("测试", "zh", "ja");
  assert.strictEqual(result.translatedText, "测试");
  assert.strictEqual(result.fromLang, "zh");
  assert.strictEqual(result.toLang, "ja");
});

void test("passthrough: en → zh", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("Test", "en", "zh");
  assert.strictEqual(result.translatedText, "Test");
  assert.strictEqual(result.fromLang, "en");
  assert.strictEqual(result.toLang, "zh");
});

/* ================================================================== */
/*  4. 边界值与异常场景                                                  */
/* ================================================================== */

void test("passthrough: 空字符串 text 不抛异常", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("", "en", "ja");
  assert.strictEqual(result.translatedText, "");
});

void test("passthrough: 超长文本不抛异常", async () => {
  const adapter = passthroughAdapter();
  const longText = "あ".repeat(10_000);
  const result = await adapter.translate(longText, "ja", "en");
  assert.strictEqual(result.translatedText, longText);
});

void test("passthrough: 特殊字符（换行/制表符/HTML）不抛异常", async () => {
  const adapter = passthroughAdapter();
  const text = "line1\nline2\t<script>alert('xss')</script>";
  const result = await adapter.translate(text, "en", "ja");
  assert.strictEqual(result.translatedText, text);
});

void test("passthrough: emoji 文本不抛异常", async () => {
  const adapter = passthroughAdapter();
  const text = "Hello 🌍🎉";
  const result = await adapter.translate(text, "en", "zh");
  assert.strictEqual(result.translatedText, text);
});

void test("passthrough: 空 fromLang/toLang 不抛异常", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("text", "", "");
  assert.strictEqual(result.fromLang, "");
  assert.strictEqual(result.toLang, "");
});

/* ================================================================== */
/*  5. 返回值类型与 Promise 行为                                        */
/* ================================================================== */

void test("passthrough: translate 返回 Promise", async () => {
  const adapter = passthroughAdapter();
  const promise = adapter.translate("text", "en", "ja");
  assert.ok(promise instanceof Promise);
  await promise;
});

void test("passthrough: 返回值包含且仅包含三个字段", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("text", "en", "ja");
  const keys = Object.keys(result).sort();
  assert.deepStrictEqual(keys, ["fromLang", "toLang", "translatedText"]);
});

/* ================================================================== */
/*  6. 并发安全性                                                      */
/* ================================================================== */

void test("passthrough: 并发 translate 不抛异常", async () => {
  const adapter = passthroughAdapter();
  const promises = Array.from({ length: 50 }, (_, i) =>
    adapter.translate(`msg-${String(i)}`, "en", "ja"),
  );
  const results = await Promise.all(promises);
  assert.strictEqual(results.length, 50);
  results.forEach((r, i) => {
    assert.strictEqual(r.translatedText, `msg-${String(i)}`);
  });
});

/* ================================================================== */
/*  7. 适配器独立性                                                    */
/* ================================================================== */

void test("不同 adapter 实例互不影响", async () => {
  const a1 = passthroughAdapter();
  const a2 = passthroughAdapter();
  const r1 = await a1.translate("from-a1", "en", "ja");
  const r2 = await a2.translate("from-a2", "ja", "en");
  assert.strictEqual(r1.translatedText, "from-a1");
  assert.strictEqual(r2.translatedText, "from-a2");
  assert.strictEqual(r1.fromLang, "en");
  assert.strictEqual(r2.fromLang, "ja");
});

/* ================================================================== */
/*  8. OpenAI / DeepL 占位 — reject 验证                               */
/* ================================================================== */

void test("openai: translate 抛出未实现错误", async () => {
  const adapter = createTranslationAdapter({
    provider: "openai",
    apiKey: "sk-test",
  });
  await assert.rejects(
    () => adapter.translate("text", "en", "ja"),
    /OpenAI translation adapter not implemented/,
  );
});

void test("deepl: translate 抛出未实现错误", async () => {
  const adapter = createTranslationAdapter({
    provider: "deepl",
    apiKey: "dl-test",
  });
  await assert.rejects(
    () => adapter.translate("text", "en", "ja"),
    /DeepL translation adapter not implemented/,
  );
});

/* ================================================================== */
/*  9. 工厂 — apiKey 可选处理                                           */
/* ================================================================== */

void test("openai: 无 apiKey 也能创建 adapter", () => {
  const adapter = createTranslationAdapter({ provider: "openai" });
  assert.ok(adapter);
});

void test("deepl: 无 apiKey 也能创建 adapter", () => {
  const adapter = createTranslationAdapter({ provider: "deepl" });
  assert.ok(adapter);
});

/* ================================================================== */
/*  10. fromLang === toLang（同语言翻译）                                */
/* ================================================================== */

void test("passthrough: fromLang === toLang 不抛异常", async () => {
  const adapter = passthroughAdapter();
  const result = await adapter.translate("same", "en", "en");
  assert.strictEqual(result.translatedText, "same");
  assert.strictEqual(result.fromLang, "en");
  assert.strictEqual(result.toLang, "en");
});

/* ================================================================== */
/*  11. 输入不可变性                                                    */
/* ================================================================== */

void test("passthrough: 不修改输入参数", async () => {
  const adapter = passthroughAdapter();
  const text = "original";
  const from = "en";
  const to = "ja";
  await adapter.translate(text, from, to);
  assert.strictEqual(text, "original");
  assert.strictEqual(from, "en");
  assert.strictEqual(to, "ja");
});
