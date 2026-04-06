# B2: Notification Adapter

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | B2 |
| Phase | B — 建立基础设施 Adapter |
| 前置依赖 | 无 |
| 后续解锁 | C2 (Notification Job Handler) |
| 预估工时 | 0.5 天 |

## 目标

提供统一通知发送抽象接口，初始支持 console（开发占位）+ 邮件发送。

## 范围

### 需要创建的文件

- `packages/server/src/infra/notification/notificationAdapter.ts`
- `packages/server/src/infra/notification/notificationAdapter.test.ts`

### 不可修改的目录

- `packages/server/src/modules/`
- `packages/mobile/`

## 设计

### 接口

```ts
export type NotificationChannel = "email" | "push" | "in_app";

export type NotificationPayload = {
  channel: NotificationChannel;
  to: string;                         // email 地址 / userId / deviceToken
  subject?: string;                   // email 用
  body: string;
  metadata?: Record<string, unknown>;
};

export type NotificationAdapter = {
  send(payload: NotificationPayload): Promise<void>;
};
```

### 工厂

```ts
export function createNotificationAdapter(config: NotificationConfig): NotificationAdapter;
```

### 策略

| channel | 初始实现 | 后续扩展 |
|---|---|---|
| email | console.log 占位（或 nodemailer） | SES / SendGrid |
| push | console.log 占位 | FCM / APNs |
| in_app | console.log 占位 | DB 写入 + WebSocket |

## 实现规范

1. 放在 `infra/notification/`
2. 初始所有 channel 均可用 console.log 打印，不阻塞后续开发
3. 邮件如需真实发送，用 nodemailer + 环境变量 `SMTP_HOST` 等
4. 每次 send 记录日志（用 `console.info` 或后续 logger）

## 测试要求

- 测试 console 策略：调用 send 不抛异常
- spy on console.log 验证输出格式
- 不发真实邮件

## 是否涉及异步任务

否（本模块被 C2 Notification Job Handler 调用）

## DoD

- [ ] NotificationAdapter 接口已定义
- [ ] console 占位策略实现完整
- [ ] 三种 channel 均可处理（至少 log）
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=notificationAdapter
npm run guard
```
