import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

import { createStorageAdapter } from "./storageAdapter.js";
import type { StorageAdapter, StorageConfig } from "./storageAdapter.js";

/* ------------------------------------------------------------------ */
/*  Helper: 每个测试独立临时目录                                         */
/* ------------------------------------------------------------------ */

async function withTmpDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cms-storage-test-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function localAdapter(dir: string): StorageAdapter {
  return createStorageAdapter({ provider: "local", localDir: dir });
}

/* ================================================================== */
/*  1. 工厂 — 基本行为                                                 */
/* ================================================================== */

void test("createStorageAdapter: unknown provider throws", () => {
  assert.throws(
    () => createStorageAdapter({ provider: "gcs" } as unknown as StorageConfig),
    /Unknown storage provider/,
  );
});

void test("createStorageAdapter: s3 方法抛出未实现错误", async () => {
  const adapter = createStorageAdapter({ provider: "s3" });
  await assert.rejects(
    () => adapter.upload("k", Buffer.from("x"), "text/plain"),
    /not implemented/,
  );
  await assert.rejects(() => adapter.download("k"), /not implemented/);
  await assert.rejects(() => adapter.remove("k"), /not implemented/);
  await assert.rejects(() => adapter.getSignedUrl("k", 60), /not implemented/);
});

/* ================================================================== */
/*  2. Local 策略 — 正常路径                                            */
/* ================================================================== */

void test("local: upload + download round-trip", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const content = Buffer.from("hello world");
    await adapter.upload("greet.txt", content, "text/plain");
    const result = await adapter.download("greet.txt");
    assert.deepStrictEqual(result, content);
  });
});

void test("local: upload 覆盖已有文件", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await adapter.upload("f.txt", Buffer.from("v1"), "text/plain");
    await adapter.upload("f.txt", Buffer.from("v2"), "text/plain");
    const result = await adapter.download("f.txt");
    assert.deepStrictEqual(result, Buffer.from("v2"));
  });
});

void test("local: remove 删除文件", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await adapter.upload("del.txt", Buffer.from("bye"), "text/plain");
    await adapter.remove("del.txt");
    await assert.rejects(() => adapter.download("del.txt"), { code: "ENOENT" });
  });
});

void test("local: remove 不存在的文件不报错", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await adapter.remove("no-such-file.txt"); // 应静默完成
  });
});

void test("local: getSignedUrl 返回 file:// 路径", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const url = await adapter.getSignedUrl("a/b.txt", 300);
    assert.ok(url.startsWith("file://"));
    assert.ok(
      url.includes("a/b.txt") || url.includes("a" + path.sep + "b.txt"),
    );
  });
});

/* ================================================================== */
/*  3. key 含路径分隔符（嵌套目录）                                      */
/* ================================================================== */

void test("local: key 含嵌套路径 upload + download", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const data = Buffer.from("nested");
    await adapter.upload("a/b/c/deep.bin", data, "application/octet-stream");
    assert.deepStrictEqual(await adapter.download("a/b/c/deep.bin"), data);
  });
});

void test("local: remove 嵌套路径文件", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await adapter.upload("x/y/z.txt", Buffer.from("z"), "text/plain");
    await adapter.remove("x/y/z.txt");
    await assert.rejects(() => adapter.download("x/y/z.txt"), {
      code: "ENOENT",
    });
  });
});

/* ================================================================== */
/*  4. 边界与异常场景                                                   */
/* ================================================================== */

void test("local: 空 Buffer 上传与下载", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await adapter.upload(
      "empty.bin",
      Buffer.alloc(0),
      "application/octet-stream",
    );
    const result = await adapter.download("empty.bin");
    assert.strictEqual(result.length, 0);
  });
});

void test("local: download 不存在的文件抛出 ENOENT", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await assert.rejects(() => adapter.download("missing.txt"), {
      code: "ENOENT",
    });
  });
});

void test("local: 大文件 upload + download", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const big = Buffer.alloc(1024 * 1024, 0xab); // 1 MB
    await adapter.upload("big.bin", big, "application/octet-stream");
    const result = await adapter.download("big.bin");
    assert.strictEqual(result.length, big.length);
    assert.deepStrictEqual(result, big);
  });
});

/* ================================================================== */
/*  5. 安全 — 路径穿越防护                                              */
/* ================================================================== */

