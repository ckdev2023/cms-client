#!/usr/bin/env node

/**
 * Validate a split-pipeline artifact against its JSON Schema definition.
 *
 * Supported types (auto-detected from filename when --type is omitted):
 *   split-manifest | audit-manifest | boundary-map | regression-checklist
 *
 * Usage:
 *   node validate-manifest.mjs --manifest <path> [--type <type>]
 *
 * Exit 0 = valid, exit 1 = invalid / usage error.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const blueprintPath = path.join(dataDir, "module-split-blueprint.json");
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, "utf8"));
const registryPath = path.join(dataDir, "field-provenance-registry.json");
const provenanceRegistry = fs.existsSync(registryPath)
  ? JSON.parse(fs.readFileSync(registryPath, "utf8"))
  : null;

const KNOWN_TYPES = {
  "split-manifest": "split-manifest.schema.json",
  "audit-manifest": "audit-manifest.schema.json",
  "boundary-map": "boundary-map.schema.json",
  "regression-checklist": "regression-checklist.schema.json",
};

/* ------------------------------------------------------------------ */
/*  CLI helpers                                                       */
/* ------------------------------------------------------------------ */

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

function detectType(manifestPath) {
  const base = path.basename(manifestPath);
  for (const typeName of Object.keys(KNOWN_TYPES)) {
    if (base.startsWith(typeName)) return typeName;
  }
  return "split-manifest";
}

/* ------------------------------------------------------------------ */
/*  Minimal JSON-Schema validator (subset used by our schemas)        */
/* ------------------------------------------------------------------ */

