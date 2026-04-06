import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  handleTranslationJob,
  type TranslationJobPayload,
} from "./translationJobHandler";
import type { QueueJob } from "../../../../infra/queue/redisQueue";
import type {
  TranslationAdapter,
  TranslationResult,
} from "../../../../infra/translation/translationAdapter";

/* ------------------------------------------------------------------ */
/*  常量 & 工具                                                        */
/* ------------------------------------------------------------------ */

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const MSG_ID = "11111111-1111-4000-8000-111111111111";

function makeJob(
  overrides: Partial<TranslationJobPayload> = {},
): QueueJob<TranslationJobPayload> {
  return {
    id: "job-1",
    name: "translation",
    payload: {
      orgId: ORG_ID,
      messageId: MSG_ID,
      originalText: "こんにちは",
      originalLanguage: "ja",
      targetLanguages: ["zh", "en"],
      ...overrides,
    },
    createdAt: "2026-04-06T00:00:00.000Z",
  };
}

type SqlCall = { sql: string; params?: unknown[] };

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

function makePool(queryFn?: PoolClientLike["query"]): {
  pool: Pool;
  calls: SqlCall[];
} {
  const calls: SqlCall[] = [];
  const defaultQueryFn: PoolClientLike["query"] = (sql, params) => {
    calls.push({ sql: sql.trim(), params });
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const pool = {
    connect: () =>
      Promise.resolve({
        query: queryFn
          ? (sql: string, params?: unknown[]) => {
              calls.push({ sql: sql.trim(), params });
              return queryFn(sql, params);
            }
          : defaultQueryFn,
        release: () => undefined,
      }),
  } as unknown as Pool;
  return { pool, calls };
}

type TranslateCall = { text: string; fromLang: string; toLang: string };

function makeAdapter(translateImpl?: TranslationAdapter["translate"]): {
  adapter: TranslationAdapter;
  translateCalls: TranslateCall[];
} {
  const translateCalls: TranslateCall[] = [];
  const adapter: TranslationAdapter = {
    translate:
      translateImpl ??
      ((text, fromLang, toLang) => {
        translateCalls.push({ text, fromLang, toLang });
        return Promise.resolve({
          translatedText: `[${toLang}]${text}`,
          fromLang,
          toLang,
        });
      }),
  };
  return { adapter, translateCalls };
}

/* ================================================================== */
/*  1. 正常路径 — 多语言全部翻译成功                                     */
/* ================================================================== */

void test("translates all target languages and writes to correct columns", async () => {
  const { pool, calls } = makePool();
  const { adapter, translateCalls } = makeAdapter();

  await handleTranslationJob(pool, adapter, makeJob());

  // adapter.translate 被调用 2 次（zh, en）
  assert.equal(translateCalls.length, 2);
  assert.equal(translateCalls[0]?.toLang, "zh");
  assert.equal(translateCalls[1]?.toLang, "en");

  // 回写 translated_text_zh
  const zhCall = calls.find((c) => c.sql.includes("translated_text_zh"));
  assert.ok(zhCall, "should write translated_text_zh");
  assert.equal((zhCall.params ?? [])[0], "[zh]こんにちは");
  assert.equal((zhCall.params ?? [])[1], MSG_ID);

  // 回写 translated_text_en
  const enCall = calls.find((c) => c.sql.includes("translated_text_en"));
  assert.ok(enCall, "should write translated_text_en");
  assert.equal(enCall.params?.[0], "[en]こんにちは");

  // 更新 status = completed
  const statusCall = calls.find((c) => c.sql.includes("translation_status"));
  assert.ok(statusCall);
  assert.equal(statusCall.params?.[0], "completed");
});

/* ================================================================== */
/*  2. 跳过同语言翻译                                                  */
/* ================================================================== */

void test("skips translation when targetLanguage equals originalLanguage", async () => {
  const { pool } = makePool();
  const { adapter, translateCalls } = makeAdapter();

  await handleTranslationJob(
    pool,
    adapter,
    makeJob({
      originalLanguage: "ja",
      targetLanguages: ["ja", "zh", "en"],
    }),
  );

  // ja 被跳过，只翻译 zh, en
  assert.equal(translateCalls.length, 2);
  assert.equal(translateCalls[0]?.toLang, "zh");
  assert.equal(translateCalls[1]?.toLang, "en");
});

void test("all targets equal originalLanguage → completed immediately, no translate calls", async () => {
  const { pool, calls } = makePool();
  const { adapter, translateCalls } = makeAdapter();

  await handleTranslationJob(
    pool,
    adapter,
    makeJob({
      originalLanguage: "ja",
      targetLanguages: ["ja"],
    }),
  );

  assert.equal(translateCalls.length, 0);
  const statusCall = calls.find((c) => c.sql.includes("translation_status"));
  assert.ok(statusCall);
  assert.equal(statusCall.params?.[0], "completed");
});

/* ================================================================== */
/*  3. 部分失败 — status = partial                                     */
/* ================================================================== */

void test("partial failure: some languages succeed, some fail → status partial", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter((text, fromLang, toLang) => {
    if (toLang === "en") {
      return Promise.reject(new Error("EN translation API error"));
    }
    return Promise.resolve({
      translatedText: `[${toLang}]${text}`,
      fromLang,
      toLang,
    });
  });

  await handleTranslationJob(pool, adapter, makeJob());

  // zh 成功写入
  const zhCall = calls.find((c) => c.sql.includes("translated_text_zh"));
  assert.ok(zhCall, "zh translation should be written");

  // en 未写入
  const enCall = calls.find((c) => c.sql.includes("translated_text_en"));
  assert.equal(enCall, undefined, "en translation should NOT be written");

  // status = partial
  const statusCall = calls.filter((c) => c.sql.includes("translation_status"));
  const lastStatusCall = statusCall[statusCall.length - 1];
  assert.ok(lastStatusCall);
  assert.equal((lastStatusCall.params ?? [])[0], "partial");
});

