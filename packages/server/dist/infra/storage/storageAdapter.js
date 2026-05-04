import * as fs from "node:fs/promises";
import * as path from "node:path";
/**
 * 文件存储适配器接口。
 */
export const STORAGE_ADAPTER = Symbol("STORAGE_ADAPTER");
/* ------------------------------------------------------------------ */
/*  Local 实现                                                         */
/* ------------------------------------------------------------------ */
function resolvePath(baseDir, key) {
  const resolved = path.resolve(baseDir, key);
  // 防止路径穿越
  if (
    !resolved.startsWith(path.resolve(baseDir) + path.sep) &&
    resolved !== path.resolve(baseDir)
  ) {
    throw new Error(`Invalid key: path traversal detected — ${key}`);
  }
  return resolved;
}
function createLocalAdapter(baseDir) {
  return {
    async upload(key, data, contentType) {
      void contentType;
      const filePath = resolvePath(baseDir, key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, data);
    },
    async download(key) {
      const filePath = resolvePath(baseDir, key);
      return fs.readFile(filePath);
    },
    async remove(key) {
      const filePath = resolvePath(baseDir, key);
      await fs.unlink(filePath).catch((err) => {
        if (err.code !== "ENOENT") throw err;
      });
    },
    getSignedUrl(key, expiresInSeconds) {
      void expiresInSeconds;
      try {
        const filePath = resolvePath(baseDir, key);
        return Promise.resolve(`file://${filePath}`);
      } catch (err) {
        return Promise.reject(
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    },
  };
}
/* ------------------------------------------------------------------ */
/*  S3 占位实现                                                        */
/* ------------------------------------------------------------------ */
function createS3Adapter(_config) {
  void _config;
  // TODO: 使用 @aws-sdk/client-s3 实现
  return {
    upload() {
      return Promise.reject(new Error("S3 adapter not implemented"));
    },
    download() {
      return Promise.reject(new Error("S3 adapter not implemented"));
    },
    remove() {
      return Promise.reject(new Error("S3 adapter not implemented"));
    },
    getSignedUrl() {
      return Promise.reject(new Error("S3 adapter not implemented"));
    },
  };
}
/* ------------------------------------------------------------------ */
/*  工厂                                                               */
/* ------------------------------------------------------------------ */
/**
 * 根据配置创建存储适配器实例。
 *
 * @param config 存储配置
 * @returns 存储适配器
 */
export function createStorageAdapter(config) {
  switch (config.provider) {
    case "local":
      return createLocalAdapter(config.localDir ?? "/tmp/cms-storage");
    case "s3":
      return createS3Adapter(config);
    default:
      throw new Error(`Unknown storage provider: ${String(config.provider)}`);
  }
}
//# sourceMappingURL=storageAdapter.js.map
