import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(HERE, "..");

function walkVueFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") walkVueFiles(full, out);
    else if (e.isFile() && e.name.endsWith(".vue")) out.push(full);
  }
  return out;
}

function extractStyle(content: string): string[] {
  const blocks: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

function extractTemplate(content: string): string | null {
  const start = content.indexOf("<template");
  if (start === -1) return null;
  const close = content.indexOf(">", start);
  if (close === -1) return null;
  const end = content.lastIndexOf("</template>");
  if (end === -1 || end <= close) return null;
  return content.substring(close + 1, end);
}

function lineAt(content: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === "\n") n++;
  }
  return n;
}

// --- Rule 1: grid-template-columns with bare `fr` must use minmax(0, ...) ---

const GRID_COLUMNS_RE = /grid-template-columns\s*:\s*([^;}{]+)/g;

/**
 * 裸 fr 检测：判断 grid 值中是否存在未被 minmax(0, ...) 包裹的 fr 单位。
 *
 * @param value grid-template-columns 声明值
 * @returns 存在裸 fr 时返回 true
 */
function hasBarefrUnit(value: string): boolean {
  const stripped = value.replace(/minmax\s*\([^)]*\)/g, "");
  if (!/\d*fr\b/.test(stripped)) return false;
  if (/^\s*\d*fr\s*$/.test(stripped)) return false;
  return true;
}

interface GridViolation {
  file: string;
  line: number;
  declaration: string;
}

/**
 * 存量裸 fr 白名单：记录各文件允许的最大违规数量。
 * 随 S7 等后续 PR 逐步迁移到 minmax(0, ...)，迁移后递减并移除。
 */
const KNOWN_GRID_VIOLATIONS = new Map<string, { max: number; note: string }>([
  [
    "views/cases/components/CaseInfoTab.vue",
    { max: 2, note: "S7 — multi-col grids" },
  ],
  [
    "views/cases/components/CaseSurveyQuoteSection.vue",
    { max: 1, note: "S7 — 3-col grid" },
  ],
  [
    "views/cases/components/CaseCreateModal.vue",
    { max: 1, note: "modal — constrained parent" },
  ],
  [
    "views/cases/components/CaseEditModal.vue",
    { max: 1, note: "modal — constrained parent" },
  ],
  [
    "views/cases/components/CaseCloseReasonModal.vue",
    { max: 1, note: "modal — constrained parent" },
  ],
  [
    "views/cases/components/CaseCreateStep4.vue",
    { max: 1, note: "S7 — summary 3-col" },
  ],
  [
    "views/cases/components/CaseOverviewTab.vue",
    { max: 1, note: "S7 — 2fr 1fr grid" },
  ],
  [
    "views/cases/components/CaseOverviewTimeline.vue",
    { max: 1, note: "S7 — dual-track" },
  ],
  [
    "views/cases/components/CaseOverviewStatCards.vue",
    { max: 2, note: "S7 — stat cards grid" },
  ],
  [
    "views/cases/components/CaseDeadlinesTab.vue",
    { max: 1, note: "S7 — summaries grid" },
  ],
  [
    "views/cases/components/CaseBillingTab.vue",
    { max: 1, note: "S7 — stats grid" },
  ],
  [
    "views/cases/components/CaseMessagesTab.vue",
    { max: 1, note: "S7 — sidebar grid" },
  ],
  [
    "views/cases/components/CaseValidationSupport.vue",
    { max: 1, note: "S7 — 2-col grid" },
  ],
  [
    "views/cases/components/CaseSummaryCards.vue",
    { max: 2, note: "S7 — summary cards" },
  ],
  [
    "views/customers/components/CustomerSummaryCards.vue",
    { max: 2, note: "S7 — summary cards" },
  ],
  [
    "views/customers/components/CustomerCaseSummaryStrip.vue",
    { max: 2, note: "S7 — metrics grid" },
  ],
  [
    "views/documents/components/DocumentSummaryCards.vue",
    { max: 2, note: "S7 — summary cards" },
  ],
  [
    "views/billing/components/BillingSummaryCards.vue",
    { max: 2, note: "S7 — summary cards" },
  ],
  [
    "views/leads/components/LeadCreateModalBody.vue",
    { max: 1, note: "modal — constrained parent" },
  ],
  [
    "views/leads/components/LeadInfoTab.vue",
    { max: 1, note: "S7 — 2-col variant" },
  ],
  [
    "views/leads/components/LeadFollowupsTab.vue",
    { max: 1, note: "S7 — date picker row" },
  ],
  [
    "views/leads/components/LeadConversionTab.vue",
    { max: 1, note: "S7 — 2-col variant" },
  ],
  [
    "views/settings/components/StorageRootPanel.vue",
    { max: 1, note: "S7 — meta grid" },
  ],
  [
    "views/settings/components/GroupStatsPanel.vue",
    { max: 1, note: "S7 — stats grid" },
  ],
  [
    "views/auth/LoginView.vue",
    { max: 1, note: "login — has mobile breakpoint" },
  ],
]);