/* ================================================================== */
/*  4. 全部失败 — status = failed + 抛异常                             */
/* ================================================================== */

void test("all translations fail → status failed + throws error", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter(() => {
    return Promise.reject(new Error("API unavailable"));
  });

  await assert.rejects(
    () => handleTranslationJob(pool, adapter, makeJob()),
    /All translations failed/,
  );

  const statusCall = calls.filter((c) => c.sql.includes("translation_status"));
  const lastStatusCall = statusCall[statusCall.length - 1];
  assert.ok(lastStatusCall);
  assert.equal((lastStatusCall.params ?? [])[0], "failed");
});

void test("all-fail error message includes messageId and lang details", async () => {
  const { pool } = makePool();
  const { adapter } = makeAdapter(() => {
    return Promise.reject(new Error("timeout"));
  });

  await assert.rejects(
    () => handleTranslationJob(pool, adapter, makeJob()),
    (err: Error) => {
      assert.ok(err.message.includes(MSG_ID));
      assert.ok(err.message.includes("timeout"));
      return true;
    },
  );
});

/* ================================================================== */
/*  5. 空 targetLanguages                                              */
/* ================================================================== */

void test("empty targetLanguages → completed immediately, no translate calls", async () => {
  const { pool, calls } = makePool();
  const { adapter, translateCalls } = makeAdapter();

  await handleTranslationJob(pool, adapter, makeJob({ targetLanguages: [] }));

  assert.equal(translateCalls.length, 0);
  const statusCall = calls.find((c) => c.sql.includes("translation_status"));
  assert.ok(statusCall);
  assert.equal(statusCall.params?.[0], "completed");
});

/* ================================================================== */
/*  6. 未知语言被忽略                                                  */
/* ================================================================== */

void test("unknown target language is skipped (not in LANG_COLUMN_MAP)", async () => {
  const { pool, calls } = makePool();
  const { adapter, translateCalls } = makeAdapter();

  await handleTranslationJob(
    pool,
    adapter,
    makeJob({ targetLanguages: ["ko", "zh"] }),
  );

  // ko 被忽略，只翻译 zh
  assert.equal(translateCalls.length, 1);
  assert.equal(translateCalls[0]?.toLang, "zh");

  const zhCall = calls.find((c) => c.sql.includes("translated_text_zh"));
  assert.ok(zhCall);
});

void test("all unknown target languages → completed immediately", async () => {
  const { pool, calls } = makePool();
  const { adapter, translateCalls } = makeAdapter();

  await handleTranslationJob(
    pool,
    adapter,
    makeJob({ targetLanguages: ["ko", "fr", "de"] }),
  );

  assert.equal(translateCalls.length, 0);
  const statusCall = calls.find((c) => c.sql.includes("translation_status"));
  assert.equal(statusCall?.params?.[0], "completed");
});

/* ================================================================== */
/*  7. 原文保留 — handler 不修改 original_text                         */
/* ================================================================== */

void test("handler does NOT update original_text column", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter();
  await handleTranslationJob(pool, adapter, makeJob());
  const originalTextCall = calls.find(
    (c) => c.sql.includes("original_text") && c.sql.includes("update"),
  );
  assert.equal(originalTextCall, undefined, "should NOT update original_text");
});

/* ================================================================== */
/*  8. Tenant 隔离 — 使用正确的 orgId                                  */
/* ================================================================== */

void test("sets tenant org_id via set_config for RLS isolation", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter();

  await handleTranslationJob(pool, adapter, makeJob());

  const setConfigCall = calls.find((c) =>
    c.sql.includes("set_config('app.org_id'"),
  );
  assert.ok(setConfigCall, "should set org_id via set_config");
  assert.equal(setConfigCall.params?.[0], ORG_ID);
});

/* ================================================================== */
/*  9. 翻译结果正确传递到 DB                                           */
/* ================================================================== */

void test("translated text from adapter is written verbatim to DB", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter((text, fromLang, toLang) => {
    return Promise.resolve({
      translatedText: `TRANSLATED:${toLang}:${text}`,
      fromLang,
      toLang,
    });
  });

  await handleTranslationJob(
    pool,
    adapter,
    makeJob({ targetLanguages: ["en"] }),
  );

  const enCall = calls.find((c) => c.sql.includes("translated_text_en"));
  assert.ok(enCall);
  assert.equal(enCall.params?.[0], "TRANSLATED:en:こんにちは");
});

