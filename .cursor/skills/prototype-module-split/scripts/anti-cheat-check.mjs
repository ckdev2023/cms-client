#!/usr/bin/env node

/**
 * Anti-cheat checker for split-pipeline manifests.
 *
 * Prevents "manifests are self-consistent but collectively wrong" by
 * comparing manifest claims against the actual source code:
 *
 *   1. Cross-manifest consistency (moduleId, sourceInputs overlap)
 *   2. sourceInputs fingerprint verification against real files
 *   3. Provenance compliance (extracted fields need sourceInputs, inferred need reason)
 *   4. Audit-manifest: claimed symbols exist in source code
 *   5. Boundary-map: function assignments reference real symbols
 *   6. Boundary-map: load order references match declared targetFiles
 *   7. Split-manifest: declared script/data exports exist in file contents
 *   8. Derived fields consistency (dependency edges match function assignments)
 *   9. Suspicious zero-unknowns detection for complex modules
 *
 * Usage:
 *   node anti-cheat-check.mjs --module-dir <path> [--suffix <suffix>]
 *
 * The script auto-discovers manifests in the module directory.
 * Exit 0 = checks passed, exit 1 = integrity violations found.
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

function tryLoadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readFileContent(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return fs.readFileSync(absPath, "utf8");
}

function artifactName(base, suffix) {
  return suffix ? `${base}-${suffix}.json` : `${base}.json`;
}

/* ------------------------------------------------------------------ */
/*  Check: cross-manifest consistency                                 */
/* ------------------------------------------------------------------ */

