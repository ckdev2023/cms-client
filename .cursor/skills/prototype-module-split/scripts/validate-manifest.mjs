#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const blueprintPath = path.join(__dirname, "..", "data", "module-split-blueprint.json");
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, "utf8"));

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

function assertRecordKeys(items, requiredKeys, label, errors) {
  if (!Array.isArray(items)) {
    errors.push(`${label} must be an array`);
    return;
  }

  items.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${label}[${index}] must be an object`);
      return;
    }

    requiredKeys.forEach((key) => {
      if (!(key in item)) {
        errors.push(`${label}[${index}] missing key: ${key}`);
      }
    });
  });
}

const args = parseArgs(process.argv.slice(2));
const manifestArg = args.manifest;

if (!manifestArg) {
  console.error(
    "Usage: node .cursor/skills/prototype-module-split/scripts/validate-manifest.mjs --manifest packages/prototype/admin/customers/split-manifest.json"
  );
  process.exit(1);
}

const manifestPath = path.resolve(process.cwd(), manifestArg);
const raw = fs.readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(raw);
const errors = [];

blueprint.manifestRequiredKeys.forEach((key) => {
  if (!(key in manifest)) {
    errors.push(`missing top-level key: ${key}`);
  }
});

if (manifest.sharedCandidates && typeof manifest.sharedCandidates === "object") {
  blueprint.sharedCandidateBuckets.forEach((bucket) => {
    if (!(bucket in manifest.sharedCandidates)) {
      errors.push(`sharedCandidates missing bucket: ${bucket}`);
    }
  });
} else {
  errors.push("sharedCandidates must be an object");
}

if (manifest.productionMapping && typeof manifest.productionMapping === "object") {
  blueprint.productionMappingBuckets.forEach((bucket) => {
    if (!(bucket in manifest.productionMapping)) {
      errors.push(`productionMapping missing bucket: ${bucket}`);
    }
  });
} else {
  errors.push("productionMapping must be an object");
}

assertRecordKeys(
  manifest.sections,
  Object.keys(blueprint.sectionRecord),
  "sections",
  errors
);
assertRecordKeys(
  manifest.dataFiles,
  Object.keys(blueprint.dataRecord),
  "dataFiles",
  errors
);
assertRecordKeys(
  manifest.scripts,
  Object.keys(blueprint.scriptRecord),
  "scripts",
  errors
);

if (!Array.isArray(manifest.referenceDocs)) {
  errors.push("referenceDocs must be an array");
}

if (!Array.isArray(manifest.regressionChecklist)) {
  errors.push("regressionChecklist must be an array");
}

if (!Array.isArray(manifest.notes)) {
  errors.push("notes must be an array");
}

if (errors.length > 0) {
  console.error("manifest invalid");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("manifest valid");
