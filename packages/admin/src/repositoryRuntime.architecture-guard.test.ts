/// <reference types="node" />
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __testDir = path.dirname(fileURLToPath(import.meta.url));

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (
      /\.(ts|vue)$/.test(entry.name) &&
      !entry.name.endsWith(".test.ts")
    ) {
      results.push(full);
    }
  }
  return results;
}

function extractImportPaths(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const paths: string[] = [];
  const regex = /(?:from\s+|import\s*\()["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

describe("architecture guard — repositoryRuntime", () => {
  it("cases wrapper defaults apiPath to /api/cases", async () => {
    const { createRuntime } =
      await import("./views/cases/model/CaseRepositorySupport");
    const rt = createRuntime({ getToken: () => "t" });
    expect(rt.apiPath).toBe("/api/cases");
    expect(rt.writeErrorCode).toBe("CASE_WRITE_ERROR");
    expect(rt.entityLabel).toBe("Case");
    expect(rt.errorName).toBe("CaseRepositoryError");
  });

  it("billing wrapper defaults apiPath to /api", async () => {
    const { createBillingRepositoryRuntime } =
      await import("./views/billing/model/BillingRepositorySupport");
    const rt = createBillingRepositoryRuntime({ getToken: () => "t" });
    expect(rt.apiPath).toBe("/api");
    expect(rt.writeErrorCode).toBe("BILLING_WRITE_ERROR");
    expect(rt.entityLabel).toBe("Billing");
    expect(rt.errorName).toBe("BillingRepositoryError");
  });

  it("shared createRepositoryRuntime requires apiPath and getToken (no defaults)", async () => {
    const { createRepositoryRuntime } =
      await import("./shared/api/repositoryRuntime");
    const rt = createRepositoryRuntime({
      apiPath: "/api/custom",
      getToken: () => "tok",
    });
    expect(rt.apiPath).toBe("/api/custom");
    expect(rt.getToken()).toBe("tok");
    expect(rt.writeErrorCode).toBe("WRITE_ERROR");
    expect(rt.entityLabel).toBe("Request");
    expect(rt.errorName).toBe("RepositoryError");
  });

  it("cases and billing wrappers produce RepositoryError-compatible errors", async () => {
    const { CaseRepositoryError } =
      await import("./views/cases/model/CaseRepositorySupport");
    const { BillingRepositoryError } =
      await import("./views/billing/model/BillingRepositorySupport");
    const { RepositoryError } = await import("./shared/api/repositoryRuntime");

    const caseErr = new CaseRepositoryError({
      code: "NETWORK",
      message: "test",
    });
    const billingErr = new BillingRepositoryError({
      code: "NETWORK",
      message: "test",
    });

    expect(caseErr).toBeInstanceOf(RepositoryError);
    expect(caseErr).toBeInstanceOf(Error);
    expect(billingErr).toBeInstanceOf(RepositoryError);
    expect(billingErr).toBeInstanceOf(Error);
  });
});

describe("architecture guard — import boundaries", () => {
  it("views/billing must not import views/cases", () => {
    const billingDir = path.join(__testDir, "views/billing");
    const files = collectSourceFiles(billingDir);
    const violations: string[] = [];

    for (const file of files) {
      const imports = extractImportPaths(file);
      for (const imp of imports) {
        const resolved = path.resolve(path.dirname(file), imp);
        if (resolved.includes(path.join("views", "cases"))) {
          violations.push(`${path.relative(__testDir, file)} → ${imp}`);
        }
      }
    }

    expect(violations, "billing must not depend on cases").toEqual([]);
  });

  it("shared/api must not import views", () => {
    const sharedApiDir = path.join(__testDir, "shared/api");
    const files = collectSourceFiles(sharedApiDir);
    const violations: string[] = [];

    for (const file of files) {
      const imports = extractImportPaths(file);
      for (const imp of imports) {
        const resolved = path.resolve(path.dirname(file), imp);
        if (resolved.includes(path.join("src", "views"))) {
          violations.push(`${path.relative(__testDir, file)} → ${imp}`);
        }
      }
    }

    expect(violations, "shared/api must not depend on views").toEqual([]);
  });
});
