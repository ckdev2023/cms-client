import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(HERE, "..");

const BUTTON_RE =
  /<(?:button|Button|a-button|AButton)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

const LIVE_PATTERNS = [
  /@click/,
  /v-on:click/,
  /\bdisabled\b/,
  /type\s*=\s*["']submit["']/,
];

function walkVueFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") walkVueFiles(full, out);
    else if (e.isFile() && e.name.endsWith(".vue")) out.push(full);
  }
  return out;
}

function extractTemplate(
  content: string,
): { text: string; offset: number } | null {
  const start = content.indexOf("<template");
  if (start === -1) return null;
  const close = content.indexOf(">", start);
  if (close === -1) return null;
  const end = content.lastIndexOf("</template>");
  if (end === -1 || end <= close) return null;
  return { text: content.substring(close + 1, end), offset: close + 1 };
}

function lineAt(content: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === "\n") n++;
  }
  return n;
}

function isLive(attrs: string): boolean {
  return LIVE_PATTERNS.some((re) => re.test(attrs));
}

interface ButtonViolation {
  file: string;
  line: number;
  tag: string;
}

/**
 * 既知の dead button を持つファイルのベースライン。
 * 各 BUG 修正 PR が落ちたらカウントを下げ、0 になったらエントリを削除する。
 */
const KNOWN_DEAD_BUTTONS = new Map<string, { max: number; bug: string }>([
  ["views/cases/components/CaseFormsTab.vue", { max: 4, bug: "BUG-214" }],
  ["views/cases/components/CaseMessagesTab.vue", { max: 4, bug: "BUG-216" }],
  ["views/cases/components/CaseDeadlinesTab.vue", { max: 1, bug: "BUG-215" }],
  [
    "views/customers/components/CustomerCommsTab.vue",
    { max: 1, bug: "button inside <a> — false positive" },
  ],
  ["views/HomeView.vue", { max: 3, bug: "foundation showcase — decorative" }],
  [
    "views/leads/components/LeadConvertedRecords.vue",
    { max: 2, bug: "placeholder nav buttons" },
  ],
]);

describe("dead button lint — <button>/<Button> must have @click, disabled, or type=submit", () => {
  const files = walkVueFiles(SRC_DIR);
  const violations: ButtonViolation[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const tmpl = extractTemplate(content);
    if (!tmpl) continue;

    for (const m of tmpl.text.matchAll(BUTTON_RE)) {
      if (!isLive(m[1])) {
        const line = lineAt(content, tmpl.offset + (m.index ?? 0));
        const raw = m[0].replace(/\s+/g, " ");
        const tag = raw.length > 80 ? raw.substring(0, 80) + "…" : raw;
        violations.push({ file: relative(SRC_DIR, file), line, tag });
      }
    }
  }

  it("no dead buttons outside tracked baseline", () => {
    const perFile = new Map<string, number>();
    for (const v of violations) {
      perFile.set(v.file, (perFile.get(v.file) ?? 0) + 1);
    }

    const unexpected: string[] = [];
    for (const [file, count] of perFile) {
      const tracked = KNOWN_DEAD_BUTTONS.get(file);
      if (!tracked) {
        unexpected.push(`${file}: ${count} dead button(s) — NOT in baseline`);
      } else if (count > tracked.max) {
        unexpected.push(
          `${file}: ${count} dead button(s) — exceeds baseline of ${tracked.max} (${tracked.bug})`,
        );
      }
    }

    expect(
      unexpected,
      `Dead button violations:\n${unexpected.join("\n")}`,
    ).toEqual([]);
  });

  it("tracked files still have violations (remove from baseline after fix)", () => {
    const perFile = new Map<string, number>();
    for (const v of violations) {
      perFile.set(v.file, (perFile.get(v.file) ?? 0) + 1);
    }

    for (const [file, { bug }] of KNOWN_DEAD_BUTTONS) {
      if (!perFile.has(file)) {
        expect
          .soft(
            true,
            `"${file}" (${bug}) has 0 dead buttons — remove from KNOWN_DEAD_BUTTONS`,
          )
          .toBe(true);
      }
    }
  });
});
