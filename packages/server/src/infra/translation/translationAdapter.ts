/**
 * 翻译适配器 — 统一抽象接口。
 *
 * 初始实现：passthrough（直通，返回原文），
 * 后续可替换为 OpenAI / DeepL 等翻译 API。
 */

/* ------------------------------------------------------------------ */
/*  类型定义                                                           */
/* ------------------------------------------------------------------ */

/** 翻译结果。 */
export type TranslationResult = {
  translatedText: string;
  fromLang: string;
  toLang: string;
};

/** 翻译适配器接口。 */
export type TranslationAdapter = {
  translate(
    text: string,
    fromLang: string,
    toLang: string,
  ): Promise<TranslationResult>;
};

/** 翻译配置。 */
export type TranslationConfig = {
  provider: "passthrough" | "openai" | "deepl";
  apiKey?: string;
};

/* ------------------------------------------------------------------ */
/*  Passthrough 直通实现                                               */
/* ------------------------------------------------------------------ */

function createPassthroughAdapter(): TranslationAdapter {
  return {
    translate(text, fromLang, toLang) {
      return Promise.resolve({
        translatedText: text,
        fromLang,
        toLang,
      });
    },
  };
}

/* ------------------------------------------------------------------ */
/*  OpenAI 占位实现                                                    */
/* ------------------------------------------------------------------ */

function createOpenAIAdapter(_apiKey: string): TranslationAdapter {
  void _apiKey;
  // TODO: 使用 OpenAI / Claude API 实现
  return {
    translate() {
      return Promise.reject(
        new Error("OpenAI translation adapter not implemented"),
      );
    },
  };
}

/* ------------------------------------------------------------------ */
/*  DeepL 占位实现                                                     */
/* ------------------------------------------------------------------ */

function createDeepLAdapter(_apiKey: string): TranslationAdapter {
  void _apiKey;
  // TODO: 使用 DeepL API 实现
  return {
    translate() {
      return Promise.reject(
        new Error("DeepL translation adapter not implemented"),
      );
    },
  };
}

/* ------------------------------------------------------------------ */
/*  工厂                                                               */
/* ------------------------------------------------------------------ */

/**
 * 根据配置创建翻译适配器实例。
 *
 * @param config 翻译配置
 * @returns 翻译适配器
 */
export function createTranslationAdapter(
  config: TranslationConfig,
): TranslationAdapter {
  const provider: string = config.provider;
  switch (provider) {
    case "passthrough":
      return createPassthroughAdapter();
    case "openai":
      return createOpenAIAdapter(config.apiKey ?? "");
    case "deepl":
      return createDeepLAdapter(config.apiKey ?? "");
    default:
      throw new Error(`Unknown translation provider: ${provider}`);
  }
}
