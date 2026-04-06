import type { Pool } from "pg";

import type { QueueJob } from "../../../../infra/queue/redisQueue";
import type { TranslationAdapter } from "../../../../infra/translation/translationAdapter";
import { createTenantDb } from "../../tenancy/tenantDb";

/* ------------------------------------------------------------------ */
/*  类型定义                                                           */
/* ------------------------------------------------------------------ */

/**
 * Translation job payload 类型。
 */
export type TranslationJobPayload = {
  orgId: string;
  messageId: string;
  originalText: string;
  originalLanguage: string; // "zh" | "en" | "ja" | ...
  targetLanguages: string[]; // ["ja", "zh", "en"]
};

/**
 * 支持的翻译目标语言 → messages 表列名映射。
 */
const LANG_COLUMN_MAP: Record<string, string> = {
  ja: "translated_text_ja",
  zh: "translated_text_zh",
  en: "translated_text_en",
};

/* ------------------------------------------------------------------ */
/*  内部辅助                                                           */
/* ------------------------------------------------------------------ */

type LangError = { lang: string; error: string };

/**
 * 逐语言翻译并回写 DB，返回成功/失败计数及错误明细。
 *
 * @param pool PostgreSQL 连接池
 * @param translationAdapter 翻译适配器
 * @param orgId 组织 ID
 * @param messageId 消息 ID
 * @param originalText 原文
 * @param originalLanguage 原文语言
 * @param langs 目标语言列表
 * @returns 成功/失败计数及错误明细
 */
async function translateAndPersist(
  pool: Pool,
  translationAdapter: TranslationAdapter,
  orgId: string,
  messageId: string,
  originalText: string,
  originalLanguage: string,
  langs: string[],
): Promise<{ successCount: number; failCount: number; errors: LangError[] }> {
  let successCount = 0;
  let failCount = 0;
  const errors: LangError[] = [];

  for (const lang of langs) {
    try {
      const result = await translationAdapter.translate(
        originalText,
        originalLanguage,
        lang,
      );
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- guard for runtime safety
      const column = LANG_COLUMN_MAP[lang] as string;
      const tenantDb = createTenantDb(pool, orgId);
      await tenantDb.query(`update messages set ${column} = $1 where id = $2`, [
        result.translatedText,
        messageId,
      ]);
      successCount++;
    } catch (err) {
      failCount++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ lang, error: msg });
      // eslint-disable-next-line no-console
      console.error(`[translationJobHandler] Failed lang=${lang}: ${msg}`);
    }
  }
  return { successCount, failCount, errors };
}

/**
 * 根据成功/失败数量计算最终翻译状态。
 *
 * @param successCount 成功数
 * @param failCount 失败数
 * @returns 翻译状态
 */
function resolveStatus(
  successCount: number,
  failCount: number,
): "completed" | "partial" | "failed" {
  if (failCount === 0) return "completed";
  if (successCount > 0) return "partial";
  return "failed";
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

/**
 * 处理 translation_jobs 队列任务：
 * 对 targetLanguages 中每种语言调用 translationAdapter.translate()，
 * 将译文回写 messages 表对应列，更新 translation_status。
 *
 * - 跳过 originalLanguage === targetLanguage
 * - 部分语言翻译失败不影响其余
 * - 全部成功 → completed；部分失败 → partial；全部失败 → failed（抛异常）
 *
 * @param pool PostgreSQL 连接池
 * @param translationAdapter 翻译适配器
 * @param job 队列任务
 */
export async function handleTranslationJob(
  pool: Pool,
  translationAdapter: TranslationAdapter,
  job: QueueJob<TranslationJobPayload>,
): Promise<void> {
  const { orgId, messageId, originalText, originalLanguage, targetLanguages } =
    job.payload;

  // eslint-disable-next-line no-console
  console.info(
    `[translationJobHandler] Starting: jobId=${job.id} messageId=${messageId} langs=${targetLanguages.join(",")}`,
  );

  const langsToTranslate = targetLanguages.filter(
    (lang) => lang !== originalLanguage && lang in LANG_COLUMN_MAP,
  );

  if (langsToTranslate.length === 0) {
    const tenantDb = createTenantDb(pool, orgId);
    await tenantDb.query(
      `update messages set translation_status = $1 where id = $2`,
      ["completed", messageId],
    );
    return;
  }

  const { successCount, failCount, errors } = await translateAndPersist(
    pool,
    translationAdapter,
    orgId,
    messageId,
    originalText,
    originalLanguage,
    langsToTranslate,
  );

  const status = resolveStatus(successCount, failCount);
  const tenantDb = createTenantDb(pool, orgId);
  await tenantDb.query(
    `update messages set translation_status = $1 where id = $2`,
    [status, messageId],
  );

  // eslint-disable-next-line no-console
  console.info(
    `[translationJobHandler] Done: jobId=${job.id} status=${status} success=${String(successCount)} fail=${String(failCount)}`,
  );

  if (status === "failed") {
    throw new Error(
      `All translations failed for messageId=${messageId}: ${JSON.stringify(errors)}`,
    );
  }
}
