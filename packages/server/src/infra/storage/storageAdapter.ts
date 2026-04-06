import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * 文件存储适配器接口。
 */
export type StorageAdapter = {
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
};

/**
 * 存储配置。
 */
export type StorageConfig = {
  provider: "local" | "s3";
  localDir?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
};

/* ------------------------------------------------------------------ */
/*  Local 实现                                                         */
/* ------------------------------------------------------------------ */

function resolvePath(baseDir: string, key: string): string {
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

function createLocalAdapter(baseDir: string): StorageAdapter {
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
      await fs.unlink(filePath).catch((err: unknown) => {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      });
    },

    getSignedUrl(key, expiresInSeconds) {
      void expiresInSeconds;
      try {
        const filePath = resolvePath(baseDir, key);
        return Promise.resolve(`file://${filePath}`);
      } catch (err: unknown) {
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

function createS3Adapter(_config: StorageConfig): StorageAdapter {
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
export function createStorageAdapter(config: StorageConfig): StorageAdapter {
  switch (config.provider) {
    case "local":
      return createLocalAdapter(config.localDir ?? "/tmp/cms-storage");
    case "s3":
      return createS3Adapter(config);
    default:
      throw new Error(
        `Unknown storage provider: ${String((config as Record<string, unknown>).provider)}`,
      );
  }
}