// --- Rule 2: <table> must be inside ResponsiveTable or data-h5-mode container ---

interface TableViolation {
  file: string;
  line: number;
}

const RESPONSIVE_TABLE_RE = /<(?:ResponsiveTable|responsive-table)\b/;
const DATA_H5_MODE_RE = /data-h5-mode/;

function tableHasResponsiveWrapper(
  template: string,
  tableIndex: number,
): boolean {
  const preceding = template.substring(
    Math.max(0, tableIndex - 500),
    tableIndex,
  );
  return RESPONSIVE_TABLE_RE.test(preceding) || DATA_H5_MODE_RE.test(preceding);
}

/**
 * 存量裸 table 白名单：S3 引入 ResponsiveTable 后逐步迁移并递减。
 */
const KNOWN_TABLE_VIOLATIONS = new Map<string, { max: number; note: string }>([
  [
    "views/billing/components/BillingTable.vue",
    { max: 1, note: "S3 — migrate to ResponsiveTable" },
  ],
  [
    "views/billing/components/PaymentLogTable.vue",
    { max: 1, note: "S3 — migrate to ResponsiveTable" },
  ],
  [
    "views/cases/components/CaseTable.vue",
    { max: 1, note: "S3 — migrate to ResponsiveTable" },
  ],
  [
    "views/cases/components/CaseBillingTab.vue",
    { max: 1, note: "S3 — billing payment table" },
  ],
  [
    "views/cases/components/CaseDocumentDetail.vue",
    { max: 1, note: "S3 — version history table" },
  ],
  [
    "views/customers/components/CustomerTable.vue",
    { max: 1, note: "S3 — migrate to ResponsiveTable" },
  ],
  [
    "views/customers/components/CustomerCasesTab.vue",
    { max: 1, note: "S3 — cases table" },
  ],
  [
    "views/customers/components/CustomerContactsTab.vue",
    { max: 1, note: "S3 — contacts table" },
  ],
  [
    "views/customers/components/CustomerLogsTab.vue",
    { max: 1, note: "S3 — logs table" },
  ],
  [
    "views/conversations/ConversationsListView.vue",
    { max: 1, note: "S3 — conversation table" },
  ],
  [
    "views/documents/components/DocumentTable.vue",
    { max: 1, note: "S3 — migrate to ResponsiveTable" },
  ],
  [
    "views/leads/components/LeadTable.vue",
    { max: 1, note: "S3 — migrate to ResponsiveTable" },
  ],
  [
    "views/settings/components/GroupListPanel.vue",
    { max: 1, note: "S3 — group list table" },
  ],
  [
    "views/settings/components/GroupMemberList.vue",
    { max: 1, note: "S3 — member table" },
  ],
  ["views/tasks/TaskListView.vue", { max: 2, note: "S3 — task tables" }],
]);

// --- Test execution ---

