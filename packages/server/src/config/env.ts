/**
 * 读取必填环境变量。
 *
 * @param key 变量名
 * @returns 变量值
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

/**
 * 读取数字环境变量。
 *
 * @param key 变量名
 * @param fallback 缺省值
 * @returns 数字值
 */
function numberEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw.length === 0) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid number env: ${key}`);
  }
  return n;
}

/**
 * 应用运行时环境变量集合。
 */
export type AppEnv = {
  port: number;
  dbUrl: string;
  redisUrl: string;
  storageProvider: "local" | "s3";
  storageLocalDir: string;
  storageS3Bucket: string;
  storageS3Region: string;
  storageS3Endpoint: string;
  translationProvider: "passthrough" | "openai" | "deepl";
  translationApiKey: string;
  corsOrigins: string | false;
};

const VALID_TRANSLATION_PROVIDERS = new Set(["passthrough", "openai", "deepl"]);

function loadTranslationProvider(): AppEnv["translationProvider"] {
  const value = process.env.TRANSLATION_PROVIDER ?? "passthrough";
  if (!VALID_TRANSLATION_PROVIDERS.has(value)) {
    throw new Error(`Invalid TRANSLATION_PROVIDER: ${value}`);
  }
  return value as AppEnv["translationProvider"];
}

/**
 * 加载应用环境变量。
 *
 * @returns 应用环境变量
 */
export function loadEnv(): AppEnv {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider !== "local" && provider !== "s3") {
    throw new Error(`Invalid STORAGE_PROVIDER: ${provider}`);
  }

  return {
    port: numberEnv("PORT", 3000),
    dbUrl: requireEnv("DB_URL"),
    redisUrl: requireEnv("REDIS_URL"),
    storageProvider: provider,
    storageLocalDir: process.env.STORAGE_LOCAL_DIR ?? "/tmp/cms-storage",
    storageS3Bucket: process.env.STORAGE_S3_BUCKET ?? "",
    storageS3Region: process.env.STORAGE_S3_REGION ?? "",
    storageS3Endpoint: process.env.STORAGE_S3_ENDPOINT ?? "",
    translationProvider: loadTranslationProvider(),
    translationApiKey: process.env.TRANSLATION_API_KEY ?? "",
    corsOrigins: process.env.CORS_ORIGINS ?? false,
  };
}
