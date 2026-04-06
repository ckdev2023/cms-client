import test from "node:test";
import assert from "node:assert/strict";

import { createNotificationAdapter } from "./notificationAdapter.js";
import type {
  NotificationAdapter,
  NotificationChannel,
} from "./notificationAdapter.js";

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function consoleAdapter(): NotificationAdapter {
  return createNotificationAdapter({ provider: "console" });
}

function spyConsoleInfo(): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  // eslint-disable-next-line no-console
  const original = console.info;
  // eslint-disable-next-line no-console
  console.info = (...args: unknown[]) => {
    calls.push(args.map(String).join(" "));
  };
  // eslint-disable-next-line no-console
  return { calls, restore: () => (console.info = original) };
}

/* ================================================================== */
/*  1. 工厂 — 基本行为                                                 */
/* ================================================================== */

void test("createNotificationAdapter: unknown provider throws", () => {
  assert.throws(
    () =>
      createNotificationAdapter({
        provider: "sms",
      } as unknown as Parameters<typeof createNotificationAdapter>[0]),
    /Unknown notification provider/,
  );
});

void test("createNotificationAdapter: console provider returns adapter", () => {
  const adapter = consoleAdapter();
  assert.ok(adapter);
  assert.strictEqual(typeof adapter.send, "function");
});

/* ================================================================== */
/*  2. Console 策略 — email channel                                    */
/* ================================================================== */

void test("console: email send 不抛异常", async () => {
  const adapter = consoleAdapter();
  await adapter.send({
    channel: "email",
    to: "user@example.com",
    subject: "Test Subject",
    body: "Hello World",
  });
});

void test("console: email send 输出包含关键字段", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "email",
      to: "user@example.com",
      subject: "Welcome",
      body: "Hi there",
    });
    assert.strictEqual(spy.calls.length, 1);
    const output = spy.calls[0];
    assert.ok(output.includes("channel=email"));
    assert.ok(output.includes("to=user@example.com"));
    assert.ok(output.includes("subject=Welcome"));
    assert.ok(output.includes("body=Hi there"));
  } finally {
    spy.restore();
  }
});

/* ================================================================== */
/*  3. Console 策略 — push channel                                     */
/* ================================================================== */

void test("console: push send 不抛异常", async () => {
  const adapter = consoleAdapter();
  await adapter.send({
    channel: "push",
    to: "device-token-abc",
    body: "You have a new message",
  });
});

void test("console: push send 输出包含 channel=push", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "push",
      to: "device-token-abc",
      body: "Push content",
    });
    assert.strictEqual(spy.calls.length, 1);
    assert.ok(spy.calls[0].includes("channel=push"));
    assert.ok(spy.calls[0].includes("to=device-token-abc"));
  } finally {
    spy.restore();
  }
});

/* ================================================================== */
/*  4. Console 策略 — in_app channel                                   */
/* ================================================================== */

void test("console: in_app send 不抛异常", async () => {
  const adapter = consoleAdapter();
  await adapter.send({
    channel: "in_app",
    to: "user-id-123",
    body: "In-app notification",
  });
});

void test("console: in_app send 输出包含 channel=in_app", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "in_app",
      to: "user-id-123",
      body: "In-app content",
    });
    assert.strictEqual(spy.calls.length, 1);
    assert.ok(spy.calls[0].includes("channel=in_app"));
  } finally {
    spy.restore();
  }
});

/* ================================================================== */
/*  5. metadata 输出                                                   */
/* ================================================================== */

void test("console: metadata 包含在输出中", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "email",
      to: "a@b.com",
      body: "msg",
      metadata: { caseId: "C-001", priority: "high" },
    });
    assert.strictEqual(spy.calls.length, 1);
    assert.ok(spy.calls[0].includes("metadata="));
    assert.ok(spy.calls[0].includes("C-001"));
  } finally {
    spy.restore();
  }
});

void test("console: 空 metadata 不输出 metadata 字段", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "email",
      to: "a@b.com",
      body: "msg",
      metadata: {},
    });
    assert.strictEqual(spy.calls.length, 1);
    assert.ok(!spy.calls[0].includes("metadata="));
  } finally {
    spy.restore();
  }
});

void test("console: 无 subject 时不输出 subject 字段", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "push",
      to: "tok",
      body: "msg",
    });
    assert.ok(!spy.calls[0].includes("subject="));
  } finally {
    spy.restore();
  }
});

