---
name: html-prototype-gate
description: parse high-fidelity html and css prototypes into structured ui contracts and hard-gated implementation artifacts. use when chatgpt receives prototype.html, prototype.css, or a prototype folder and must convert it into component candidates, interaction maps, style contracts, patch plans, and validation reports before any real frontend coding.
---

# html-prototype-gate

Use scripts first. Do not rely on freeform interpretation of prototype html/css.

## Required workflow

1. Run `scripts/init_artifacts.sh <workspace>` to create the required artifact files.
2. Run `python3 scripts/parse_prototype.py --html <prototype.html> [--css <prototype.css>] --out <workspace>/artifacts`.
3. Review the generated JSON artifacts and fill in any business-specific unknowns.
4. Run `python3 scripts/check_contract.py --artifacts <workspace>/artifacts`.
5. Run `scripts/gate.sh <workspace>/artifacts`.
6. Only after all checks pass, use the produced contracts as the sole basis for planning or code generation.

## Output artifacts

The scripts generate and validate these files:

- `prototype_structure.json`
- `component_candidates.json`
- `interaction_map.json`
- `style_contract.json`
- `ui_patch_plan.json`
- `validation_report.json`

## Rules

- Treat the prototype as semantic input, not production code.
- Prefer existing design-system components over copying raw classes.
- Block implementation if required regions, component candidates, or state placeholders are missing.
- Keep any human-written notes short and store decisions in JSON artifacts, not prose.

## Resources

- Templates and schema notes: `references/templates.md`
- Initialization script: `scripts/init_artifacts.sh`
- Prototype parser: `scripts/parse_prototype.py`
- Contract validator: `scripts/check_contract.py`
- Hard gate: `scripts/gate.sh`
