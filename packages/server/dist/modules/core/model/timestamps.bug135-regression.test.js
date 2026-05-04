/**
 * BUG-135 回归契约测试。
 *
 * 7 个 service / utils 在 R10 之前直接用 `String(row.created_at)` 透传
 * `Date.prototype.toString()` 文本（例如 `"Mon Apr 27 2026 20:40:49 GMT+0900"`），
 * 违反 R8 引入的 ISO 8601 时间戳契约（详见 BUG-129 / BUG-135）。
 *
 * 本文件覆盖每个 mapper 在 `Date` / `string` / `null` 三种 pg 行时间戳形态下的
 * 行为，确保统一走 `requireTimestampString` / `toTimestampStringOrNull`。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mapCommunicationLogRow } from "../communication-logs/communicationLogs.shared";
import {
  CompaniesService,
  mapCompanyRow,
} from "../companies/companies.service";
import {
  ContactPersonsService,
  mapContactPersonRow,
} from "../contact-persons/contactPersons.service";
import { mapCustomerRow } from "../customers/customers.utils";
import { GroupsService } from "../groups/groups.service";
import { mapTaskRow } from "../tasks/tasks.service";
import { FeatureFlagsService } from "../../feature-flags/featureFlags.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ISO = "2026-04-27T11:40:49.000Z";
const ISO_LATER = "2026-04-28T01:30:00.000Z";
function ctx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "manager" };
}
function makePool(queryFn) {
  const client = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) };
}
function noopTimeline() {
  return {
    write: () => Promise.resolve(),
  };
}
// ── mapCustomerRow ────────────────────────────────────────────────
const baseCustomerRow = {
  id: "cust-1",
  org_id: ORG_ID,
  type: "individual",
  base_profile: { name_jp: "テスト" },
  contacts: [],
  created_at: ISO,
  updated_at: ISO_LATER,
};
void test("BUG-135 mapCustomerRow: Date → ISO string", () => {
  const c = mapCustomerRow({
    ...baseCustomerRow,
    created_at: new Date(ISO),
    updated_at: new Date(ISO_LATER),
  });
  assert.equal(c.createdAt, ISO);
  assert.equal(c.updatedAt, ISO_LATER);
});
void test("BUG-135 mapCustomerRow: string passthrough", () => {
  const c = mapCustomerRow(baseCustomerRow);
  assert.equal(c.createdAt, ISO);
  assert.equal(c.updatedAt, ISO_LATER);
});
void test("BUG-135 mapCustomerRow: null created_at throws", () => {
  assert.throws(
    () =>
      mapCustomerRow({
        ...baseCustomerRow,
        created_at: null,
      }),
    /Invalid timestamp.*created_at/,
  );
});
// ── mapTaskRow ────────────────────────────────────────────────────
const baseTaskRow = {
  id: "t1",
  org_id: ORG_ID,
  case_id: null,
  title: "T",
  description: null,
  task_type: "general",
  assignee_user_id: null,
  priority: "normal",
  due_at: null,
  status: "pending",
  source_type: null,
  source_id: null,
  completed_at: null,
  created_at: ISO,
  updated_at: ISO_LATER,
};
void test("BUG-135 mapTaskRow: Date → ISO string", () => {
  const t = mapTaskRow({
    ...baseTaskRow,
    created_at: new Date(ISO),
    updated_at: new Date(ISO_LATER),
  });
  assert.equal(t.createdAt, ISO);
  assert.equal(t.updatedAt, ISO_LATER);
});
void test("BUG-135 mapTaskRow: string passthrough", () => {
  const t = mapTaskRow(baseTaskRow);
  assert.equal(t.createdAt, ISO);
  assert.equal(t.updatedAt, ISO_LATER);
});
void test("BUG-135 mapTaskRow: null updated_at throws", () => {
  assert.throws(
    () => mapTaskRow({ ...baseTaskRow, updated_at: null }),
    /Invalid timestamp.*updated_at/,
  );
});
// ── mapCompanyRow ─────────────────────────────────────────────────
const baseCompanyRow = {
  id: "co1",
  org_id: ORG_ID,
  company_no: "CO-001",
  company_name: "Acme",
  corporate_number: null,
  established_date: null,
  capital_amount: null,
  address: null,
  business_scope: null,
  employee_count: null,
  fiscal_year_end: null,
  website: null,
  contact_phone: null,
  contact_email: null,
  owner_user_id: null,
  created_at: ISO,
  updated_at: ISO_LATER,
};
void test("BUG-135 mapCompanyRow: Date → ISO string", () => {
  const c = mapCompanyRow({
    ...baseCompanyRow,
    created_at: new Date(ISO),
    updated_at: new Date(ISO_LATER),
  });
  assert.equal(c.createdAt, ISO);
  assert.equal(c.updatedAt, ISO_LATER);
});
void test("BUG-135 mapCompanyRow: string passthrough", () => {
  const c = mapCompanyRow(baseCompanyRow);
  assert.equal(c.createdAt, ISO);
  assert.equal(c.updatedAt, ISO_LATER);
});
// ── mapContactPersonRow ───────────────────────────────────────────
const baseContactRow = {
  id: "cp1",
  org_id: ORG_ID,
  company_id: null,
  customer_id: null,
  name: "Yamada",
  role_title: null,
  relation_type: null,
  phone: null,
  email: null,
  preferred_language: "ja",
  created_at: ISO,
  updated_at: ISO_LATER,
};
void test("BUG-135 mapContactPersonRow: Date → ISO string", () => {
  const cp = mapContactPersonRow({
    ...baseContactRow,
    created_at: new Date(ISO),
    updated_at: new Date(ISO_LATER),
  });
  assert.equal(cp.createdAt, ISO);
  assert.equal(cp.updatedAt, ISO_LATER);
});
// ── mapCommunicationLogRow ────────────────────────────────────────
const baseCommLogRow = {
  id: "cl1",
  org_id: ORG_ID,
  case_id: null,
  customer_id: null,
  company_id: null,
  channel_type: "phone",
  direction: "inbound",
  subject: null,
  content_summary: null,
  full_content: null,
  visible_to_client: false,
  created_by: null,
  follow_up_required: false,
  follow_up_due_at: null,
  created_at: ISO,
};
void test("BUG-135 mapCommunicationLogRow: Date → ISO string", () => {
  const log = mapCommunicationLogRow({
    ...baseCommLogRow,
    created_at: new Date(ISO),
  });
  assert.equal(log.createdAt, ISO);
});
void test("BUG-135 mapCommunicationLogRow: null created_at throws", () => {
  assert.throws(
    () => mapCommunicationLogRow({ ...baseCommLogRow, created_at: null }),
    /Invalid timestamp.*created_at/,
  );
});
// ── GroupsService.listGroups & getGroupDetail ─────────────────────
const groupSummaryRow = {
  id: "g1",
  org_id: ORG_ID,
  group_no: "GRP-001",
  name: "Alpha",
  description: null,
  active_flag: true,
  created_at: ISO,
  active_case_count: "0",
  member_count: "0",
};
const groupDetailRow = {
  id: "g1",
  org_id: ORG_ID,
  group_no: "GRP-001",
  name: "Alpha",
  description: null,
  active_flag: true,
  created_by: USER_ID,
  created_at: ISO,
  updated_by: USER_ID,
  updated_at: ISO_LATER,
};
const groupMemberRow = {
  id: "m1",
  user_id: USER_ID,
  is_primary_group: true,
  active_flag: true,
  joined_at: ISO,
  user_name: "Tanaka",
  user_email: "tanaka@example.com",
  user_role: "staff",
};
void test("BUG-135 GroupsService.listGroups: Date created_at → ISO string", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups")) {
      return Promise.resolve({
        rows: [{ ...groupSummaryRow, created_at: new Date(ISO) }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, noopTimeline());
  const result = await service.listGroups(ctx());
  assert.equal(result.items[0]?.createdAt, ISO);
});
void test("BUG-135 GroupsService.getGroupDetail: Date timestamps → ISO strings", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups g WHERE")) {
      return Promise.resolve({
        rows: [
          {
            ...groupDetailRow,
            created_at: new Date(ISO),
            updated_at: new Date(ISO_LATER),
          },
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("user_group_memberships")) {
      return Promise.resolve({
        rows: [{ ...groupMemberRow, joined_at: new Date(ISO) }],
        rowCount: 1,
      });
    }
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "0", case_count: "0" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, noopTimeline());
  const detail = await service.getGroupDetail(ctx(), "g1");
  assert.ok(detail);
  assert.equal(detail.createdAt, ISO);
  assert.equal(detail.updatedAt, ISO_LATER);
  assert.equal(detail.members[0]?.joinedAt, ISO);
});
// ── FeatureFlagsService.list ──────────────────────────────────────
void test("BUG-135 FeatureFlagsService.list: Date timestamps → ISO strings", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from feature_flags")) {
      return Promise.resolve({
        rows: [
          {
            id: "ff1",
            org_id: ORG_ID,
            key: "demo.flag",
            enabled: true,
            payload: {},
            created_at: new Date(ISO),
            updated_at: new Date(ISO_LATER),
          },
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new FeatureFlagsService(pool, noopTimeline());
  const list = await service.list(ctx());
  assert.equal(list[0]?.createdAt, ISO);
  assert.equal(list[0]?.updatedAt, ISO_LATER);
});
// ── ContactPersonsService.get (full pipeline through pool) ────────
void test("BUG-135 ContactPersonsService.get: Date timestamps → ISO strings", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from contact_persons")) {
      return Promise.resolve({
        rows: [
          {
            ...baseContactRow,
            created_at: new Date(ISO),
            updated_at: new Date(ISO_LATER),
          },
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new ContactPersonsService(pool, noopTimeline());
  const cp = await service.get(ctx(), "cp1");
  assert.ok(cp);
  assert.equal(cp.createdAt, ISO);
  assert.equal(cp.updatedAt, ISO_LATER);
});
// ── CompaniesService.get (full pipeline through pool) ─────────────
void test("BUG-135 CompaniesService.get: Date timestamps → ISO strings", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from companies")) {
      return Promise.resolve({
        rows: [
          {
            ...baseCompanyRow,
            created_at: new Date(ISO),
            updated_at: new Date(ISO_LATER),
          },
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new CompaniesService(pool, noopTimeline());
  const c = await service.get(ctx(), "co1");
  assert.ok(c);
  assert.equal(c.createdAt, ISO);
  assert.equal(c.updatedAt, ISO_LATER);
});
//# sourceMappingURL=timestamps.bug135-regression.test.js.map
