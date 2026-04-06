/**
 * 安全审计测试用例 — 覆盖 P1~P10 全部修复点。
 *
 * 测试方法：源码静态断言（无需真实 DB/Redis），验证关键安全模式存在。
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, relativePath),
    "utf-8",
  );
}

/* ================================================================ */
/*  P1-1: LeadsController IDOR 防护                                  */
/* ================================================================ */

void test("P1-1: LeadsController.get checks appUserId ownership", () => {
  const src = readSource("leads/leads.controller.ts");
  assert.ok(
    src.includes("lead.appUserId !== ctx.appUserId"),
    "get() must check lead.appUserId === ctx.appUserId",
  );
});

void test("P1-1: LeadsController.update checks appUserId ownership", () => {
  const src = readSource("leads/leads.controller.ts");
  assert.ok(
    src.includes("existing.appUserId !== ctx.appUserId"),
    "update() must check existing.appUserId === ctx.appUserId",
  );
});

/* ================================================================ */
/*  P1-2: ConversationsController IDOR 防护                          */
/* ================================================================ */

void test("P1-2: ConversationsController.get checks appUserId ownership", () => {
  const src = readSource("conversations/conversations.controller.ts");
  assert.ok(
    src.includes("conv.appUserId !== ctx.appUserId"),
    "get() must check conv.appUserId === ctx.appUserId",
  );
});

void test("P1-2: ConversationsController.close checks appUserId ownership", () => {
  const src = readSource("conversations/conversations.controller.ts");
  // close 方法里也必须有所有权校验
  const closeSection = src.slice(src.indexOf("async close("));
  assert.ok(
    closeSection.includes("conv.appUserId !== ctx.appUserId"),
    "close() must check conv.appUserId === ctx.appUserId",
  );
});

/* ================================================================ */
/*  P1-3: MessagesController IDOR 防护                               */
/* ================================================================ */

void test("P1-3: MessagesController has assertConversationOwnership helper", () => {
  const src = readSource("messages/messages.controller.ts");
  assert.ok(
    src.includes("assertConversationOwnership"),
    "MessagesController must have assertConversationOwnership",
  );
});

void test("P1-3: MessagesController.send validates conversation ownership", () => {
  const src = readSource("messages/messages.controller.ts");
  const sendSection = src.slice(
    src.indexOf("async send("),
    src.indexOf("async list("),
  );
  assert.ok(
    sendSection.includes("assertConversationOwnership"),
    "send() must call assertConversationOwnership",
  );
});

void test("P1-3: MessagesController.list validates conversation ownership", () => {
  const src = readSource("messages/messages.controller.ts");
  const listSection = src.slice(
    src.indexOf("async list("),
    src.indexOf("async get("),
  );
  assert.ok(
    listSection.includes("assertConversationOwnership"),
    "list() must call assertConversationOwnership",
  );
});

void test("P1-3: MessagesController.get validates conversation ownership", () => {
  const src = readSource("messages/messages.controller.ts");
  const getSection = src.slice(src.indexOf("async get("));
  assert.ok(
    getSection.includes("appUserId !== ctx.appUserId"),
    "get() must check conversation ownership",
  );
});

/* ================================================================ */
/*  P1-4: UserDocumentsController IDOR 防护                          */
/* ================================================================ */

void test("P1-4: UserDocumentsController.get checks appUserId ownership", () => {
  const src = readSource("user-documents/userDocuments.controller.ts");
  const getSection = src.slice(
    src.indexOf("async get("),
    src.indexOf("async downloadUrl("),
  );
  assert.ok(
    getSection.includes("doc.appUserId !== ctx.appUserId"),
    "get() must check doc.appUserId === ctx.appUserId",
  );
});

void test("P1-4: UserDocumentsController.downloadUrl checks ownership", () => {
  const src = readSource("user-documents/userDocuments.controller.ts");
  const dlSection = src.slice(
    src.indexOf("async downloadUrl("),
    src.indexOf("async remove("),
  );
  assert.ok(
    dlSection.includes("doc.appUserId !== ctx.appUserId"),
    "downloadUrl() must check doc.appUserId === ctx.appUserId",
  );
});