void test("local: 路径穿越 key 被拒绝 (../)", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await assert.rejects(
      () => adapter.upload("../escape.txt", Buffer.from("bad"), "text/plain"),
      /path traversal/,
    );
  });
});

void test("local: 路径穿越 key 被拒绝 (嵌套 ../)", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await assert.rejects(
      () =>
        adapter.upload("a/../../escape.txt", Buffer.from("bad"), "text/plain"),
      /path traversal/,
    );
  });
});

void test("local: download 路径穿越被拒绝", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await assert.rejects(
      () => adapter.download("../../etc/passwd"),
      /path traversal/,
    );
  });
});

void test("local: remove 路径穿越被拒绝", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await assert.rejects(
      () => adapter.remove("../escape.txt"),
      /path traversal/,
    );
  });
});

void test("local: getSignedUrl 路径穿越被拒绝", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await assert.rejects(
      () => adapter.getSignedUrl("../../etc/passwd", 300),
      /path traversal/,
    );
  });
});

void test("local: 绝对路径 key 被拒绝 (upload)", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await assert.rejects(
      () => adapter.upload("/etc/passwd", Buffer.from("bad"), "text/plain"),
      /path traversal/,
    );
  });
});

void test("local: 绝对路径 key 被拒绝 (download)", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await assert.rejects(
      () => adapter.download("/etc/passwd"),
      /path traversal/,
    );
  });
});

void test("local: 绝对路径 key 被拒绝 (remove)", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    await assert.rejects(() => adapter.remove("/etc/passwd"), /path traversal/);
  });
});

/* ================================================================== */
/*  6. 特殊字符 key                                                    */
/* ================================================================== */

void test("local: key 含空格", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const data = Buffer.from("spaces");
    await adapter.upload("dir name/file name.txt", data, "text/plain");
    assert.deepStrictEqual(
      await adapter.download("dir name/file name.txt"),
      data,
    );
  });
});

void test("local: key 含中文", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const data = Buffer.from("中文内容");
    await adapter.upload("目录/文件.txt", data, "text/plain");
    assert.deepStrictEqual(await adapter.download("目录/文件.txt"), data);
  });
});

/* ================================================================== */
/*  7. 二进制完整性                                                     */
/* ================================================================== */

void test("local: 二进制数据保持完整（含全部 byte 值）", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const bytes = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    await adapter.upload("all-bytes.bin", bytes, "application/octet-stream");
    assert.deepStrictEqual(await adapter.download("all-bytes.bin"), bytes);
  });
});

/* ================================================================== */
/*  8. 并发操作                                                        */
/* ================================================================== */

void test("local: 并发上传不同 key 不冲突", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const tasks = Array.from({ length: 20 }, (_, i) =>
      adapter.upload(
        `concurrent/${String(i)}.txt`,
        Buffer.from(`data-${String(i)}`),
        "text/plain",
      ),
    );
    await Promise.all(tasks);
    for (let i = 0; i < 20; i++) {
      const result = await adapter.download(`concurrent/${String(i)}.txt`);
      assert.deepStrictEqual(result, Buffer.from(`data-${String(i)}`));
    }
  });
});

/* ================================================================== */
/*  9. 默认 localDir 回退                                              */
/* ================================================================== */

void test("createStorageAdapter: local 不传 localDir 使用默认路径", () => {
  const adapter = createStorageAdapter({ provider: "local" });
  assert.ok(adapter);
});

/* ================================================================== */
/*  10. getSignedUrl 不需要文件存在                                     */
/* ================================================================== */

void test("local: getSignedUrl 对不存在的文件仍返回路径", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const url = await adapter.getSignedUrl("nonexistent.pdf", 600);
    assert.ok(url.startsWith("file://"));
    assert.ok(url.includes("nonexistent.pdf"));
  });
});

/* ================================================================== */
/*  11. 同 key 并发写入                                                */
/* ================================================================== */

void test("local: 并发写入同一 key 最终写入完整", async () => {
  await withTmpDir(async (dir) => {
    const adapter = localAdapter(dir);
    const tasks = Array.from({ length: 10 }, (_, i) =>
      adapter.upload("race.txt", Buffer.from(`v${String(i)}`), "text/plain"),
    );
    await Promise.all(tasks);
    // 文件应该存在且内容完整（不应崩溃或产生损坏文件）
    const result = await adapter.download("race.txt");
    assert.ok(result.length > 0);
    assert.ok(result.toString().startsWith("v"));
  });
});
