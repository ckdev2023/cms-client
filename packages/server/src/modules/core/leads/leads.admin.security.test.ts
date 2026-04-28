/**
 * Cross-tenant security audit tests for leads.admin module.
 *
 * Pattern: source-level static assertions (no real DB/Redis).
 * Reference: portal/security.test.ts
 *
 * Verifies:
 * - All admin routes require @RequireRoles("staff")
 * - Service uses createTenantDb (RLS path)
 * - Dedup enforces org_id filter
 * - Bulk ops write per-item audit (not aggregated)
 * - Controller does not bypass authentication
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(filename: string): string {
  return fs.readFileSync(path.resolve(import.meta.dirname, filename), "utf-8");
}

/* ================================================================ */
/*  S1: Every admin controller route has @RequireRoles("staff")     */
/* ================================================================ */

void test('S1: LeadsAdminController class uses @Controller("admin/leads")', () => {
  const src = readSource("leads.admin.controller.ts");
  assert.ok(
    src.includes('@Controller("admin/leads")'),
    'Controller must be mounted at "admin/leads"',
  );
});

void test("S1: every async method in LeadsAdminController has @RequireRoles", () => {
  const src = readSource("leads.admin.controller.ts");
  const methodPattern = /async\s+(\w+)\s*\(/g;
  let match: RegExpExecArray | null;
  const methods: string[] = [];
  while ((match = methodPattern.exec(src)) !== null) {
    methods.push(match[1]);
  }
  assert.ok(
    methods.length >= 10,
    `Expected ≥10 routes, found ${String(methods.length)}`,
  );

  for (const method of methods) {
    const methodIdx = src.indexOf(`async ${method}(`);
    const decoratorRegion = src.slice(Math.max(0, methodIdx - 250), methodIdx);
    assert.ok(
      decoratorRegion.includes('@RequireRoles("staff")'),
      `${method}() must have @RequireRoles("staff") — found none in its decorator region`,
    );
  }
});

void test("S1: controller does not use AppUserAuthGuard (admin must use RequireRoles)", () => {
  const src = readSource("leads.admin.controller.ts");
  assert.equal(
    src.includes("AppUserAuthGuard"),
    false,
    "Admin controller must NOT use AppUserAuthGuard (portal guard)",
  );
});

/* ================================================================ */
/*  S2: Service uses createTenantDb (RLS, not raw pool)             */
/* ================================================================ */

void test("S2: LeadsAdminService creates tenantDb for every public method", () => {
  const src = readSource("leads.admin.service.ts");
  assert.ok(
    src.includes("import { createTenantDb"),
    "Service must import createTenantDb",
  );

  const publicMethods = [
    "async list(",
    "async getDetail(",
    "async update(",
    "async transitionStatus(",
    "async addFollowup(",
    "async listFollowups(",
    "async listLogs(",
    "async dedup(",
  ];

  for (const sig of publicMethods) {
    const idx = src.indexOf(sig);
    assert.ok(idx >= 0, `Service must have ${sig}`);
    const methodBody = src.slice(
      idx,
      !src.includes("\n  async ", idx + 1)
        ? undefined
        : src.indexOf("\n  async ", idx + 1),
    );
    assert.ok(
      methodBody.includes("createTenantDb(") ||
        methodBody.includes("this.getLeadOrThrow(") ||
        methodBody.includes("this.bulkDeps("),
      `${sig} must go through createTenantDb directly or via helper`,
    );
  }
});

void test("S2: Service does not query pool directly (bypassing RLS)", () => {
  const src = readSource("leads.admin.service.ts");
  assert.equal(
    src.includes("this.pool.query("),
    false,
    "Service must never call this.pool.query() directly — must go through createTenantDb",
  );
  assert.equal(
    src.includes("this.pool.connect("),
    false,
    "Service must never call this.pool.connect() directly — must go through createTenantDb",
  );
});

void test("S2: createTenantDb is called with ctx.orgId and ctx.userId", () => {
  const src = readSource("leads.admin.service.ts");
  const callPattern =
    /createTenantDb\(this\.pool,\s*ctx\.orgId,\s*ctx\.userId\)/g;
  const matches = src.match(callPattern);
  assert.ok(
    matches && matches.length >= 2,
    "createTenantDb must be called with (pool, ctx.orgId, ctx.userId) in multiple places",
  );
});

/* ================================================================ */
/*  S3: Dedup enforces org_id filter (cross-tenant isolation)       */
/* ================================================================ */

void test("S3: queryDedupLeads forces org_id = $1 with orgId param", () => {
  const src = readSource("leads.admin.query.ts");
  const fnSection = src.slice(
    src.indexOf("export async function queryDedupLeads("),
  );
  assert.ok(
    fnSection.includes("org_id = $1"),
    "queryDedupLeads must have org_id = $1 in WHERE",
  );
  assert.ok(
    fnSection.includes("[orgId]") || fnSection.includes("orgId"),
    "queryDedupLeads must pass orgId as SQL param",
  );
});

void test("S3: queryDedupCustomers forces org_id = $1 with orgId param", () => {
  const src = readSource("leads.admin.query.ts");
  const fnSection = src.slice(
    src.indexOf("export async function queryDedupCustomers("),
  );
  assert.ok(
    fnSection.includes("org_id = $1"),
    "queryDedupCustomers must have org_id = $1 in WHERE",
  );
  assert.ok(
    fnSection.includes("[orgId]") || fnSection.includes("orgId"),
    "queryDedupCustomers must pass orgId as SQL param",
  );
});

void test("S3: dedup service short-circuits when no phone/email", () => {
  const src = readSource("leads.admin.service.ts");
  const dedupSection = src.slice(
    src.indexOf("async dedup("),
    src.indexOf("// ── Private"),
  );
  assert.ok(
    dedupSection.includes("!input.phone && !input.email"),
    "dedup must short-circuit when neither phone nor email provided",
  );
});

/* ================================================================ */
/*  S4: Bulk ops write per-item audit (not aggregated)              */
/* ================================================================ */

void test("S4: bulkAssign iterates leadIds and writes audit per lead", () => {
  const src = readSource("leads.admin.bulk.ts");
  const fnSection = src.slice(
    src.indexOf("export async function bulkAssign("),
    src.indexOf("export async function bulkFollowup("),
  );
  assert.ok(
    fnSection.includes("for (const leadId of input.leadIds)"),
    "bulkAssign must iterate per leadId",
  );
  assert.ok(
    fnSection.includes("writeAuditLogs("),
    "bulkAssign must call writeAuditLogs inside the loop",
  );
});

void test("S4: bulkFollowup iterates leadIds and writes audit per lead", () => {
  const src = readSource("leads.admin.bulk.ts");
  const fnSection = src.slice(
    src.indexOf("export async function bulkFollowup("),
    src.indexOf("export async function bulkStatus("),
  );
  assert.ok(
    fnSection.includes("for (const leadId of input.leadIds)"),
    "bulkFollowup must iterate per leadId",
  );
  assert.ok(
    fnSection.includes("writeAuditLogs("),
    "bulkFollowup must call writeAuditLogs inside the loop",
  );
});

void test("S4: bulkExport writes audit per lead, not once for the batch", () => {
  const src = readSource("leads.admin.bulk.ts");
  const fnSection = src.slice(src.indexOf("export async function bulkExport("));
  assert.ok(
    fnSection.includes("for (const leadId of leadIds)"),
    "bulkExport must iterate per leadId for audit",
  );
  assert.ok(
    fnSection.includes("writeAuditLogs("),
    "bulkExport must call writeAuditLogs inside the loop",
  );
});

void test("S4: createAuditWriter dual-writes lead_logs + timeline_logs", () => {
  const src = readSource("leads.admin.bulk.ts");
  const fnSection = src.slice(
    src.indexOf("export function createAuditWriter("),
  );
  assert.ok(
    fnSection.includes("insert into lead_logs"),
    "createAuditWriter must write to lead_logs",
  );
  assert.ok(
    fnSection.includes("timelineService.write("),
    "createAuditWriter must write to timeline via timelineService",
  );
});

/* ================================================================ */
/*  S5: Status machine — whitelist pattern exists                   */
/* ================================================================ */

void test("S5: LEAD_STATUS_TRANSITIONS map is defined with explicit whitelist", () => {
  const src = readSource("leadEntities.ts");
  assert.ok(
    src.includes("LEAD_STATUS_TRANSITIONS"),
    "leadEntities must export LEAD_STATUS_TRANSITIONS",
  );
  assert.ok(
    src.includes('"lost", new Set'),
    "lost must have explicit transition set",
  );
  assert.ok(
    src.includes('"converted_case", new Set'),
    "converted_case must have explicit transition set",
  );
});

void test("S5: validateTransition uses LEAD_STATUS_TRANSITIONS whitelist", () => {
  const src = readSource("leads.admin.query.ts");
  const fnSection = src.slice(
    src.indexOf("export function validateTransition("),
  );
  assert.ok(
    fnSection.includes("LEAD_STATUS_TRANSITIONS.get("),
    "validateTransition must consult LEAD_STATUS_TRANSITIONS",
  );
  assert.ok(
    fnSection.includes("allowed?.has("),
    "validateTransition must check target against allowed set",
  );
});

void test("S5: validateTransition enforces lost_reason for lost transition", () => {
  const src = readSource("leads.admin.query.ts");
  const fnSection = src.slice(
    src.indexOf("export function validateTransition("),
  );
  assert.ok(
    fnSection.includes("lost_reason is required"),
    "validateTransition must enforce lost_reason when transitioning to lost",
  );
});

/* ================================================================ */
/*  S6: Service writeAudit dual-writes lead_logs + timeline_logs    */
/* ================================================================ */

void test("S6: LeadsAdminService.writeAudit inserts into lead_logs", () => {
  const src = readSource("leads.admin.service.ts");
  const writeAuditSection = src.slice(src.indexOf("private async writeAudit("));
  assert.ok(
    writeAuditSection.includes("insert into lead_logs"),
    "writeAudit must insert into lead_logs",
  );
});

void test("S6: LeadsAdminService.writeAudit writes to timelineService", () => {
  const src = readSource("leads.admin.service.ts");
  const writeAuditSection = src.slice(src.indexOf("private async writeAudit("));
  assert.ok(
    writeAuditSection.includes("this.timelineService.write("),
    "writeAudit must call timelineService.write",
  );
});

void test("S6: writeAudit uses Promise.all for dual-write atomicity", () => {
  const src = readSource("leads.admin.service.ts");
  const writeAuditSection = src.slice(src.indexOf("private async writeAudit("));
  assert.ok(
    writeAuditSection.includes("Promise.all"),
    "writeAudit must use Promise.all to dual-write atomically",
  );
});

/* ================================================================ */
/*  S7: Admin tenantDb staff role RLS compatibility                 */
/* ================================================================ */

void test("S7: tenantDb.ts sets app.org_id via set_config (RLS foundation)", () => {
  const src = fs.readFileSync(
    path.resolve(import.meta.dirname, "../tenancy/tenantDb.ts"),
    "utf-8",
  );
  assert.ok(
    src.includes("set_config('app.org_id'"),
    "tenantDb must call set_config('app.org_id', ...) for RLS",
  );
});

void test("S7: tenantDb.ts sets app.actor_user_id via set_config", () => {
  const src = fs.readFileSync(
    path.resolve(import.meta.dirname, "../tenancy/tenantDb.ts"),
    "utf-8",
  );
  assert.ok(
    src.includes("set_config('app.actor_user_id'"),
    "tenantDb must call set_config('app.actor_user_id', ...) for audit",
  );
});

void test("S7: tenantDb.ts wraps every operation in begin/commit/rollback", () => {
  const src = fs.readFileSync(
    path.resolve(import.meta.dirname, "../tenancy/tenantDb.ts"),
    "utf-8",
  );
  const withTenantSection = src.slice(
    src.indexOf("async function withTenantClient"),
  );
  assert.ok(withTenantSection.includes('"begin"'), "Must call begin");
  assert.ok(withTenantSection.includes('"commit"'), "Must call commit");
  assert.ok(withTenantSection.includes('"rollback"'), "Must call rollback");
  assert.ok(
    withTenantSection.includes("client.release()"),
    "Must release client in finally",
  );
});

void test("S7: createTenantDb validates orgId is UUID", () => {
  const src = fs.readFileSync(
    path.resolve(import.meta.dirname, "../tenancy/tenantDb.ts"),
    "utf-8",
  );
  const createSection = src.slice(
    src.indexOf("export function createTenantDb("),
  );
  assert.ok(
    createSection.includes("isUuid(orgId)"),
    "createTenantDb must validate orgId is UUID",
  );
});

void test("S7: admin service passes actorUserId so RLS trigger can attribute writes", () => {
  const src = readSource("leads.admin.service.ts");
  const tenantDbCalls = src.match(
    /createTenantDb\(this\.pool,\s*ctx\.orgId,\s*ctx\.userId\)/g,
  );
  assert.ok(
    tenantDbCalls && tenantDbCalls.length >= 2,
    "Service must pass ctx.userId as actorUserId to createTenantDb",
  );
});

/* ================================================================ */
/*  S8: Controller requireCtx prevents unauthenticated access       */
/* ================================================================ */

void test("S8: requireCtx throws UnauthorizedException on missing context", () => {
  const src = readSource("leads.admin.controller.ts");
  assert.ok(
    src.includes("UnauthorizedException"),
    "Controller must import UnauthorizedException",
  );
  assert.ok(
    src.includes('throw new UnauthorizedException("Missing request context")'),
    "requireCtx must throw for missing context",
  );
});

void test("S8: every controller method calls requireCtx", () => {
  const src = readSource("leads.admin.controller.ts");
  const methodPattern = /async\s+(\w+)\s*\(/g;
  let match: RegExpExecArray | null;
  const methods: string[] = [];
  while ((match = methodPattern.exec(src)) !== null) {
    methods.push(match[1]);
  }

  for (const method of methods) {
    const methodStart = src.indexOf(`async ${method}(`);
    const nextMethod = src.indexOf("\n  async ", methodStart + 1);
    const methodBody = src.slice(
      methodStart,
      nextMethod === -1 ? undefined : nextMethod,
    );
    assert.ok(
      methodBody.includes("requireCtx("),
      `${method}() must call requireCtx to extract RequestContext`,
    );
  }
});