describe("H5 overflow contract — grid must use minmax(0, fr) and tables must use ResponsiveTable", () => {
  const files = walkVueFiles(SRC_DIR);

  const gridViolations: GridViolation[] = [];
  const tableViolations: TableViolation[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const relPath = relative(SRC_DIR, file);

    const styleBlocks = extractStyle(content);
    for (const style of styleBlocks) {
      const baseOffset = content.indexOf(style);
      let match: RegExpExecArray | null;
      GRID_COLUMNS_RE.lastIndex = 0;
      while ((match = GRID_COLUMNS_RE.exec(style)) !== null) {
        const value = match[1].trim();
        if (hasBarefrUnit(value)) {
          const offset = baseOffset + (match.index ?? 0);
          gridViolations.push({
            file: relPath,
            line: lineAt(content, offset),
            declaration: `grid-template-columns: ${value}`,
          });
        }
      }
    }

    const template = extractTemplate(content);
    if (template) {
      const templateOffset = content.indexOf(template);
      const tableRe = /<table\b/g;
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tableRe.exec(template)) !== null) {
        if (!tableHasResponsiveWrapper(template, tMatch.index)) {
          tableViolations.push({
            file: relPath,
            line: lineAt(content, templateOffset + tMatch.index),
          });
        }
      }
    }
  }

  it("no new grid-template-columns with bare fr units (must use minmax(0, fr))", () => {
    const perFile = new Map<string, number>();
    for (const v of gridViolations) {
      perFile.set(v.file, (perFile.get(v.file) ?? 0) + 1);
    }

    const unexpected: string[] = [];
    for (const [file, count] of perFile) {
      const tracked = KNOWN_GRID_VIOLATIONS.get(file);
      if (!tracked) {
        unexpected.push(
          `${file}: ${count} bare-fr grid declaration(s) — NOT in baseline`,
        );
      } else if (count > tracked.max) {
        unexpected.push(
          `${file}: ${count} bare-fr grid declaration(s) — exceeds baseline of ${tracked.max} (${tracked.note})`,
        );
      }
    }

    expect(
      unexpected,
      `Grid overflow violations (use minmax(0, 1fr) instead of bare 1fr):\n${unexpected.join("\n")}`,
    ).toEqual([]);
  });

  it("tracked grid violations still exist (remove from baseline after migration)", () => {
    const perFile = new Map<string, number>();
    for (const v of gridViolations) {
      perFile.set(v.file, (perFile.get(v.file) ?? 0) + 1);
    }

    for (const [file, { note }] of KNOWN_GRID_VIOLATIONS) {
      if (!perFile.has(file)) {
        expect
          .soft(
            true,
            `"${file}" (${note}) has 0 bare-fr grids — remove from KNOWN_GRID_VIOLATIONS`,
          )
          .toBe(true);
      }
    }
  });

  it("no new <table> without ResponsiveTable or data-h5-mode wrapper", () => {
    const perFile = new Map<string, number>();
    for (const v of tableViolations) {
      perFile.set(v.file, (perFile.get(v.file) ?? 0) + 1);
    }

    const unexpected: string[] = [];
    for (const [file, count] of perFile) {
      const tracked = KNOWN_TABLE_VIOLATIONS.get(file);
      if (!tracked) {
        unexpected.push(
          `${file}: ${count} unwrapped <table>(s) — NOT in baseline`,
        );
      } else if (count > tracked.max) {
        unexpected.push(
          `${file}: ${count} unwrapped <table>(s) — exceeds baseline of ${tracked.max} (${tracked.note})`,
        );
      }
    }

    expect(
      unexpected,
      `Table overflow violations (wrap with <ResponsiveTable> or add data-h5-mode):\n${unexpected.join("\n")}`,
    ).toEqual([]);
  });

  it("tracked table violations still exist (remove from baseline after S3 migration)", () => {
    const perFile = new Map<string, number>();
    for (const v of tableViolations) {
      perFile.set(v.file, (perFile.get(v.file) ?? 0) + 1);
    }

    for (const [file, { note }] of KNOWN_TABLE_VIOLATIONS) {
      if (!perFile.has(file)) {
        expect
          .soft(
            true,
            `"${file}" (${note}) has 0 unwrapped tables — remove from KNOWN_TABLE_VIOLATIONS`,
          )
          .toBe(true);
      }
    }
  });
});