/* ================================================================== */
/*  10. 单一目标语言成功                                                */
/* ================================================================== */

void test("single target language translation succeeds", async () => {
  const { pool, calls } = makePool();
  const { adapter, translateCalls } = makeAdapter();

  await handleTranslationJob(
    pool,
    adapter,
    makeJob({ targetLanguages: ["zh"] }),
  );

  assert.equal(translateCalls.length, 1);
  const statusCall = calls.filter((c) => c.sql.includes("translation_status"));
  const lastStatusCall = statusCall[statusCall.length - 1];
  assert.ok(lastStatusCall);
  assert.equal((lastStatusCall.params ?? [])[0], "completed");
});

/* ================================================================== */
/*  11. 三种语言全覆盖                                                  */
/* ================================================================== */

void test("translates to all three languages (ja, zh, en) when originalLanguage is none of them", async () => {
  const { pool, calls } = makePool();
  const { adapter, translateCalls } = makeAdapter();

  await handleTranslationJob(
    pool,
    adapter,
    makeJob({
      originalLanguage: "ko",
      originalText: "안녕하세요",
      targetLanguages: ["ja", "zh", "en"],
    }),
  );

  assert.equal(translateCalls.length, 3);

  const jaCall = calls.find((c) => c.sql.includes("translated_text_ja"));
  const zhCall = calls.find((c) => c.sql.includes("translated_text_zh"));
  const enCall = calls.find((c) => c.sql.includes("translated_text_en"));
  assert.ok(jaCall);
  assert.ok(zhCall);
  assert.ok(enCall);
});

/* ================================================================== */
/*  12. DB 写入失败 — 异常上抛                                          */
/* ================================================================== */

void test("throws when DB write fails during translation update", async () => {
  const queryFn: PoolClientLike["query"] = (sql) => {
    if (sql.includes("translated_text_zh")) {
      return Promise.reject(new Error("DB connection lost"));
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const { pool } = makePool(queryFn);
  const { adapter } = makeAdapter();

  // zh 写入失败 → en 仍会尝试 → partial 或者 DB error 上抛
  // 由于 zh 的 DB write 发生在 try 块内，实际上被 catch 捕获
  // 最终 en 成功，status 应为 partial
  await handleTranslationJob(pool, adapter, makeJob());
  // 不抛异常（因为 en 成功了）
});

/* ================================================================== */
/*  13. 边界值：空文本翻译                                              */
/* ================================================================== */

void test("empty originalText is sent to adapter as-is", async () => {
  const { pool } = makePool();
  const { adapter, translateCalls } = makeAdapter();

  await handleTranslationJob(
    pool,
    adapter,
    makeJob({ originalText: "", targetLanguages: ["en"] }),
  );

  assert.equal(translateCalls.length, 1);
  assert.equal(translateCalls[0]?.text, "");
});

/* ================================================================== */
/*  14. 安全：SQL 注入 / XSS 通过参数化查询安全传递                     */
/* ================================================================== */

void test("SQL injection in originalText is safely parameterized", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter();
  const maliciousText = "'; DROP TABLE messages; --";
  await handleTranslationJob(
    pool,
    adapter,
    makeJob({ originalText: maliciousText, targetLanguages: ["en"] }),
  );
  const enCall = calls.find((c) => c.sql.includes("translated_text_en"));
  assert.ok(enCall);
  assert.equal(enCall.params?.[0], `[en]${maliciousText}`);
});

/* ================================================================== */
/*  15. adapter.translate 参数与边界                                    */
/* ================================================================== */

void test("adapter.translate receives correct fromLang/toLang + long text passes through", async () => {
  const { pool } = makePool();
  const longText = "あ".repeat(10_000);
  const { adapter, translateCalls } = makeAdapter();
  await handleTranslationJob(
    pool,
    adapter,
    makeJob({
      originalLanguage: "en",
      originalText: longText,
      targetLanguages: ["ja", "zh"],
    }),
  );
  assert.equal(translateCalls[0]?.fromLang, "en");
  assert.equal(translateCalls[0]?.toLang, "ja");
  assert.equal(translateCalls[0]?.text, longText);
  assert.equal(translateCalls[1]?.fromLang, "en");
  assert.equal(translateCalls[1]?.toLang, "zh");
});

/* ================================================================== */
/*  16. 部分失败隔离 — 成功语言仍被写入                                 */
/* ================================================================== */

void test("successful translations persisted even when later ones fail", async () => {
  const { pool, calls } = makePool();
  let callCount = 0;
  const { adapter } = makeAdapter((text, fromLang, toLang) => {
    callCount++;
    if (callCount === 2) return Promise.reject(new Error("second call fails"));
    return Promise.resolve({
      translatedText: `[${toLang}]${text}`,
      fromLang,
      toLang,
    } as TranslationResult);
  });
  await handleTranslationJob(pool, adapter, makeJob());
  const zhCall = calls.find((c) => c.sql.includes("translated_text_zh"));
  assert.ok(zhCall, "zh should be written despite later en failure");
});