function jsonType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function resolveRef(schema, defs) {
  if (!schema || !schema.$ref) return schema;
  const refPath = schema.$ref.replace(/^#\/\$defs\//, "");
  return defs[refPath] || schema;
}

function validateNode(data, schema, defs, nodePath, errors) {
  if (!schema) return;
  const resolved = resolveRef(schema, defs);

  if (resolved.type) {
    const actual = jsonType(data);
    if (resolved.type === "integer") {
      if (typeof data !== "number" || !Number.isInteger(data)) {
        errors.push(`${nodePath}: expected integer, got ${actual}`);
        return;
      }
    } else if (actual !== resolved.type) {
      errors.push(`${nodePath}: expected ${resolved.type}, got ${actual}`);
      return;
    }
  }

  if (resolved.enum && !resolved.enum.includes(data)) {
    errors.push(`${nodePath}: must be one of [${resolved.enum.join(", ")}], got "${data}"`);
  }

  if (resolved.pattern && typeof data === "string") {
    if (!new RegExp(resolved.pattern).test(data)) {
      errors.push(`${nodePath}: does not match pattern ${resolved.pattern}`);
    }
  }

  if (resolved.minLength !== undefined && typeof data === "string" && data.length < resolved.minLength) {
    errors.push(`${nodePath}: string too short (min ${resolved.minLength})`);
  }

  if (resolved.minimum !== undefined && typeof data === "number" && data < resolved.minimum) {
    errors.push(`${nodePath}: value ${data} below minimum ${resolved.minimum}`);
  }

  if (resolved.required && typeof data === "object" && !Array.isArray(data) && data !== null) {
    for (const key of resolved.required) {
      if (!(key in data)) {
        errors.push(`${nodePath}: missing required key "${key}"`);
      }
    }
  }

  if (resolved.properties && typeof data === "object" && !Array.isArray(data) && data !== null) {
    for (const [key, propSchema] of Object.entries(resolved.properties)) {
      if (key in data) {
        validateNode(data[key], propSchema, defs, `${nodePath}.${key}`, errors);
      }
    }
  }

  if (resolved.items && Array.isArray(data)) {
    if (resolved.minItems !== undefined && data.length < resolved.minItems) {
      errors.push(`${nodePath}: need at least ${resolved.minItems} item(s), got ${data.length}`);
    }
    const itemSchema = resolveRef(resolved.items, defs);
    data.forEach((item, i) => {
      validateNode(item, itemSchema, defs, `${nodePath}[${i}]`, errors);
    });
  }
}

function validateAgainstSchema(data, schemaPath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const defs = schema.$defs || {};
  const errors = [];
  validateNode(data, schema, defs, "$", errors);
  return errors;
}

/* ------------------------------------------------------------------ */
/*  Legacy blueprint-based checks (split-manifest backward compat)    */
/* ------------------------------------------------------------------ */

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

function runBlueprintChecks(manifest) {
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

  assertRecordKeys(manifest.sections, Object.keys(blueprint.sectionRecord), "sections", errors);
  assertRecordKeys(manifest.dataFiles, Object.keys(blueprint.dataRecord), "dataFiles", errors);
  assertRecordKeys(manifest.scripts, Object.keys(blueprint.scriptRecord), "scripts", errors);

  if (!Array.isArray(manifest.referenceDocs)) errors.push("referenceDocs must be an array");
  if (!Array.isArray(manifest.regressionChecklist)) errors.push("regressionChecklist must be an array");
  if (!Array.isArray(manifest.notes)) errors.push("notes must be an array");

  if (manifest.phase !== undefined) {
    if (typeof manifest.phase !== "object" || manifest.phase === null || Array.isArray(manifest.phase)) {
      errors.push("phase must be an object");
    } else {
      const validPhases = ["init", "audit", "boundary", "review", "execute", "closeout"];
      if (manifest.phase.current && !validPhases.includes(manifest.phase.current)) {
        errors.push(`phase.current must be one of: ${validPhases.join(", ")}`);
      }
    }
  }

  if (manifest.sourceInputs !== undefined) {
    if (!Array.isArray(manifest.sourceInputs)) {
      errors.push("sourceInputs must be an array");
    } else {
      manifest.sourceInputs.forEach((input, index) => {
        if (!input || typeof input !== "object") {
          errors.push(`sourceInputs[${index}] must be an object`);
        } else if (!input.file) {
          errors.push(`sourceInputs[${index}] missing required key: file`);
        }
      });
    }
  }

  if (manifest.unknowns !== undefined) {
    if (!Array.isArray(manifest.unknowns)) {
      errors.push("unknowns must be an array");
    } else {
      manifest.unknowns.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          errors.push(`unknowns[${index}] must be an object`);
        } else {
          if (!item.id) errors.push(`unknowns[${index}] missing required key: id`);
          if (!item.description) errors.push(`unknowns[${index}] missing required key: description`);
        }
      });
    }
  }

  if (manifest.waivers !== undefined) {
    if (!Array.isArray(manifest.waivers)) {
      errors.push("waivers must be an array");
    } else {
      manifest.waivers.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          errors.push(`waivers[${index}] must be an object`);
        } else {
          if (!item.id) errors.push(`waivers[${index}] missing required key: id`);
          if (!item.description) errors.push(`waivers[${index}] missing required key: description`);
          if (!item.reason) errors.push(`waivers[${index}] missing required key: reason`);
        }
      });
    }
  }

  return errors;
}

/* ------------------------------------------------------------------ */
/*  Provenance enforcement (--check-provenance)                       */
/* ------------------------------------------------------------------ */

