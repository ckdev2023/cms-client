#!/usr/bin/env node

/**
 * Phase-gate checker for the prototype split pipeline.
 *
 * Enforces that all prerequisite artifacts and conditions are met
 * before allowing progression to the target phase.
 *
 * Pipeline: init → audit → boundary → review → execute → closeout
 *
 * Usage:
 *   node phase-gate.mjs --module-dir <path> --target-phase <phase> [--suffix <suffix>]
 *
 * Examples:
 *   node phase-gate.mjs --module-dir packages/prototype/admin/case --target-phase audit
 *   node phase-gate.mjs --module-dir packages/prototype/admin/case --target-phase execute --suffix detail
 *
 * Exit 0 = gate passed, exit 1 = gate failed.
 */

import fs from "node:fs";
import path from "node:path";

const PHASES = ["init", "audit", "boundary", "review", "execute", "closeout"];

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

function artifactName(base, suffix) {
  return suffix ? `${base}-${suffix}.json` : `${base}.json`;
}

function tryLoadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Gate rule definitions                                             */
/* ------------------------------------------------------------------ */

/**
 * @param {string} moduleDirAbs
 * @param {string} suffix
 * @returns {{ errors: string[], warnings: string[] }}
 */
function checkInitGate(moduleDirAbs, suffix) {
  const errors = [];
  if (!fs.existsSync(moduleDirAbs)) {
    errors.push(`module directory does not exist: ${moduleDirAbs}`);
  }
  return { errors, warnings: [] };
}

function checkAuditGate(moduleDirAbs, suffix) {
  const errors = [];
  const warnings = [];
  const smPath = path.join(moduleDirAbs, artifactName("split-manifest", suffix));
  const sm = tryLoadJson(smPath);

  if (!sm) {
    errors.push(`split-manifest required but not found: ${smPath}`);
    return { errors, warnings };
  }
  if (!sm.moduleId) errors.push("split-manifest missing moduleId");
  if (!sm.entryFile) errors.push("split-manifest missing entryFile");

  for (const dir of ["sections", "scripts", "data"]) {
    const dirPath = path.join(moduleDirAbs, dir);
    if (!fs.existsSync(dirPath)) {
      warnings.push(`directory not found (expected from init): ${dirPath}`);
    }
  }
  return { errors, warnings };
}

function checkBoundaryGate(moduleDirAbs, suffix) {
  const { errors, warnings } = checkAuditGate(moduleDirAbs, suffix);
  const amPath = path.join(moduleDirAbs, artifactName("audit-manifest", suffix));
  const am = tryLoadJson(amPath);

  if (!am) {
    errors.push(`audit-manifest required but not found: ${amPath}`);
    return { errors, warnings };
  }
  if (!am.sourceInputs || am.sourceInputs.length === 0) {
    errors.push("audit-manifest must have at least one sourceInput");
  }
  if (!am.affinityTags || am.affinityTags.length === 0) {
    errors.push("audit-manifest must have at least one affinityTag");
  }
  return { errors, warnings };
}

function checkReviewGate(moduleDirAbs, suffix) {
  const { errors, warnings } = checkBoundaryGate(moduleDirAbs, suffix);
  const bmPath = path.join(moduleDirAbs, artifactName("boundary-map", suffix));
  const bm = tryLoadJson(bmPath);

  if (!bm) {
    errors.push(`boundary-map required but not found: ${bmPath}`);
    return { errors, warnings };
  }
  if (!bm.targetFiles || bm.targetFiles.length === 0) {
    errors.push("boundary-map must define at least one targetFile");
  }
  if (!bm.loadOrder || bm.loadOrder.length === 0) {
    errors.push("boundary-map must define a loadOrder");
  }
  if (!bm.sourceInputs || bm.sourceInputs.length === 0) {
    errors.push("boundary-map must have at least one sourceInput");
  }
  return { errors, warnings };
}

function checkExecuteGate(moduleDirAbs, suffix) {
  const { errors, warnings } = checkReviewGate(moduleDirAbs, suffix);
  const bmPath = path.join(moduleDirAbs, artifactName("boundary-map", suffix));
  const bm = tryLoadJson(bmPath);

  if (bm) {
    const approval = bm.phase && bm.phase.reviewApproval;
    if (!approval || approval.approved !== true) {
      errors.push(
        "boundary-map.phase.reviewApproval.approved must be true before execute. " +
        "Run the review phase and record approval first."
      );
    }
  }

  const amPath = path.join(moduleDirAbs, artifactName("audit-manifest", suffix));
  const am = tryLoadJson(amPath);
  if (am) {
    if (am.unknowns && am.unknowns.length > 0) {
      const blocking = am.unknowns.filter((u) => u.impact === "blocking");
      if (blocking.length > 0) {
        errors.push(
          `audit-manifest has ${blocking.length} blocking unknown(s) that must be resolved or waived: ` +
          blocking.map((u) => u.id).join(", ")
        );
      }
    }
  }

  return { errors, warnings };
}

function checkCloseoutGate(moduleDirAbs, suffix) {
  const { errors, warnings } = checkExecuteGate(moduleDirAbs, suffix);
  const smPath = path.join(moduleDirAbs, artifactName("split-manifest", suffix));
  const sm = tryLoadJson(smPath);

  if (sm) {
    if (!sm.sections || sm.sections.length === 0) {
      errors.push("split-manifest must have at least one section before closeout");
    }
    if (!sm.scripts || sm.scripts.length === 0) {
      errors.push("split-manifest must have at least one script before closeout");
    }

    const allFiles = [
      ...(sm.sections || []).map((s) => s.file),
      ...(sm.dataFiles || []).map((d) => d.file),
      ...(sm.scripts || []).map((s) => s.file),
    ];
    for (const relFile of allFiles) {
      const absFile = path.join(moduleDirAbs, relFile);
      if (!fs.existsSync(absFile)) {
        errors.push(`declared file missing on disk: ${relFile}`);
      }
    }
  }

  return { errors, warnings };
}

const GATE_CHECKS = {
  init: checkInitGate,
  audit: checkAuditGate,
  boundary: checkBoundaryGate,
  review: checkReviewGate,
  execute: checkExecuteGate,
  closeout: checkCloseoutGate,
};

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

const args = parseArgs(process.argv.slice(2));
const moduleDirArg = args["module-dir"];
const targetPhase = args["target-phase"];
const suffix = args.suffix || "";

if (!moduleDirArg || !targetPhase) {
  console.error(
    "Usage: node phase-gate.mjs --module-dir <path> --target-phase <phase> [--suffix <suffix>]\n" +
    `Phases: ${PHASES.join(", ")}`
  );
  process.exit(1);
}

if (!PHASES.includes(targetPhase)) {
  console.error(`unknown phase: ${targetPhase}. Must be one of: ${PHASES.join(", ")}`);
  process.exit(1);
}

const moduleDirAbs = path.resolve(process.cwd(), moduleDirArg);
const checker = GATE_CHECKS[targetPhase];
const { errors, warnings } = checker(moduleDirAbs, suffix);

if (warnings.length > 0) {
  warnings.forEach((w) => console.warn(`  warn: ${w}`));
}

if (errors.length > 0) {
  console.error(`phase-gate FAILED for "${targetPhase}"`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`phase-gate PASSED for "${targetPhase}"`);
