# B1: File Storage Adapter

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | B1 |
| Phase | B — 建立基础设施 Adapter |
| 前置依赖 | 无 |
| 后续解锁 | C4 (Export Job)、D4 (Portal user-documents) |
| 预估工时 | 0.5-1 天 |

## 目标

提供统一文件存储抽象接口 + local/S3 双策略实现，为文件上传、导出存储提供底层能力。

## 范围

### 需要创建的文件

- `packages/server/src/infra/storage/storageAdapter.ts` — 接口定义 + 实现
- `packages/server/src/infra/storage/storageAdapter.test.ts`

### 不可修改的目录

- `packages/server/src/modules/`
- `packages/mobile/`

## 设计

### 接口

```ts
export type StorageAdapter = {
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
};
```

### 工厂

```ts
export function createStorageAdapter(config: StorageConfig): StorageAdapter;
```

- `config.provider = "local"` → 本地文件系统（`/tmp/cms-storage/`）
- `config.provider = "s3"` → S3 兼容对象存储

### StorageConfig

```ts
export type StorageConfig = {
  provider: "local" | "s3";
  localDir?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
};
```

## 实现规范

1. 放在 `infra/storage/`，只做基础设施，不含业务逻辑
2. local 实现：用 Node.js `fs` 模块，key 映射为文件路径
3. S3 实现：初始可以用 `@aws-sdk/client-s3`，或留接口 + TODO 注释
4. `getSignedUrl` local 实现：返回 `file://` 路径即可（开发用）
5. 环境变量通过 `loadEnv()` 读取，新增 `STORAGE_PROVIDER` 等字段

## 环境变量追加

在 `packages/server/src/config/env.ts` 中追加：

```ts
storageProvider: process.env.STORAGE_PROVIDER ?? "local",
storageLocalDir: process.env.STORAGE_LOCAL_DIR ?? "/tmp/cms-storage",
```

## 测试要求

- 使用 local 策略测试 upload / download / remove
- 测试 key 中含路径分隔符的场景
- 不测试 S3（mock 或跳过）

## 是否涉及异步任务

否

## DoD

- [ ] StorageAdapter 接口已定义
- [ ] local 策略实现完整（upload/download/remove/getSignedUrl）
- [ ] S3 策略至少有接口占位
- [ ] env.ts 已追加 storage 配置
- [ ] 单测覆盖 local 策略
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=storageAdapter
npm run guard
```