function loadRegistry() {
  const registryPath = path.join(dataDir, "truth-source-registry.json");
  if (!fs.existsSync(registryPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch {
    return null;
  }
}

function collectProvenanceFields(data, arrayKey) {
  if (!Array.isArray(data)) return [];
  return data
    .map((item, i) => ({ index: i, provenance: item.provenance, name: item.name || item.field || item.variable || item.key || item.id || `[${i}]` }))
    .filter((r) => r.provenance);
}

function checkProvenanceRules(manifest, type, errors) {
  const registry = loadRegistry();
  if (!registry || !registry.schemas || !registry.schemas[type]) return;

  const schemaReg = registry.schemas[type];
  const mandatoryPaths = schemaReg.mandatoryExtractedPaths || [];

  for (const jsonPath of mandatoryPaths) {
    if (jsonPath === "$.sourceInputs") {
      if (!manifest.sourceInputs || manifest.sourceInputs.length === 0) {
        errors.push("provenance: sourceInputs is mandatory-extracted but missing or empty");
      }
      continue;
    }

    const match = jsonPath.match(/^\$\.(\w+)\[\*\]\.(\w+)$/);
    if (!match) continue;
    const [, arrayField, propName] = match;

    const arr = manifest[arrayField];
    if (!Array.isArray(arr)) continue;

    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!item) continue;
      if (propName in item) {
        const val = item[propName];
        if (val === undefined || val === null || val === "") {
          const itemLabel = item.name || item.variable || item.field || item.id || `[${i}]`;
          errors.push(
            `provenance: ${arrayField}[${i}] (${itemLabel}).${propName} is mandatory-extracted but empty`
          );
        }
      }
    }
  }

  if (schemaReg.humanApprovalRequired) {
    for (const jsonPath of schemaReg.humanApprovalRequired) {
      if (jsonPath === "$.closeoutStatus.allPrototypePassed" || jsonPath === "$.closeoutStatus.mustItemsResolved") {
        continue;
      }
    }
  }

  const perRecord = schemaReg.perRecord || {};
  for (const [arrayField, fieldDefs] of Object.entries(perRecord)) {
    const arr = manifest[arrayField];
    if (!Array.isArray(arr)) continue;

    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!item || !item.provenance) continue;
      const itemLabel = item.name || item.variable || item.field || item.id || `[${i}]`;

      for (const [fieldName, fieldSpec] of Object.entries(fieldDefs)) {
        if (fieldName === "_arrayItems") continue;
        if (!(fieldName in item)) continue;
        if (fieldSpec.requiredProvenance === "extracted" && item.provenance === "inferred") {
          errors.push(
            `provenance: ${arrayField}[${i}] (${itemLabel}).${fieldName} requires extracted provenance but record is marked inferred`
          );
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Provenance enforcement (field-provenance-registry)                */
/* ------------------------------------------------------------------ */

const TYPE_TO_REGISTRY_KEY = {
  "split-manifest": "split-manifest",
  "audit-manifest": "audit-manifest",
  "boundary-map": "boundary-map",
  "regression-checklist": "regression-checklist",
};

/**
 * Resolve a registry field path like "externalGlobals[*].name" against
 * actual manifest data, returning all concrete items that match.
 * @param {object} data - The manifest data
 * @param {string} fieldPath - Registry field path (e.g. "functions[*].name")
 * @returns {Array<{path: string, item: object, fieldName: string}>}
 */
function resolveFieldPath(data, fieldPath) {
  const segments = fieldPath.split(".");
  const results = [];

  function walk(obj, segIdx, currentPath) {
    if (segIdx >= segments.length || obj == null) return;
    const seg = segments[segIdx];
    const isLast = segIdx === segments.length - 1;

    const arrayMatch = seg.match(/^(.+)\[\*\]$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const arr = resolveNestedKey(obj, key);
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < arr.length; i++) {
        const itemPath = `${currentPath}.${key}[${i}]`;
        if (isLast) {
          results.push({ path: itemPath, item: arr[i], fieldName: key });
        } else {
          walk(arr[i], segIdx + 1, itemPath);
        }
      }
    } else if (isLast) {
      const val = resolveNestedKey(obj, seg);
      if (val !== undefined) {
        results.push({ path: `${currentPath}.${seg}`, item: obj, fieldName: seg });
      }
    } else {
      const next = resolveNestedKey(obj, seg);
      if (next != null && typeof next === "object") {
        walk(next, segIdx + 1, `${currentPath}.${seg}`);
      }
    }
  }

  walk(data, 0, "$");
  return results;
}

function resolveNestedKey(obj, key) {
  if (key.includes(".")) {
    return key.split(".").reduce((o, k) => (o != null ? o[k] : undefined), obj);
  }
  return obj[key];
}

/**
 * Check provenance constraints from the field-provenance-registry.
 * @param {object} data
 * @param {string} type
 * @returns {{ errors: string[], warnings: string[] }}
 */
function checkProvenanceConstraints(data, type) {
  const errors = [];
  const warnings = [];

  if (!provenanceRegistry) return { errors, warnings };
  const registryKey = TYPE_TO_REGISTRY_KEY[type];
  if (!registryKey || !provenanceRegistry.artifacts[registryKey]) return { errors, warnings };

  const artifactDef = provenanceRegistry.artifacts[registryKey];
  const fields = artifactDef.fields;
  const hasSourceInputs =
    Array.isArray(data.sourceInputs) &&
    data.sourceInputs.some((si) => si.sha256);

  for (const [fieldPath, spec] of Object.entries(fields)) {
    const matches = resolveFieldPath(data, fieldPath);

    for (const match of matches) {
      const { path: matchPath, item } = match;

      if (spec.required === "extracted" && item && typeof item === "object" && "provenance" in item) {
        if (item.provenance === "inferred") {
          errors.push(
            `${matchPath}: provenance is "inferred" but registry requires "extracted" — ` +
            `this field must come from source-code scanning, not AI judgment`
          );
        }
      }

      if (spec.required === "human" && item && typeof item === "object" && "provenance" in item) {
        if (item.provenance === "extracted" || item.provenance === "inferred") {
          warnings.push(
            `${matchPath}: registry marks this as "human" input — ` +
            `verify this was not auto-populated by AI`
          );
        }
      }
    }
  }

  if (!hasSourceInputs) {
    const hasExtractedFields = Object.values(fields).some((f) => f.required === "extracted");
    if (hasExtractedFields) {
      const extractedMatches = Object.entries(fields)
        .filter(([, spec]) => spec.required === "extracted")
        .flatMap(([fp]) => resolveFieldPath(data, fp));
      if (extractedMatches.length > 0) {
        errors.push(
          "manifest has fields requiring extracted provenance but no sourceInputs " +
          "with SHA-256 fingerprints — cannot verify extracted claims against source code"
        );
      }
    }
  }

  for (const [fieldPath, spec] of Object.entries(fields)) {
    if (spec.required !== "inferred") continue;
    const matches = resolveFieldPath(data, fieldPath);
    for (const match of matches) {
      const { path: matchPath, item } = match;
      if (item && typeof item === "object" && item.provenance === "inferred" && !item.reason) {
        warnings.push(`${matchPath}: inferred field without reason — consider adding explanation`);
      }
    }
  }

  return { errors, warnings };
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

const args = parseArgs(process.argv.slice(2));
const manifestArg = args.manifest;

if (!manifestArg) {
  console.error(
    "Usage: node validate-manifest.mjs --manifest <path> [--type split-manifest|audit-manifest|boundary-map|regression-checklist]"
  );
  process.exit(1);
}

const manifestPath = path.resolve(process.cwd(), manifestArg);
if (!fs.existsSync(manifestPath)) {
  console.error(`file not found: ${manifestPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(manifestPath, "utf8");
let manifest;
try {
  manifest = JSON.parse(raw);
} catch {
  console.error(`invalid JSON: ${manifestPath}`);
  process.exit(1);
}

const type = args.type || detectType(manifestPath);

if (!KNOWN_TYPES[type]) {
  console.error(`unknown type: ${type}. Must be one of: ${Object.keys(KNOWN_TYPES).join(", ")}`);
  process.exit(1);
}

const schemaFile = path.join(dataDir, KNOWN_TYPES[type]);
const allErrors = [];

if (fs.existsSync(schemaFile)) {
  const schemaErrors = validateAgainstSchema(manifest, schemaFile);
  allErrors.push(...schemaErrors);
}

if (type === "split-manifest") {
  const bpErrors = runBlueprintChecks(manifest);
  for (const err of bpErrors) {
    if (!allErrors.includes(err)) allErrors.push(err);
  }
}

if (args["check-provenance"]) {
  checkProvenanceRules(manifest, type, allErrors);
}

const { errors: provErrors, warnings: provWarnings } = checkProvenanceConstraints(manifest, type);
allErrors.push(...provErrors);

if (provWarnings.length > 0) {
  provWarnings.forEach((w) => console.warn(`  warn: ${w}`));
}

if (allErrors.length > 0) {
  console.error(`${type} invalid`);
  allErrors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`${type} valid`);