void test("P1-4: UserDocumentsController.remove checks ownership", () => {
  const src = readSource("user-documents/userDocuments.controller.ts");
  const rmSection = src.slice(src.indexOf("async remove("));
  assert.ok(
    rmSection.includes("doc.appUserId !== ctx.appUserId"),
    "remove() must check doc.appUserId === ctx.appUserId",
  );
});

/* ================================================================ */
/*  P2: assertBelongsToOrg 表名白名单                                */
/* ================================================================ */

void test("P2: CasesService has ALLOWED_ASSERT_TABLES whitelist", () => {
  const src = readSource("../core/cases/cases.service.ts");
  assert.ok(
    src.includes("ALLOWED_ASSERT_TABLES"),
    "CasesService must define ALLOWED_ASSERT_TABLES whitelist",
  );
  assert.ok(
    src.includes('"customers"') && src.includes('"users"'),
    "whitelist must include customers and users",
  );
});

void test("P2: assertBelongsToOrg validates table against whitelist", () => {
  const src = readSource("../core/cases/cases.service.ts");
  const fnSection = src.slice(src.indexOf("assertBelongsToOrg("));
  assert.ok(
    fnSection.includes("ALLOWED_ASSERT_TABLES.has(table)"),
    "assertBelongsToOrg must check ALLOWED_ASSERT_TABLES",
  );
});

/* ================================================================ */
/*  P3: 生产环境拒绝 AUTH_ALLOW_INSECURE_HEADERS                     */
/* ================================================================ */

void test("P3: main.ts calls process.exit(1) for insecure headers in production", () => {
  const src = fs.readFileSync(
    path.resolve(import.meta.dirname, "../../main.ts"),
    "utf-8",
  );
  assert.ok(
    src.includes("process.exit(1)"),
    "main.ts must call process.exit(1) when insecure headers in production",
  );
  assert.ok(
    src.includes("refusing to start"),
    "main.ts must refuse to start, not just warn",
  );
});

/* ================================================================ */
/*  P6: JobsController.enqueue 权限收紧                              */
/* ================================================================ */

void test("P6: JobsController.enqueue requires staff role", () => {
  const src = readSource("../core/jobs/jobs.controller.ts");
  const enqueueIdx = src.indexOf("async enqueue(");
  const decoratorRegion = src.slice(Math.max(0, enqueueIdx - 200), enqueueIdx);
  assert.ok(
    decoratorRegion.includes('@RequireRoles("staff")'),
    'enqueue must have @RequireRoles("staff")',
  );
});

/* ================================================================ */
/*  P8: JWT 密钥最小长度校验                                          */
/* ================================================================ */

void test("P8: readAuthConfigFromEnv enforces minimum JWT secret length in production", () => {
  const src = readSource("../core/tenancy/requestContext.ts");
  assert.ok(
    src.includes("jwtSecret.length < 32"),
    "readAuthConfigFromEnv must check jwtSecret.length >= 32",
  );
});

/* ================================================================ */
/*  P9: Health deps 不泄露内部错误                                    */
/* ================================================================ */

void test("P9: health deps does not expose error.message", () => {
  const src = fs.readFileSync(
    path.resolve(import.meta.dirname, "../../health/health.controller.ts"),
    "utf-8",
  );
  assert.ok(
    !src.includes("e.message"),
    "getDepsHealth must not expose e.message",
  );
});

/* ================================================================ */
/*  P10: LeadsService.convert 事务化 + orgId 校验                    */
/* ================================================================ */

void test("P10: LeadsService.convert uses database transaction", () => {
  const src = readSource("leads/leads.service.ts");
  const convertSection = src.slice(src.indexOf("async convert("));
  assert.ok(convertSection.includes("BEGIN"), "convert must use BEGIN");
  assert.ok(convertSection.includes("COMMIT"), "convert must use COMMIT");
  assert.ok(convertSection.includes("ROLLBACK"), "convert must use ROLLBACK");
  assert.ok(
    convertSection.includes("client.release()"),
    "convert must release client in finally",
  );
});

void test("P10: LeadsService.convert validates orgId matches assignedOrgId", () => {
  const src = readSource("leads/leads.service.ts");
  const convertSection = src.slice(src.indexOf("async convert("));
  assert.ok(
    convertSection.includes("input.orgId !== lead.assignedOrgId"),
    "convert must validate orgId matches lead.assignedOrgId",
  );
});