function checkCrossConsistency(manifests, errors) {
  const moduleIds = new Set();
  for (const [name, m] of Object.entries(manifests)) {
    if (m && m.moduleId) moduleIds.add(`${name}=${m.moduleId}`);
  }
  const uniqueIds = new Set(Object.values(manifests).filter(Boolean).map((m) => m.moduleId));
  if (uniqueIds.size > 1) {
    errors.push(`moduleId mismatch across manifests: ${[...moduleIds].join(", ")}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Check: sourceInputs fingerprints against real files               */
/* ------------------------------------------------------------------ */

function checkSourceInputs(manifests, workspaceRoot, errors) {
  for (const [name, m] of Object.entries(manifests)) {
    if (!m || !Array.isArray(m.sourceInputs)) continue;
    for (const input of m.sourceInputs) {
      if (!input.file) continue;
      const absFile = path.resolve(workspaceRoot, input.file);
      if (!fs.existsSync(absFile)) {
        errors.push(`${name}: sourceInput file not found: ${input.file}`);
        continue;
      }
      if (input.sha256) {
        const actual = sha256File(absFile);
        if (actual !== input.sha256) {
          errors.push(
            `${name}: sourceInput fingerprint stale for ${input.file} ` +
            `(expected ${input.sha256.slice(0, 12)}…, got ${actual.slice(0, 12)}…)`
          );
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Check: audit-manifest symbols exist in source                     */
/* ------------------------------------------------------------------ */

function checkAuditSymbols(audit, workspaceRoot, errors) {
  if (!audit) return;

  const sourceFiles = (audit.sourceInputs || []).map((si) => si.file).filter(Boolean);
  let combinedSource = "";
  for (const sf of sourceFiles) {
    const content = readFileContent(path.resolve(workspaceRoot, sf));
    if (content) combinedSource += content + "\n";
  }

  if (!combinedSource) {
    if (sourceFiles.length > 0) {
      errors.push("audit-manifest: none of the sourceInput files could be read");
    }
    return;
  }

  const checkList = [
    ...(audit.externalGlobals || []).map((g) => ({ kind: "externalGlobal", name: g.name })),
    ...(audit.helperFunctions || []).map((h) => ({ kind: "helperFunction", name: h.name })),
  ];

  for (const item of checkList) {
    if (!item.name) continue;
    const escaped = item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(escaped).test(combinedSource)) {
      errors.push(`audit-manifest: ${item.kind} "${item.name}" not found in source files`);
    }
  }

  const domRefs = audit.domReferences || [];
  for (const ref of domRefs) {
    if (!ref.selector) continue;
    const escaped = ref.selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(escaped).test(combinedSource)) {
      errors.push(`audit-manifest: domReference selector "${ref.selector}" not found in source`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Check: boundary-map function assignments exist in source          */
/* ------------------------------------------------------------------ */

function checkBoundaryFunctions(boundary, workspaceRoot, errors) {
  if (!boundary) return;

  const sourceFiles = (boundary.sourceInputs || []).map((si) => si.file).filter(Boolean);
  let combinedSource = "";
  for (const sf of sourceFiles) {
    const content = readFileContent(path.resolve(workspaceRoot, sf));
    if (content) combinedSource += content + "\n";
  }

  if (!combinedSource) {
    if (sourceFiles.length > 0) {
      errors.push("boundary-map: none of the sourceInput files could be read");
    }
    return;
  }

  const functions = boundary.functions || [];
  for (const fn of functions) {
    if (!fn.name) continue;
    const escaped = fn.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`\\b${escaped}\\b`).test(combinedSource)) {
      errors.push(`boundary-map: function "${fn.name}" not found in source files`);
    }
  }

  const targetShorthands = new Set((boundary.targetFiles || []).map((t) => t.shorthand));
  for (const entry of boundary.loadOrder || []) {
    if (!targetShorthands.has(entry)) {
      errors.push(`boundary-map: loadOrder entry "${entry}" not in targetFiles shorthands`);
    }
  }

  for (const fn of functions) {
    if (fn.targetFile && !targetShorthands.has(fn.targetFile)) {
      errors.push(`boundary-map: function "${fn.name}" assigned to unknown target "${fn.targetFile}"`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Check: provenance compliance (truth-source rules)                 */
/* ------------------------------------------------------------------ */

const AUDIT_EXTRACTED_COLLECTIONS = [
  "externalGlobals",
  "domReferences",
  "helperFunctions",
  "eventListeners",
  "initSequence",
];

function checkProvenanceCompliance(manifests, errors) {
  for (const [name, m] of Object.entries(manifests)) {
    if (!m) continue;

    if (!m.sourceInputs || m.sourceInputs.length === 0) {
      const hasExtracted = findExtractedFields(m);
      if (hasExtracted) {
        errors.push(
          `${name}: contains extracted-provenance fields but has no sourceInputs`
        );
      }
    }

    if (name === "audit-manifest") {
      for (const collection of AUDIT_EXTRACTED_COLLECTIONS) {
        const items = m[collection];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (item.provenance === "inferred" && !item.reason) {
            if (!isInferrable(name, collection)) {
              errors.push(
                `${name}: ${collection} item "${item.name || item.call || "?"}" ` +
                `is inferred but missing reason`
              );
            }
          }
        }
      }
    }

    if (name === "boundary-map" && m.functions) {
      for (const fn of m.functions) {
        if (fn.provenance === "inferred" && !fn.reason) {
          errors.push(
            `boundary-map: function "${fn.name}" is inferred but missing reason`
          );
        }
      }
    }

  }
}

function findExtractedFields(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (obj.provenance === "extracted") return true;
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (findExtractedFields(item)) return true;
      }
    } else if (typeof val === "object" && val !== null) {
      if (findExtractedFields(val)) return true;
    }
  }
  return false;
}

function isInferrable(manifestName, collection) {
  const inferrable = {
    "audit-manifest": new Set(["affinityTags"]),
    "boundary-map": new Set(["targetFiles", "namespaceApi"]),
  };
  return inferrable[manifestName]?.has(collection) ?? false;
}

/* ------------------------------------------------------------------ */
/*  Check: split-manifest declared exports exist in file contents     */
/* ------------------------------------------------------------------ */

function checkSplitExports(split, moduleDirAbs, errors) {
  if (!split) return;

  const dataFiles = split.dataFiles || [];
  for (const df of dataFiles) {
    if (!df.file || !df.exports || df.exports.length === 0) continue;
    const content = readFileContent(path.join(moduleDirAbs, df.file));
    if (!content) continue;
    for (const exp of df.exports) {
      const escaped = exp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(escaped).test(content)) {
        errors.push(`split-manifest: export "${exp}" not found in ${df.file}`);
      }
    }
  }

  const scripts = split.scripts || [];
  for (const sc of scripts) {
    if (!sc.file) continue;
    const content = readFileContent(path.join(moduleDirAbs, sc.file));
    if (!content) continue;

    for (const hook of sc.domHooks || []) {
      const escaped = hook.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(escaped).test(content)) {
        errors.push(`split-manifest: domHook "${hook}" not found in ${sc.file}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Check: suspicious zero-unknowns for complex modules               */
/* ------------------------------------------------------------------ */

function checkSuspiciousZeroUnknowns(manifests, errors, warnings) {
  const audit = manifests["audit-manifest"];
  if (!audit) return;

  const lineCount = audit.sourceLineCount || 0;
  const unknownsCount = Array.isArray(audit.unknowns) ? audit.unknowns.length : 0;
  const waiversCount = Array.isArray(audit.waivers) ? audit.waivers.length : 0;

  if (lineCount > 200 && unknownsCount === 0 && waiversCount === 0) {
    warnings.push(
      `audit-manifest: source has ${lineCount} lines but zero unknowns and zero waivers — ` +
      `this is suspicious for a complex module; review whether all edge cases were considered`
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Check: derived fields consistency (boundary-map)                  */
/* ------------------------------------------------------------------ */

function checkDerivedConsistency(boundary, errors) {
  if (!boundary) return;

  const functions = boundary.functions || [];
  const targetFiles = boundary.targetFiles || [];
  const targetShorthands = new Set(targetFiles.map((t) => t.shorthand));
  const dependencyEdges = boundary.dependencyEdges || [];

  const expectedEdges = new Map();
  for (const fn of functions) {
    if (!fn.targetFile || !fn.callsOutbound) continue;
    for (const callee of fn.callsOutbound) {
      const calleeFn = functions.find((f) => f.name === callee);
      if (!calleeFn || !calleeFn.targetFile) continue;
      if (fn.targetFile === calleeFn.targetFile) continue;
      const edgeKey = `${fn.targetFile}->${calleeFn.targetFile}`;
      if (!expectedEdges.has(edgeKey)) expectedEdges.set(edgeKey, new Set());
      expectedEdges.get(edgeKey).add(callee);
    }
  }

  for (const [edgeKey, expectedFunctions] of expectedEdges) {
    const [from, to] = edgeKey.split("->");
    const declaredEdge = dependencyEdges.find((e) => e.from === from && e.to === to);
    if (!declaredEdge) {
      errors.push(
        `boundary-map: derived dependencyEdge ${from} → ${to} expected ` +
        `(functions: ${[...expectedFunctions].join(", ")}) but not declared`
      );
    }
  }

  const namespaceApi = boundary.namespaceApi || [];
  for (const nsEntry of namespaceApi) {
    const expectedSymbols = functions
      .filter((f) => f.isNamespaceExport && f.targetFile === nsEntry.file)
      .map((f) => f.name);
    for (const sym of expectedSymbols) {
      if (!nsEntry.symbols.includes(sym)) {
        errors.push(
          `boundary-map: function "${sym}" has isNamespaceExport=true for file "${nsEntry.file}" ` +
          `but is missing from namespaceApi[file=${nsEntry.file}].symbols`
        );
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

const args = parseArgs(process.argv.slice(2));
const moduleDirArg = args["module-dir"];
const suffix = args.suffix || "";

if (!moduleDirArg) {
  console.error("Usage: node anti-cheat-check.mjs --module-dir <path> [--suffix <suffix>]");
  process.exit(1);
}

const workspaceRoot = process.cwd();
const moduleDirAbs = path.resolve(workspaceRoot, moduleDirArg);

if (!fs.existsSync(moduleDirAbs)) {
  console.error(`module directory not found: ${moduleDirAbs}`);
  process.exit(1);
}

const split = tryLoadJson(path.join(moduleDirAbs, artifactName("split-manifest", suffix)));
const audit = tryLoadJson(path.join(moduleDirAbs, artifactName("audit-manifest", suffix)));
const boundary = tryLoadJson(path.join(moduleDirAbs, artifactName("boundary-map", suffix)));

const loaded = [
  split && "split-manifest",
  audit && "audit-manifest",
  boundary && "boundary-map",
].filter(Boolean);

if (loaded.length === 0) {
  console.error("no manifests found in module directory");
  process.exit(1);
}

console.log(`checking ${loaded.length} manifest(s): ${loaded.join(", ")}`);

const manifests = {
  "split-manifest": split,
  "audit-manifest": audit,
  "boundary-map": boundary,
};
const errors = [];

const warnings = [];

checkCrossConsistency(manifests, errors);
checkSourceInputs(manifests, workspaceRoot, errors);
checkProvenanceCompliance(manifests, errors);
checkAuditSymbols(audit, workspaceRoot, errors);
checkBoundaryFunctions(boundary, workspaceRoot, errors);
checkSplitExports(split, moduleDirAbs, errors);
checkDerivedConsistency(boundary, errors);
checkSuspiciousZeroUnknowns(manifests, errors, warnings);

if (warnings.length > 0) {
  console.warn(`\nanti-cheat warnings: ${warnings.length}`);
  warnings.forEach((w) => console.warn(`  warn: ${w}`));
}

if (errors.length > 0) {
  console.error(`\nanti-cheat-check FAILED — ${errors.length} integrity violation(s):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log("anti-cheat-check PASSED — manifest claims verified against source code");
