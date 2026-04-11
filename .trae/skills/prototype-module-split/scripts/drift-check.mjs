#!/usr/bin/env node

/**
 * Drift checker for split-manifest artifacts.
 *
 * Compares the manifest's declared files against the actual filesystem
 * and (optionally) verifies sourceInputs SHA-256 fingerprints.
 *
 * Detects:
 *   - Files declared in manifest but missing on disk  (phantom)
 *   - Files on disk in sections/scripts/data/ but not in manifest  (undeclared)
 *   - sourceInputs fingerprint mismatches  (stale)
 *   - Missing entryFile or referenceDocs
 *
 * Usage:
 *   node drift-check.mjs --manifest <path>
 *
 * Exit 0 = no drift, exit 1 = drift detected.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function sha256File(absPath) {
  return createHash("sha256").update(fs.readFileSync(absPath)).digest("hex");
}

function listFilesFlat(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isFile()) results.push(entry.name);
  }
  return results;
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

const args = parseArgs(process.argv.slice(2));
const manifestArg = args.manifest;

if (!manifestArg) {
  console.error("Usage: node drift-check.mjs --manifest <path>");
  process.exit(1);
}

const workspaceRoot = process.cwd();
const manifestPath = path.resolve(workspaceRoot, manifestArg);

if (!fs.existsSync(manifestPath)) {
  console.error(`manifest not found: ${manifestPath}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch {
  console.error(`invalid JSON: ${manifestPath}`);
  process.exit(1);
}

const moduleDirAbs = manifest.moduleDir
  ? path.resolve(workspaceRoot, manifest.moduleDir)
  : path.dirname(manifestPath);

const phantoms = [];
const undeclared = [];
const stale = [];
const missingRefs = [];

/* --- 1. Check declared files exist on disk --- */

const declaredSections = (manifest.sections || []).map((s) => s.file);
const declaredData = (manifest.dataFiles || []).map((d) => d.file);
const declaredScripts = (manifest.scripts || []).map((s) => s.file);

for (const relFile of [...declaredSections, ...declaredData, ...declaredScripts]) {
  const absFile = path.join(moduleDirAbs, relFile);
  if (!fs.existsSync(absFile)) {
    phantoms.push(relFile);
  }
}

/* --- 2. Check for undeclared files on disk --- */

const buckets = [
  { dir: "sections", declared: new Set(declaredSections) },
  { dir: "data", declared: new Set(declaredData) },
  { dir: "scripts", declared: new Set(declaredScripts) },
];

for (const { dir, declared } of buckets) {
  const dirAbs = path.join(moduleDirAbs, dir);
  for (const fileName of listFilesFlat(dirAbs)) {
    const relPath = `${dir}/${fileName}`;
    if (!declared.has(relPath)) {
      undeclared.push(relPath);
    }
  }
}

/* --- 3. Check entryFile --- */

if (manifest.entryFile) {
  const entryAbs = path.resolve(workspaceRoot, manifest.entryFile);
  if (!fs.existsSync(entryAbs)) {
    missingRefs.push(`entryFile: ${manifest.entryFile}`);
  }
}

/* --- 4. Check referenceDocs --- */

if (Array.isArray(manifest.referenceDocs)) {
  for (const doc of manifest.referenceDocs) {
    const docAbs = path.resolve(workspaceRoot, doc);
    if (!fs.existsSync(docAbs)) {
      missingRefs.push(`referenceDoc: ${doc}`);
    }
  }
}

/* --- 5. Verify sourceInputs fingerprints --- */

if (Array.isArray(manifest.sourceInputs)) {
  for (const input of manifest.sourceInputs) {
    if (!input.file) continue;
    const fileAbs = path.resolve(workspaceRoot, input.file);
    if (!fs.existsSync(fileAbs)) {
      stale.push({ file: input.file, reason: "file not found" });
      continue;
    }
    if (input.sha256) {
      const actual = sha256File(fileAbs);
      if (actual !== input.sha256) {
        stale.push({
          file: input.file,
          reason: `sha256 mismatch (manifest: ${input.sha256.slice(0, 12)}…, actual: ${actual.slice(0, 12)}…)`,
        });
      }
    }
  }
}

/* --- Report --- */

const totalIssues = phantoms.length + undeclared.length + stale.length + missingRefs.length;

if (phantoms.length > 0) {
  console.error(`\nPhantom entries (in manifest but missing on disk): ${phantoms.length}`);
  phantoms.forEach((f) => console.error(`  - ${f}`));
}
if (undeclared.length > 0) {
  console.error(`\nUndeclared files (on disk but not in manifest): ${undeclared.length}`);
  undeclared.forEach((f) => console.error(`  - ${f}`));
}
if (stale.length > 0) {
  console.error(`\nStale sourceInputs (fingerprint drift): ${stale.length}`);
  stale.forEach((s) => console.error(`  - ${s.file}: ${s.reason}`));
}
if (missingRefs.length > 0) {
  console.error(`\nMissing references: ${missingRefs.length}`);
  missingRefs.forEach((r) => console.error(`  - ${r}`));
}

if (totalIssues > 0) {
  console.error(`\ndrift-check FAILED — ${totalIssues} issue(s) found`);
  process.exit(1);
}

console.log("drift-check PASSED — manifest and filesystem are in sync");