/* ================================================================== */
/*  6. 三种 channel 均可处理                                            */
/* ================================================================== */

void test("console: 三种 channel 均可正常发送", async () => {
  const adapter = consoleAdapter();
  const channels: NotificationChannel[] = ["email", "push", "in_app"];
  for (const channel of channels) {
    await adapter.send({ channel, to: "target", body: "test" });
  }
});

/* ================================================================== */
/*  7. 多次发送独立性                                                   */
/* ================================================================== */

void test("console: 多次 send 各自独立输出", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({ channel: "email", to: "a@b.com", body: "first" });
    await adapter.send({ channel: "push", to: "tok", body: "second" });
    assert.strictEqual(spy.calls.length, 2);
    assert.ok(spy.calls[0].includes("first"));
    assert.ok(spy.calls[1].includes("second"));
  } finally {
    spy.restore();
  }
});

/* ================================================================== */
/*  8. 边界值与异常场景                                                  */
/* ================================================================== */

void test("console: 空字符串 body 不抛异常", async () => {
  const adapter = consoleAdapter();
  await adapter.send({ channel: "email", to: "a@b.com", body: "" });
});

void test("console: 空字符串 to 不抛异常", async () => {
  const adapter = consoleAdapter();
  await adapter.send({ channel: "email", to: "", body: "msg" });
});

void test("console: 超长 body 不抛异常", async () => {
  const adapter = consoleAdapter();
  const longBody = "x".repeat(10_000);
  await adapter.send({ channel: "email", to: "a@b.com", body: longBody });
});

void test("console: body 含特殊字符（换行/管道）不抛异常", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "email",
      to: "a@b.com",
      body: "line1\nline2\ttab | pipe",
    });
    assert.strictEqual(spy.calls.length, 1);
    assert.ok(spy.calls[0].includes("line1"));
  } finally {
    spy.restore();
  }
});

void test("console: subject 为空字符串时不输出 subject 字段", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "email",
      to: "a@b.com",
      subject: "",
      body: "msg",
    });
    assert.ok(!spy.calls[0].includes("subject="));
  } finally {
    spy.restore();
  }
});

void test("console: metadata 含嵌套对象", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "email",
      to: "a@b.com",
      body: "msg",
      metadata: { nested: { key: "value" } },
    });
    assert.ok(spy.calls[0].includes("metadata="));
    assert.ok(spy.calls[0].includes("nested"));
  } finally {
    spy.restore();
  }
});

void test("console: undefined metadata 不输出 metadata 字段", async () => {
  const spy = spyConsoleInfo();
  try {
    const adapter = consoleAdapter();
    await adapter.send({
      channel: "push",
      to: "tok",
      body: "msg",
      metadata: undefined,
    });
    assert.ok(!spy.calls[0].includes("metadata="));
  } finally {
    spy.restore();
  }
});

/* ================================================================== */
/*  9. send 返回值                                                     */
/* ================================================================== */

void test("console: send 返回 Promise<void>", async () => {
  const adapter = consoleAdapter();
  const promise = adapter.send({
    channel: "email",
    to: "a@b.com",
    body: "msg",
  });
  assert.ok(promise instanceof Promise);
  await promise;
});

/* ================================================================== */
/*  10. 并发 send 安全性                                                */
/* ================================================================== */

void test("console: 并发 send 不抛异常", async () => {
  const adapter = consoleAdapter();
  const promises = Array.from({ length: 50 }, (_, i) =>
    adapter.send({
      channel: "email",
      to: `u${String(i)}@b.com`,
      body: `msg-${String(i)}`,
    }),
  );
  await Promise.all(promises);
});

/* ================================================================== */
/*  11. 适配器独立性                                                    */
/* ================================================================== */

void test("不同 adapter 实例互不影响", async () => {
  const spy = spyConsoleInfo();
  try {
    const a1 = consoleAdapter();
    const a2 = consoleAdapter();
    await a1.send({ channel: "email", to: "a@b.com", body: "from-a1" });
    await a2.send({ channel: "push", to: "tok", body: "from-a2" });
    assert.strictEqual(spy.calls.length, 2);
    assert.ok(spy.calls[0].includes("from-a1"));
    assert.ok(spy.calls[1].includes("from-a2"));
  } finally {
    spy.restore();
  }
});
